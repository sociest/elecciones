import { databases, DATABASE_ID, COLLECTIONS, Query } from '../../appwrite';
import type { Entity, Claim } from '../types';
import { PROPERTY_IDS, DEPARTMENT_IDS } from '../constants';
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
    let filteredIds: string[] | null = null;
    let departmentFilterApplied = false;

    if (entityType && entityType !== 'Todas') {
      console.log(
        `[fetchEntitiesFiltered] Aplicando filtro de tipo: "${entityType}"`
      );
      const typeIds = await getEntitiesByType(entityType);
      console.log(
        `[fetchEntitiesFiltered] IDs encontrados por tipo:`,
        typeIds.length
      );
      filteredIds = typeIds;
    }

    if (department && department !== 'Todos') {
      console.log(
        `[fetchEntitiesFiltered] Aplicando filtro de departamento: "${department}"`
      );
      const deptIds = await getEntitiesByDepartment(department);
      console.log(
        `[fetchEntitiesFiltered] IDs encontrados por departamento:`,
        deptIds.length
      );
      departmentFilterApplied = true;

      if (filteredIds) {
        const beforeIntersection = filteredIds.length;
        filteredIds = filteredIds.filter((id) => deptIds.includes(id));
        console.log(
          `[fetchEntitiesFiltered] IDs después de intersección tipo+departamento: ${filteredIds.length} (antes: ${beforeIntersection})`
        );
      } else {
        filteredIds = deptIds;
      }
    }

    if (departmentFilterApplied && (!filteredIds || filteredIds.length === 0)) {
      console.log(
        '[fetchEntitiesFiltered] Departamento sin entidades coincidentes → retornando vacío'
      );
      return { documents: [], total: 0 };
    }

    if (filteredIds && filteredIds.length > 0) {
      console.log(
        `[fetchEntitiesFiltered] Obteniendo entidades para ${filteredIds.length} IDs filtrados`
      );
      const entities: Entity[] = [];

      const batchSize = 25;
      const maxIds = Math.min(filteredIds.length, 100);
      for (let i = 0; i < maxIds; i += batchSize) {
        const batch = filteredIds.slice(i, i + batchSize);
        const response = await databases.listDocuments<Entity>(
          DATABASE_ID,
          COLLECTIONS.ENTITIES,
          [Query.equal('$id', batch), Query.limit(batchSize)]
        );
        entities.push(...response.documents);
      }

      console.log(
        `[fetchEntitiesFiltered] Entidades obtenidas:`,
        entities.length
      );

      let results = entities;

      if (filteredIds) {
        results.sort(
          (a, b) => filteredIds!.indexOf(a.$id) - filteredIds!.indexOf(b.$id)
        );
      }

      if (search) {
        console.log(
          `[fetchEntitiesFiltered] Aplicando búsqueda de texto: "${search}"`
        );
        const searchLower = search.toLowerCase();
        results = entities.filter(
          (entity) =>
            entity.label?.toLowerCase().includes(searchLower) ||
            entity.description?.toLowerCase().includes(searchLower) ||
            entity.aliases?.some((a) => a.toLowerCase().includes(searchLower))
        );
        console.log(
          `[fetchEntitiesFiltered] Resultados después de búsqueda:`,
          results.length
        );
      }

      console.log(
        `[fetchEntitiesFiltered] Retornando ${results.slice(offset, offset + limit).length} de ${results.length} resultados totales`
      );
      return {
        documents: results.slice(offset, offset + limit),
        total: results.length,
      };
    }

    console.log(
      '[fetchEntitiesFiltered] No hay filtros aplicados, usando fetchEntities estándar'
    );
    const result = await fetchEntities({ search, limit, offset });
    console.log(
      `[fetchEntitiesFiltered] Resultados de fetchEntities:`,
      result.documents.length,
      'de',
      result.total
    );

    return result;
  } catch (error) {
    console.error('[fetchEntitiesFiltered] Error:', error);
    return { documents: [], total: 0 };
  }
}

export async function getEntitiesByType(typeName: string): Promise<string[]> {
  try {
    console.log(`[getEntitiesByType] Buscando tipo: "${typeName}"`);

    const typeEntities = await databases.listDocuments<Entity>(
      DATABASE_ID,
      COLLECTIONS.ENTITIES,
      [Query.equal('label', typeName), Query.limit(10)]
    );

    console.log(
      `[getEntitiesByType] Entidades encontradas con label "${typeName}":`,
      typeEntities.documents.length
    );

    if (typeEntities.documents.length === 0) {
      console.warn(
        `[getEntitiesByType] No se encontró ninguna entidad con label exacto "${typeName}"`
      );
      return [];
    }

    const typeId = typeEntities.documents[0].$id;
    console.log(`[getEntitiesByType] ID del tipo encontrado: ${typeId}`);

    const claims = await databases.listDocuments<Claim>(
      DATABASE_ID,
      COLLECTIONS.CLAIMS,
      [
        Query.equal('property', PROPERTY_IDS.INSTANCE_OF),
        Query.equal('value_relation', typeId),
        Query.limit(1000),
      ]
    );

    console.log(
      `[getEntitiesByType] Claims encontrados para tipo "${typeName}":`,
      claims.documents.length
    );

    const entityIds = claims.documents
      .map(
        (claim) => claim.subject?.$id || (claim.subject as unknown as string)
      )
      .filter(Boolean);

    console.log(
      `[getEntitiesByType] IDs de entidades extraídos:`,
      entityIds.length
    );

    return entityIds;
  } catch (error) {
    console.error(
      `[getEntitiesByType] Error getting entities by type "${typeName}":`,
      error
    );
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
