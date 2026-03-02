import { databases, DATABASE_ID, COLLECTIONS, Query } from '../../appwrite';
import type { Entity, Claim, Qualifier, Authority } from '../types';
import { PROPERTY_IDS } from '../constants';
import { getRoleTypeSync } from './cache';
import type { AuthoritiesByMunicipality } from './types';

export function buildOfficialsMap(
  claims: Claim[]
): Map<string, { roleId: string; personId: string; claimId: string }[]> {
  const map = new Map<
    string,
    { roleId: string; personId: string; claimId: string }[]
  >();
  for (const c of claims) {
    const pid = typeof c.subject === 'object' ? c.subject.$id : c.subject;
    const rid =
      typeof c.value_relation === 'object'
        ? c.value_relation.$id
        : c.value_relation;
    if (!pid || !rid) continue;
    if (!map.has(pid)) map.set(pid, []);
    map.get(pid)!.push({ roleId: rid, personId: pid, claimId: c.$id });
  }
  return map;
}

export async function fetchAndEmit(
  officialsToFetch: Map<
    string,
    { roleId: string; personId: string; claimId: string }[]
  >,
  merged: AuthoritiesByMunicipality,
  onBatch: (batch: Authority[], replace: boolean) => void,
  isFirst: boolean
): Promise<void> {
  const allIdsToFetch = Array.from(officialsToFetch.keys());
  if (allIdsToFetch.length === 0) {
    if (isFirst) onBatch([], true);
    return;
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

  const claimToPartyMap = new Map<string, Entity & { color?: string }>();

  if (allPartyQualifiers.length > 0) {
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
          partyColors.set(subjectId, c.value_raw.split('|')[0].trim());
        }
      });

      const partyMap = new Map(partyEntities.map((e) => [e.$id, e]));
      claimToPartyId.forEach((pId, cId) => {
        const entity = partyMap.get(pId);
        if (entity) {
          claimToPartyMap.set(cId, { ...entity, color: partyColors.get(pId) });
        }
      });
    }
  }

  const batchAuthorities: Authority[] = [];
  for (const entity of entities) {
    const findings = officialsToFetch.get(entity.$id);
    if (!findings) continue;
    for (const f of findings) {
      const roleType = getRoleTypeSync(f.roleId);
      const party = claimToPartyMap.get(f.claimId);
      const authority: Authority = {
        ...entity,
        role: roleType || undefined,
        party,
      };

      if (
        roleType === 'Alcalde' &&
        !merged.alcalde.some((e) => e.$id === entity.$id)
      ) {
        merged.alcalde.push(authority);
        batchAuthorities.push(authority);
      }
      if (
        roleType === 'Gobernador' &&
        !merged.gobernador.some((e) => e.$id === entity.$id)
      ) {
        merged.gobernador.push(authority);
        batchAuthorities.push(authority);
      }
      if (
        roleType === 'Concejal' &&
        !merged.concejales.some((e) => e.$id === entity.$id)
      ) {
        merged.concejales.push(authority);
        batchAuthorities.push(authority);
      }
      if (
        roleType === 'Asambleísta' &&
        !merged.asambleistas.some((e) => e.$id === entity.$id)
      ) {
        merged.asambleistas.push(authority);
        batchAuthorities.push(authority);
      }
    }
  }

  if (batchAuthorities.length > 0 || isFirst) {
    onBatch(batchAuthorities, isFirst);
  }
}
