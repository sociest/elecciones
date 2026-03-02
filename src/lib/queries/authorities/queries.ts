import { databases, DATABASE_ID, COLLECTIONS, Query } from '../../appwrite';
import type { Entity, Claim, Qualifier, Authority } from '../types';
import { PROPERTY_IDS } from '../constants';
import { getRoleIds, getAllRoleIds, getRoleTypeSync } from './cache';
import { normalizeText, getCandidateClaimsForTerritory } from './helpers';
import { buildOfficialsMap, fetchAndEmit } from './utils';
import type { AuthoritiesByMunicipality } from './types';

export async function fetchAuthorities(
  options: { search?: string; limit?: number; offset?: number } = {}
): Promise<{ documents: Entity[]; total: number }> {
  const { search, limit = 25, offset = 0 } = options;

  try {
    await getRoleIds();
    const validRoleIds = await getAllRoleIds();

    if (validRoleIds.length === 0) {
      return { documents: [], total: 0 };
    }

    if (!search) {
      const roleClaims = await databases.listDocuments<Claim>(
        DATABASE_ID,
        COLLECTIONS.CLAIMS,
        [
          Query.equal('property', PROPERTY_IDS.CANDIDATO_POLITICO),
          Query.equal('value_relation', validRoleIds),
          Query.orderDesc('$createdAt'),
          Query.limit(100),
        ]
      );

      const authorityIds = Array.from(
        new Set(
          roleClaims.documents.map((c) =>
            typeof c.subject === 'object' ? c.subject.$id : c.subject
          )
        )
      );

      const pageIds = authorityIds.slice(offset, offset + limit);

      if (pageIds.length === 0)
        return { documents: [], total: roleClaims.total };

      const response = await databases.listDocuments<Entity>(
        DATABASE_ID,
        COLLECTIONS.ENTITIES,
        [Query.equal('$id', pageIds)]
      );

      return {
        documents: response.documents,
        total: roleClaims.total,
      };
    }

    const searchResponse = await databases.listDocuments<Entity>(
      DATABASE_ID,
      COLLECTIONS.ENTITIES,
      [Query.search('label', search), Query.limit(100)]
    );

    if (searchResponse.documents.length === 0) {
      const fallbackClaims = await databases.listDocuments<Claim>(
        DATABASE_ID,
        COLLECTIONS.CLAIMS,
        [
          Query.equal('property', PROPERTY_IDS.CANDIDATO_POLITICO),
          Query.equal('value_relation', validRoleIds),
          Query.limit(1000),
        ]
      );

      const fallbackIds = Array.from(
        new Set(
          fallbackClaims.documents.map((c) =>
            typeof c.subject === 'object' ? c.subject.$id : c.subject
          )
        )
      );

      if (fallbackIds.length === 0) return { documents: [], total: 0 };

      const batchSize = 50;
      const batches: Promise<Entity[]>[] = [];
      for (let i = 0; i < fallbackIds.length; i += batchSize) {
        const batch = fallbackIds.slice(i, i + batchSize);
        batches.push(
          databases
            .listDocuments<Entity>(DATABASE_ID, COLLECTIONS.ENTITIES, [
              Query.equal('$id', batch),
              Query.limit(batchSize),
            ])
            .then((r) => r.documents)
        );
      }
      const batchResults = await Promise.all(batches);
      const entities = batchResults.flat();

      const searchKey = normalizeText(search);
      const filtered = entities.filter((doc) => {
        const label = normalizeText(doc.label || '');
        const description = normalizeText(doc.description || '');
        const aliases = (doc.aliases || []).map((a) => normalizeText(a));
        return (
          label.includes(searchKey) ||
          description.includes(searchKey) ||
          aliases.some((a) => a.includes(searchKey))
        );
      });

      return {
        documents: filtered.slice(offset, offset + limit),
        total: filtered.length,
      };
    }

    const candidateIds = searchResponse.documents.map((doc) => doc.$id);

    const roleClaims = await databases.listDocuments<Claim>(
      DATABASE_ID,
      COLLECTIONS.CLAIMS,
      [
        Query.equal('subject', candidateIds),
        Query.equal('property', PROPERTY_IDS.CANDIDATO_POLITICO),
        Query.equal('value_relation', validRoleIds),
        Query.limit(100),
      ]
    );

    const authorityIds = new Set(
      roleClaims.documents.map((c) =>
        typeof c.subject === 'object' ? c.subject.$id : c.subject
      )
    );

    const filteredDocuments = searchResponse.documents.filter((doc) =>
      authorityIds.has(doc.$id)
    );

    return {
      documents: filteredDocuments.slice(offset, offset + limit),
      total: filteredDocuments.length,
    };
  } catch (error) {
    console.error('Error fetching authorities:', error);
    return { documents: [], total: 0 };
  }
}

export async function getAuthoritiesByMunicipalityStreaming(
  territoryId: string,
  onBatch: (batch: Authority[], replace: boolean) => void
): Promise<AuthoritiesByMunicipality> {
  const merged: AuthoritiesByMunicipality = {
    alcalde: [],
    gobernador: [],
    concejales: [],
    asambleistas: [],
  };

  try {
    const [allRoleIds] = await Promise.all([getAllRoleIds(), getRoleIds()]);

    const [l0Claims, parentClaims] = await Promise.all([
      getCandidateClaimsForTerritory(territoryId, allRoleIds),
      databases.listDocuments<Claim>(DATABASE_ID, COLLECTIONS.CLAIMS, [
        Query.equal('subject', territoryId),
        Query.equal('property', PROPERTY_IDS.PART_OF),
      ]),
    ]);

    const l0Map = buildOfficialsMap(l0Claims);
    await fetchAndEmit(l0Map, merged, onBatch, true);

    let parentId: string | null = null;
    const parentRel = parentClaims.documents[0]?.value_relation;
    if (parentRel)
      parentId = typeof parentRel === 'object' ? parentRel.$id : parentRel;

    if (parentId && parentId !== territoryId) {
      const [l1Claims, gpClaims] = await Promise.all([
        getCandidateClaimsForTerritory(parentId, allRoleIds),
        databases.listDocuments<Claim>(DATABASE_ID, COLLECTIONS.CLAIMS, [
          Query.equal('subject', parentId),
          Query.equal('property', PROPERTY_IDS.PART_OF),
        ]),
      ]);

      const l1Map = buildOfficialsMap(l1Claims);
      await fetchAndEmit(l1Map, merged, onBatch, false);

      let gpId: string | null = null;
      const gpRel = gpClaims.documents[0]?.value_relation;
      if (gpRel) gpId = typeof gpRel === 'object' ? gpRel.$id : gpRel;

      if (gpId && gpId !== parentId) {
        const l2Claims = await getCandidateClaimsForTerritory(gpId, allRoleIds);
        const l2Map = buildOfficialsMap(l2Claims);
        await fetchAndEmit(l2Map, merged, onBatch, false);
      }
    }
  } catch (error) {
    console.error('Error in getAuthoritiesByMunicipalityStreaming:', error);
  }

  return merged;
}

export async function getAuthoritiesByMunicipality(
  territoryId: string
): Promise<AuthoritiesByMunicipality> {
  const result: AuthoritiesByMunicipality = {
    alcalde: [],
    gobernador: [],
    concejales: [],
    asambleistas: [],
  };

  try {
    const [allRoleIds] = await Promise.all([getAllRoleIds(), getRoleIds()]);

    const officialsToFetch = new Map<
      string,
      { roleId: string; personId: string; claimId: string }[]
    >();

    const addFinding = (personId: string, roleId: string, claimId: string) => {
      if (!officialsToFetch.has(personId)) {
        officialsToFetch.set(personId, []);
      }
      officialsToFetch.get(personId)?.push({ roleId, personId, claimId });
    };

    const [l0RoleClaims, parentClaims] = await Promise.all([
      getCandidateClaimsForTerritory(territoryId, allRoleIds),
      databases.listDocuments<Claim>(DATABASE_ID, COLLECTIONS.CLAIMS, [
        Query.equal('subject', territoryId),
        Query.equal('property', PROPERTY_IDS.PART_OF),
      ]),
    ]);

    l0RoleClaims.forEach((c) => {
      const pid = typeof c.subject === 'object' ? c.subject.$id : c.subject;
      const rid =
        typeof c.value_relation === 'object'
          ? c.value_relation.$id
          : c.value_relation;
      if (rid && pid) addFinding(pid, rid, c.$id);
    });

    let parentId: string | null = null;
    const parentRel = parentClaims.documents[0]?.value_relation;
    if (parentRel)
      parentId = typeof parentRel === 'object' ? parentRel.$id : parentRel;

    if (parentId && parentId !== territoryId) {
      const [l1RoleClaims, gpClaims] = await Promise.all([
        getCandidateClaimsForTerritory(parentId, allRoleIds),
        databases.listDocuments<Claim>(DATABASE_ID, COLLECTIONS.CLAIMS, [
          Query.equal('subject', parentId),
          Query.equal('property', PROPERTY_IDS.PART_OF),
        ]),
      ]);

      l1RoleClaims.forEach((c) => {
        const pid = typeof c.subject === 'object' ? c.subject.$id : c.subject;
        const rid =
          typeof c.value_relation === 'object'
            ? c.value_relation.$id
            : c.value_relation;
        if (rid && pid) addFinding(pid, rid, c.$id);
      });

      let gpId: string | null = null;
      const gpRel = gpClaims.documents[0]?.value_relation;
      if (gpRel) gpId = typeof gpRel === 'object' ? gpRel.$id : gpRel;

      if (gpId && gpId !== parentId) {
        const l2RoleClaims = await getCandidateClaimsForTerritory(
          gpId,
          allRoleIds
        );
        l2RoleClaims.forEach((c) => {
          const pid = typeof c.subject === 'object' ? c.subject.$id : c.subject;
          const rid =
            typeof c.value_relation === 'object'
              ? c.value_relation.$id
              : c.value_relation;
          if (rid && pid) addFinding(pid, rid, c.$id);
        });
      }
    }

    const allIdsToFetch = Array.from(officialsToFetch.keys());

    if (allIdsToFetch.length === 0) {
      return result;
    }

    const entityBatchSize = 50;
    const entityBatchPromises: Promise<Entity[]>[] = [];
    for (let i = 0; i < allIdsToFetch.length; i += entityBatchSize) {
      const batch = allIdsToFetch.slice(i, i + entityBatchSize);
      entityBatchPromises.push(
        databases
          .listDocuments<Entity>(DATABASE_ID, COLLECTIONS.ENTITIES, [
            Query.equal('$id', batch),
            Query.limit(entityBatchSize),
          ])
          .then((r) => r.documents)
      );
    }

    const allClaimIds = Array.from(officialsToFetch.values()).flatMap((list) =>
      list.map((item) => item.claimId)
    );
    const claimToPartyMap = new Map<string, Entity & { color?: string }>();

    const partyQualPromises: Promise<Qualifier[]>[] = [];
    const qualBatchSize = 100;
    for (let i = 0; i < allClaimIds.length; i += qualBatchSize) {
      const batch = allClaimIds.slice(i, i + qualBatchSize);
      partyQualPromises.push(
        databases
          .listDocuments<Qualifier>(DATABASE_ID, COLLECTIONS.QUALIFIERS, [
            Query.equal('claim', batch),
            Query.equal('property', PROPERTY_IDS.POLITICAL_PARTY),
            Query.limit(qualBatchSize),
          ])
          .then((r) => r.documents)
      );
    }

    const [entityBatchResults, partyQualResults] = await Promise.all([
      Promise.all(entityBatchPromises),
      Promise.all(partyQualPromises),
    ]);

    const entities = entityBatchResults.flat();
    const allPartyQualifiers = partyQualResults.flat();

    const partyIdsToFetch = new Set<string>();
    const claimToPartyId = new Map<string, string>();
    allPartyQualifiers.forEach((q) => {
      const claimId = typeof q.claim === 'object' ? q.claim.$id : q.claim;
      const partyId =
        typeof q.value_relation === 'object'
          ? q.value_relation.$id
          : q.value_relation;
      if (claimId && partyId) {
        claimToPartyId.set(claimId, partyId);
        partyIdsToFetch.add(partyId);
      }
    });

    if (partyIdsToFetch.size > 0) {
      const partyIds = Array.from(partyIdsToFetch);
      const partyBatchSize = 50;

      const partyEntityPromises: Promise<Entity[]>[] = [];
      for (let i = 0; i < partyIds.length; i += partyBatchSize) {
        const batch = partyIds.slice(i, i + partyBatchSize);
        partyEntityPromises.push(
          databases
            .listDocuments<Entity>(DATABASE_ID, COLLECTIONS.ENTITIES, [
              Query.equal('$id', batch),
              Query.limit(partyBatchSize),
            ])
            .then((r) => r.documents)
        );
      }

      const [partyBatchResults, colorClaims] = await Promise.all([
        Promise.all(partyEntityPromises),
        databases.listDocuments<Claim>(DATABASE_ID, COLLECTIONS.CLAIMS, [
          Query.equal('subject', partyIds),
          Query.equal('property', PROPERTY_IDS.COLOR),
          Query.limit(100),
        ]),
      ]);

      const partyEntities = partyBatchResults.flat();

      const partyColors = new Map<string, string>();
      colorClaims.documents.forEach((c) => {
        const subjectId =
          typeof c.subject === 'object' ? c.subject.$id : c.subject;
        if (subjectId && c.value_raw) {
          const color = c.value_raw.split('|')[0].trim();
          partyColors.set(subjectId, color);
        }
      });

      const partyMap = new Map(partyEntities.map((e) => [e.$id, e]));

      claimToPartyId.forEach((pId, cId) => {
        const entity = partyMap.get(pId);
        if (entity) {
          const color = partyColors.get(pId);
          claimToPartyMap.set(cId, { ...entity, color });
        }
      });
    }

    for (const entity of entities) {
      const findings = officialsToFetch.get(entity.$id);
      if (findings) {
        for (const f of findings) {
          const roleType = getRoleTypeSync(f.roleId);
          const party = claimToPartyMap.get(f.claimId);

          const authority: Authority = {
            ...entity,
            role: roleType || undefined,
            party: party,
          };

          if (
            roleType === 'Alcalde' &&
            !result.alcalde.some((e) => e.$id === entity.$id)
          ) {
            result.alcalde.push(authority);
          }
          if (
            roleType === 'Gobernador' &&
            !result.gobernador.some((e) => e.$id === entity.$id)
          ) {
            result.gobernador.push(authority);
          }
          if (
            roleType === 'Concejal' &&
            !result.concejales.some((e) => e.$id === entity.$id)
          ) {
            result.concejales.push(authority);
          }
          if (
            roleType === 'Asambleísta' &&
            !result.asambleistas.some((e) => e.$id === entity.$id)
          ) {
            result.asambleistas.push(authority);
          }
        }
      }
    }

    return result;
  } catch (error) {
    console.error('Error fetching authorities by municipality:', error);
    return result;
  }
}

export async function getPersonAndPartyIdsForDepartment(
  departmentId: string,
  municipalityIds: string[]
): Promise<{ personIds: string[]; partyIds: string[] }> {
  try {
    const allRoleIds = await getAllRoleIds();
    if (allRoleIds.length === 0) return { personIds: [], partyIds: [] };

    const allTerritories = [departmentId, ...municipalityIds];

    const CONCURRENCY = 20;
    const allClaims: Claim[] = [];

    for (let i = 0; i < allTerritories.length; i += CONCURRENCY) {
      const batch = allTerritories.slice(i, i + CONCURRENCY);
      const batchResults = await Promise.all(
        batch.map((territory) =>
          getCandidateClaimsForTerritory(territory, allRoleIds)
        )
      );
      allClaims.push(...batchResults.flat());
    }

    if (allClaims.length === 0) return { personIds: [], partyIds: [] };

    const personIds = Array.from(
      new Set(
        allClaims
          .map(
            (c) =>
              (c.subject?.$id || (c.subject as unknown as string)) as string
          )
          .filter(Boolean)
      )
    );

    const claimIds = allClaims.map((c) => c.$id);
    const BATCH = 100;
    const partyQualPromises: Promise<Qualifier[]>[] = [];

    for (let i = 0; i < claimIds.length; i += BATCH) {
      const chunk = claimIds.slice(i, i + BATCH);
      partyQualPromises.push(
        databases
          .listDocuments<Qualifier>(DATABASE_ID, COLLECTIONS.QUALIFIERS, [
            Query.equal('claim', chunk),
            Query.equal('property', PROPERTY_IDS.POLITICAL_PARTY),
            Query.limit(BATCH),
          ])
          .then((r) => r.documents)
      );
    }

    const partyQualResults = await Promise.all(partyQualPromises);
    const partyIds = Array.from(
      new Set(
        partyQualResults
          .flat()
          .map((q) => {
            const vr = q.value_relation;
            if (!vr) return null;
            return vr.$id;
          })
          .filter((id): id is string => !!id)
      )
    );

    console.log(
      `[getPersonAndPartyIdsForDepartment] ${personIds.length} personas | ${partyIds.length} partidos`
    );

    return { personIds, partyIds };
  } catch (error) {
    console.error('[getPersonAndPartyIdsForDepartment] Error:', error);
    return { personIds: [], partyIds: [] };
  }
}
