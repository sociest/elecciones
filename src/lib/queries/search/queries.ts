import { databases, DATABASE_ID, COLLECTIONS, Query } from '../../appwrite';
import type { Entity, Claim } from '../types';
import { PROPERTY_IDS, DEPARTMENT_IDS } from '../constants';

// Known type IDs directly from Appwrite (avoids fragile label lookups)
const KNOWN_TYPE_IDS = {
  MUNICIPIO: '698905af9310b97aa5e0', // Municipio
  PERSONA: '69814ecc002cb8ef13c6', // Persona
  POLITICO: '69814f4e0012db67604a', // Político/Candidato
  PARTIDO_POLITICO: '69839e00c95ab98bb723', // Partido/Movimiento Politico (instance-of)
} as const;
import {
  searchCache,
  quickSearchCache,
  loadMunicipalityCache,
  deptMunicipalityCache,
  CACHE_DURATION,
} from './cache';
import {
  normalizeText,
  calculateQuickSearchScore,
  fetchEntitiesByTypeId,
  fetchEntitiesByLabels,
  performClientSideSearch,
} from './helpers';
import {
  QUICK_SEARCH_TYPE_IDS,
  QUICK_SEARCH_INSTITUTION_LABELS,
} from './constants';

async function fetchEntities(
  options: {
    search?: string;
    limit?: number;
    offset?: number;
  } = {}
) {
  const { search, limit = 25, offset = 0 } = options;

  try {
    const queries = [
      Query.limit(limit),
      Query.offset(offset),
      Query.orderDesc('$createdAt'),
    ];

    if (search) {
      const searchKey = search.toLowerCase().trim();

      const cached = searchCache.get(searchKey);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        console.log(
          'fetchEntities: returning cached results:',
          cached.data.length
        );
        return {
          documents: cached.data.slice(offset, offset + limit),
          total: cached.total,
        };
      }

      let searchResults: Entity[] = [];

      try {
        const searchResponse = await databases.listDocuments<Entity>(
          DATABASE_ID,
          COLLECTIONS.ENTITIES,
          [
            Query.search('label', search),
            Query.limit(100),
            Query.orderDesc('$createdAt'),
          ]
        );

        console.log(
          'fetchEntities: Appwrite search returned:',
          searchResponse.documents.length
        );
        if (searchResponse.documents.length > 0) {
          searchResults = searchResponse.documents;
        }
      } catch {
        console.log(
          'fetchEntities: Appwrite search failed, falling back to client-side'
        );
      }

      if (searchResults.length === 0) {
        console.log('fetchEntities: performing client-side search');
        const searchWords = searchKey.split(/\s+/).filter((w) => w.length > 0);
        searchResults = await performClientSideSearch(searchKey, searchWords);
        console.log(
          'fetchEntities: client-side search returned:',
          searchResults.length
        );
      }

      searchCache.set(searchKey, {
        data: searchResults,
        timestamp: Date.now(),
        total: searchResults.length,
      });

      if (searchCache.size > 50) {
        const oldestKey = Array.from(searchCache.entries()).sort(
          (a, b) => a[1].timestamp - b[1].timestamp
        )[0][0];
        searchCache.delete(oldestKey);
      }

      console.log(
        'fetchEntities: returning',
        searchResults.slice(offset, offset + limit).length,
        'of',
        searchResults.length,
        'total results'
      );
      return {
        documents: searchResults.slice(offset, offset + limit),
        total: searchResults.length,
      };
    }

    const response = await databases.listDocuments<Entity>(
      DATABASE_ID,
      COLLECTIONS.ENTITIES,
      queries
    );

    return {
      documents: response.documents,
      total: response.total,
    };
  } catch (error) {
    console.error('Error fetching entities:', error);
    throw error;
  }
}

export async function fetchQuickSearchEntities(options: {
  search: string;
  limit?: number;
}) {
  const { search, limit = 5 } = options;
  const searchKey = normalizeText(search || '').trim();

  if (!searchKey) {
    return { documents: [], total: 0 };
  }

  const cached = quickSearchCache.get(searchKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return {
      documents: cached.data.slice(0, limit),
      total: cached.total,
    };
  }

  const [authorities, parties, surveyHouses, institutions] = await Promise.all([
    (await import('../authorities')).fetchAuthorities({ search, limit: 25 }),
    fetchEntitiesByTypeId(QUICK_SEARCH_TYPE_IDS.POLITICAL_PARTY),
    fetchEntitiesByTypeId(QUICK_SEARCH_TYPE_IDS.SURVEY_HOUSE),
    fetchEntitiesByLabels(QUICK_SEARCH_INSTITUTION_LABELS),
  ]);

  const combined = new Map<string, Entity>();
  authorities.documents.forEach((doc) => combined.set(doc.$id, doc));

  const searchKeyNormalized = normalizeText(search || '').trim();
  const addIfMatches = (doc: Entity) => {
    if (calculateQuickSearchScore(doc, searchKeyNormalized) > 0) {
      combined.set(doc.$id, doc);
    }
  };

  parties.forEach(addIfMatches);
  surveyHouses.forEach(addIfMatches);
  institutions.forEach(addIfMatches);

  const scored = Array.from(combined.values())
    .map((entity) => ({
      entity,
      score: calculateQuickSearchScore(entity, searchKeyNormalized),
    }))
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((result) => result.entity);

  quickSearchCache.set(searchKey, {
    data: scored,
    timestamp: Date.now(),
    total: scored.length,
  });

  return {
    documents: scored.slice(0, limit),
    total: scored.length,
  };
}

export async function fetchEntitiesFiltered(
  options: {
    search?: string;
    entityType?: string;
    department?: string;
    limit?: number;
    offset?: number;
  } = {}
) {
  const { search, entityType, department, limit = 25, offset = 0 } = options;

  console.log('[fetchEntitiesFiltered] Filtros aplicados:', {
    search,
    entityType,
    department,
    limit,
    offset,
  });

  try {
    let validIds: Set<string>;
    const [municipiosArr, personasArr, partidosArr] = await Promise.all([
      getEntitiesByType('Municipio'),
      getEntitiesByType('Persona'),
      getEntitiesByType('Partido Político'),
    ]);

    const municipiosSet = new Set(municipiosArr);
    const personasSet = new Set(personasArr);
    const partidosSet = new Set(partidosArr);

    if (entityType && entityType !== 'Todas') {
      let typeIds: string[] = [];
      if (entityType === 'Municipio') typeIds = municipiosArr;
      else if (entityType === 'Persona') typeIds = personasArr;
      else if (entityType === 'Partido Político') typeIds = partidosArr;
      else typeIds = await getEntitiesByType(entityType);

      validIds = new Set(typeIds);
    } else {
      validIds = new Set([...municipiosSet, ...personasSet, ...partidosSet]);
    }

    let deptIdsSet: Set<string> | null = null;
    if (department && department !== 'Todos') {
      const deptIds = await getEntitiesByDepartment(department);
      deptIdsSet = new Set(deptIds);
    }

    let filteredIds = Array.from(validIds);
    if (deptIdsSet) {
      filteredIds = filteredIds.filter((id) => deptIdsSet!.has(id));
    }

    if (filteredIds.length === 0) {
      return { documents: [], total: 0 };
    }

    const getPriority = (id: string) => {
      if (personasSet.has(id)) return 1;
      if (partidosSet.has(id)) return 2;
      if (municipiosSet.has(id)) return 3;
      return 4;
    };

    let results: Entity[] = [];

    if (search) {
      console.log(
        `[fetchEntitiesFiltered] Aplicando búsqueda de texto prioritaria: "${search}"`
      );
      const sRes = await fetchEntities({ search, limit: 1000, offset: 0 });
      results = sRes.documents.filter(
        (doc) =>
          validIds.has(doc.$id) && (!deptIdsSet || deptIdsSet.has(doc.$id))
      );
      results.sort((a, b) => getPriority(a.$id) - getPriority(b.$id));
    } else {
      console.log(
        `[fetchEntitiesFiltered] Obteniendo la pagina requerida desde ${filteredIds.length} IDs validos`
      );
      filteredIds.sort((a, b) => getPriority(a) - getPriority(b));

      const pageIds = filteredIds.slice(offset, offset + limit);
      if (pageIds.length > 0) {
        const batchSize = 25;
        for (let i = 0; i < pageIds.length; i += batchSize) {
          const batch = pageIds.slice(i, i + batchSize);
          const response = await databases.listDocuments<Entity>(
            DATABASE_ID,
            COLLECTIONS.ENTITIES,
            [Query.equal('$id', batch), Query.limit(batchSize)]
          );
          const batchEntities = response.documents.sort(
            (a, b) => batch.indexOf(a.$id) - batch.indexOf(b.$id)
          );
          results.push(...batchEntities);
        }
      }
    }

    const paginatedResults = search
      ? results.slice(offset, offset + limit)
      : results;

    // Add Department name to duplicated Municipalities (where label = 'Municipio')
    const municipioTypeIds = new Set(await getEntitiesByType('Municipio'));
    const finalResults = await Promise.all(
      paginatedResults.map(async (doc) => {
        if (!municipioTypeIds.has(doc.$id)) return doc;
        try {
          const claims = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.CLAIMS,
            [
              Query.equal('subject', doc.$id),
              Query.equal('property', PROPERTY_IDS.PART_OF),
            ]
          );
          const deptRel = claims.documents[0]?.value_relation;
          const deptId = typeof deptRel === 'object' ? deptRel.$id : deptRel;
          if (deptId) {
            const deptDoc = await databases.getDocument(
              DATABASE_ID,
              COLLECTIONS.ENTITIES,
              deptId
            );
            if (deptDoc?.label) {
              return {
                ...doc,
                description: doc.description
                  ? `${doc.description} - ${deptDoc.label}`
                  : deptDoc.label,
              };
            }
          }
        } catch (e) {
          console.error('Error fetching department for municipality', e);
        }
        return doc;
      })
    );

    return {
      documents: finalResults,
      total: search ? results.length : filteredIds.length,
    };
  } catch (error) {
    console.error('[fetchEntitiesFiltered] Error:', error);
    return { documents: [], total: 0 };
  }
}

export async function getEntitiesByType(typeName: string): Promise<string[]> {
  try {
    console.log(`[getEntitiesByType] Buscando tipo: "${typeName}"`);

    // Use known type IDs to avoid fragile label lookups
    let typeIds: string[] = [];
    if (typeName === 'Municipio') {
      typeIds = [KNOWN_TYPE_IDS.MUNICIPIO];
    } else if (typeName === 'Persona') {
      // Include both Persona and Político (candidatos) type IDs
      typeIds = [KNOWN_TYPE_IDS.PERSONA, KNOWN_TYPE_IDS.POLITICO];
    } else if (typeName === 'Partido Político') {
      typeIds = [KNOWN_TYPE_IDS.PARTIDO_POLITICO];
    } else {
      // Fallback: find by label
      const typeEntities = await databases.listDocuments<Entity>(
        DATABASE_ID,
        COLLECTIONS.ENTITIES,
        [Query.equal('label', typeName), Query.limit(10)]
      );
      if (typeEntities.documents.length === 0) {
        console.warn(
          `[getEntitiesByType] No type entity found for "${typeName}"`
        );
        return [];
      }
      typeIds = [typeEntities.documents[0].$id];
    }

    // Fetch all entity IDs that are instances of the given type(s)
    const allEntityIds: string[] = [];
    for (const typeId of typeIds) {
      let offset = 0;
      const pageSize = 1000;
      while (true) {
        const claims = await databases.listDocuments<Claim>(
          DATABASE_ID,
          COLLECTIONS.CLAIMS,
          [
            Query.equal('property', PROPERTY_IDS.INSTANCE_OF),
            Query.equal('value_relation', typeId),
            Query.limit(pageSize),
            Query.offset(offset),
          ]
        );
        const ids = claims.documents
          .map(
            (claim) =>
              claim.subject?.$id || (claim.subject as unknown as string)
          )
          .filter(Boolean) as string[];
        allEntityIds.push(...ids);
        if (claims.documents.length < pageSize) break;
        offset += pageSize;
      }
    }

    console.log(
      `[getEntitiesByType] "${typeName}" → ${allEntityIds.length} entidades`
    );
    return Array.from(new Set(allEntityIds));
  } catch (error) {
    console.error(`[getEntitiesByType] Error for "${typeName}":`, error);
    return [];
  }
}

export async function getEntitiesByDepartment(
  departmentName: string
): Promise<string[]> {
  try {
    const departmentId =
      DEPARTMENT_IDS[departmentName as keyof typeof DEPARTMENT_IDS];

    if (!departmentId) {
      console.warn(
        `[getEntitiesByDepartment] Unknown department: "${departmentName}"`
      );
      return [];
    }

    await loadMunicipalityCache();
    const municipalityIds = deptMunicipalityCache.get(departmentName) ?? [];

    const { getPersonAndPartyIdsForDepartment } =
      await import('../authorities');
    const { personIds, partyIds } = await getPersonAndPartyIdsForDepartment(
      departmentId,
      municipalityIds
    );

    const allIds = Array.from(
      new Set([...personIds, ...partyIds, ...municipalityIds])
    );

    console.log(
      `[getEntitiesByDepartment] ${municipalityIds.length} municipios | ${personIds.length} personas | ${partyIds.length} partidos → ${allIds.length} total`
    );

    return allIds;
  } catch (error) {
    console.error(
      `[getEntitiesByDepartment] Error for "${departmentName}":`,
      error
    );
    return [];
  }
}
