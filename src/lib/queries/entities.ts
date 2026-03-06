import { databases, DATABASE_ID, COLLECTIONS, Query } from '../appwrite';
import type { Entity, Claim, Qualifier, Reference } from './types';
import { ENTITY_TYPE_IDS, PROPERTY_IDS } from '../constants/entity-types';
import {
  inferEntityTypeFromLabel,
  type EntityType,
} from '../appwrite/entity-utils';

/**
 * Fetch a single entity by ID with all its claims
 */
export async function fetchEntityById(entityId: string) {
  try {
    const entity = await databases.getDocument<Entity>(
      DATABASE_ID,
      COLLECTIONS.ENTITIES,
      entityId
    );

    const claimsResponse = await databases.listDocuments<Claim>(
      DATABASE_ID,
      COLLECTIONS.CLAIMS,
      [Query.equal('subject', entityId)]
    );

    return {
      entity,
      claims: claimsResponse.documents,
    };
  } catch (error) {
    console.error('Error fetching entity:', error);
    throw error;
  }
}

/**
 * Alias for fetchEntityById - get a single entity by ID
 */
export async function getEntityById(entityId: string) {
  const result = await fetchEntityById(entityId);
  return result.entity;
}

/**
 * Get total count of entities
 */
export async function getEntityCount(): Promise<number> {
  try {
    const response = await databases.listDocuments<Entity>(
      DATABASE_ID,
      COLLECTIONS.ENTITIES,
      [Query.limit(1)] // We only need the total count
    );
    return response.total;
  } catch (error) {
    console.error('Error getting entity count:', error);
    return 0;
  }
}

/**
 * Get total count of claims
 */
export async function getClaimCount(): Promise<number> {
  try {
    const response = await databases.listDocuments<Claim>(
      DATABASE_ID,
      COLLECTIONS.CLAIMS,
      [Query.limit(1)] // We only need the total count
    );
    return response.total;
  } catch (error) {
    console.error('Error getting claim count:', error);
    return 0;
  }
}

let _propertyCountMemCache: number | null = null;
const PROPERTY_COUNT_LS_KEY = 'gae_property_count';
const PROPERTY_COUNT_LS_TIME_KEY = 'gae_property_count_time';
const PROPERTY_COUNT_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Get count of unique properties.
 *
 * Implementation note: counting unique property IDs by scanning every claim
 * (Query.limit(5000)) is prohibitively expensive.  Instead we cache the value
 * in localStorage with a 1-hour TTL and in memory for the lifetime of the tab.
 * The number of distinct property types in the KB changes rarely, so staleness
 * is acceptable.
 */
export async function getPropertyCount(): Promise<number> {
  if (_propertyCountMemCache !== null) return _propertyCountMemCache;

  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(PROPERTY_COUNT_LS_KEY);
      const storedTime = localStorage.getItem(PROPERTY_COUNT_LS_TIME_KEY);
      if (stored !== null && storedTime !== null) {
        const age = Date.now() - Number(storedTime);
        if (!Number.isNaN(age) && age < PROPERTY_COUNT_TTL) {
          const cached = Number(stored);
          _propertyCountMemCache = cached;
          return cached;
        }
      }
    } catch {
      // ignore
    }
  }

  try {
    const response = await databases.listDocuments<Claim>(
      DATABASE_ID,
      COLLECTIONS.CLAIMS,
      [Query.limit(100), Query.select(['property'])]
    );

    const uniqueProperties = new Set<string>();
    response.documents.forEach((claim) => {
      if (claim.property) {
        const propertyId =
          typeof claim.property === 'string'
            ? claim.property
            : (claim.property as { $id?: string }).$id;
        if (propertyId) uniqueProperties.add(propertyId);
      }
    });

    const count = uniqueProperties.size;
    _propertyCountMemCache = count;

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(PROPERTY_COUNT_LS_KEY, String(count));
        localStorage.setItem(PROPERTY_COUNT_LS_TIME_KEY, String(Date.now()));
      } catch {
        // Ignore write errors
      }
    }

    return count;
  } catch (error) {
    console.error('Error getting property count:', error);
    return 0;
  }
}

/**
 * Derive EntityType from outgoing claims that are already fetched —
 * looks for the 'es instancia de' claim and maps value_relation.$id to EntityType.
 */
function deriveEntityTypeFromClaims(
  claims: Claim[],
  entityLabel?: string
): EntityType {
  const instanceClaims = claims.filter(
    (c) =>
      (typeof c.property === 'object' ? c.property?.$id : c.property) ===
      PROPERTY_IDS.ES_INSTANCIA_DE
  );

  console.log('[deriveEntityTypeFromClaims]', {
    entityLabel,
    totalClaims: claims.length,
    instanceClaimsCount: instanceClaims.length,
    PROPERTY_IDS_ES_INSTANCIA_DE: PROPERTY_IDS.ES_INSTANCIA_DE,
  });

  for (const instanceClaim of instanceClaims) {
    const typeId =
      typeof instanceClaim.value_relation === 'object'
        ? instanceClaim.value_relation?.$id
        : instanceClaim.value_relation;

    console.log('[deriveEntityTypeFromClaims] Checking instance claim:', {
      typeId,
      value_relation: instanceClaim.value_relation,
      TERRITORIO_IDS: {
        MUNICIPIO: ENTITY_TYPE_IDS.MUNICIPIO,
        DEPARTAMENTO: ENTITY_TYPE_IDS.DEPARTAMENTO,
        TERRITORIO: ENTITY_TYPE_IDS.TERRITORIO,
        ENTIDAD_TERRITORIAL: ENTITY_TYPE_IDS.ENTIDAD_TERRITORIAL,
      },
    });

    if (typeId === ENTITY_TYPE_IDS.POLITICO) return 'POLITICO';
    if (typeId === ENTITY_TYPE_IDS.PERSONA) return 'PERSONA';
    if (
      typeId === ENTITY_TYPE_IDS.MUNICIPIO ||
      typeId === ENTITY_TYPE_IDS.DEPARTAMENTO ||
      typeId === ENTITY_TYPE_IDS.TERRITORIO ||
      typeId === ENTITY_TYPE_IDS.ENTIDAD_TERRITORIAL
    )
      return 'TERRITORIO';
    if (
      typeId === ENTITY_TYPE_IDS.PARTIDO_POLITICO ||
      typeId === ENTITY_TYPE_IDS.PARTIDO_MOVIMIENTO
    )
      return 'PARTIDO_POLITICO';
    if (typeId === ENTITY_TYPE_IDS.CASA_ENCUESTADORA)
      return 'CASA_ENCUESTADORA';
    if (
      typeId === ENTITY_TYPE_IDS.MINISTERIO ||
      typeId === ENTITY_TYPE_IDS.ORGANO_ELECTORAL ||
      typeId === ENTITY_TYPE_IDS.ASAMBLEA_LEGISLATIVA
    )
      return 'INSTITUCION';

    const typeLabel =
      typeof instanceClaim.value_relation === 'object'
        ? instanceClaim.value_relation?.label
        : undefined;
    if (typeLabel) {
      const inferred = inferEntityTypeFromLabel(typeLabel);
      if (inferred !== 'UNKNOWN') return inferred;
    }
  }

  const fallbackType = inferEntityTypeFromLabel(entityLabel);
  console.log('[deriveEntityTypeFromClaims] Using fallback from label:', {
    entityLabel,
    fallbackType,
  });
  return fallbackType;
}

/**
 * Fetch full entity details including outgoing and incoming claims.
 * Also returns the resolved EntityType so callers need only one await.
 */
export async function fetchEntityDetails(entityId: string) {
  try {
    const entity = await databases.getDocument<Entity>(
      DATABASE_ID,
      COLLECTIONS.ENTITIES,
      entityId
    );

    // Fetch outgoing claims (Subject = Entity)
    const outgoingClaimsPromise = databases.listDocuments<Claim>(
      DATABASE_ID,
      COLLECTIONS.CLAIMS,
      [Query.equal('subject', entityId), Query.limit(5000)]
    );

    // Fetch incoming PART_OF claims only (sub-territories that are part of this entity).
    // We intentionally exclude other incoming claims (e.g. candidato qualifiers that
    // reference this territory) because they are fetched on-demand in TerritoryView
    // via getAuthoritiesByMunicipalityStreaming. Fetching all incoming claims for a
    // department would return thousands of candidato-related claims causing timeouts.
    const PART_OF_PROP = '6983977fdc3b15edf3f5';
    const incomingClaimsPromise = databases.listDocuments<Claim>(
      DATABASE_ID,
      COLLECTIONS.CLAIMS,
      [
        Query.equal('value_relation', entityId),
        Query.equal('property', PART_OF_PROP),
        Query.limit(500),
      ]
    );

    const [outgoingResponse, incomingResponse] = await Promise.all([
      outgoingClaimsPromise,
      incomingClaimsPromise,
    ]);

    const allClaims = [
      ...outgoingResponse.documents,
      ...incomingResponse.documents,
    ];

    const claimIds = allClaims.map((claim) => claim.$id);
    const qualifiersByClaim = new Map<string, Qualifier[]>();
    const referencesByClaim = new Map<string, Reference[]>();

    if (claimIds.length > 0) {
      const batchSize = 100;

      for (let i = 0; i < claimIds.length; i += batchSize) {
        const batch = claimIds.slice(i, i + batchSize);

        const [qualifiersResponse, referencesResponse] = await Promise.all([
          databases.listDocuments<Qualifier>(
            DATABASE_ID,
            COLLECTIONS.QUALIFIERS,
            [Query.equal('claim', batch), Query.limit(batchSize)]
          ),
          databases.listDocuments<Reference>(
            DATABASE_ID,
            COLLECTIONS.REFERENCES,
            [Query.equal('claim', batch), Query.limit(batchSize)]
          ),
        ]);

        qualifiersResponse.documents.forEach((qualifier) => {
          const claimId =
            typeof qualifier.claim === 'object'
              ? qualifier.claim.$id
              : qualifier.claim;
          if (!claimId) return;
          if (!qualifiersByClaim.has(claimId))
            qualifiersByClaim.set(claimId, []);
          qualifiersByClaim.get(claimId)?.push(qualifier);
        });

        referencesResponse.documents.forEach((reference) => {
          const claimId =
            typeof reference.claim === 'object'
              ? reference.claim.$id
              : reference.claim;
          if (!claimId) return;
          if (!referencesByClaim.has(claimId))
            referencesByClaim.set(claimId, []);
          referencesByClaim.get(claimId)?.push(reference);
        });
      }
    }

    const entityIdsToFetch = new Set<string>();

    allClaims.forEach((claim) => {
      if (claim.subject && typeof claim.subject === 'string') {
        entityIdsToFetch.add(claim.subject);
      }
      if (claim.property && typeof claim.property === 'string') {
        entityIdsToFetch.add(claim.property);
      }
      if (claim.value_relation && typeof claim.value_relation === 'string') {
        entityIdsToFetch.add(claim.value_relation);
      }
      const qualifiers = qualifiersByClaim.get(claim.$id) || [];
      const references = referencesByClaim.get(claim.$id) || [];

      claim.qualifiers = qualifiers;
      claim.references = references;

      qualifiers.forEach((qualifier) => {
        if (qualifier.property && typeof qualifier.property === 'string') {
          entityIdsToFetch.add(qualifier.property);
        }
        if (
          qualifier.value_relation &&
          typeof qualifier.value_relation === 'string'
        ) {
          entityIdsToFetch.add(qualifier.value_relation);
        }
      });

      references.forEach((reference) => {
        if (reference.reference && typeof reference.reference === 'string') {
          entityIdsToFetch.add(reference.reference);
        }
      });
    });

    if (entityIdsToFetch.size > 0) {
      const fetchedEntities = new Map<string, Entity>();

      await Promise.all(
        Array.from(entityIdsToFetch).map(async (id) => {
          try {
            const ent = await databases.getDocument<Entity>(
              DATABASE_ID,
              COLLECTIONS.ENTITIES,
              id
            );
            fetchedEntities.set(id, ent);
          } catch (e) {
            console.warn(`Failed to fetch related entity ${id}`, e);
          }
        })
      );

      for (const claim of allClaims) {
        if (
          typeof claim.property === 'string' &&
          fetchedEntities.has(claim.property)
        ) {
          claim.property = fetchedEntities.get(claim.property);
        }
        if (
          typeof claim.value_relation === 'string' &&
          fetchedEntities.has(claim.value_relation)
        ) {
          claim.value_relation = fetchedEntities.get(claim.value_relation);
        }
        if (
          typeof claim.subject === 'string' &&
          fetchedEntities.has(claim.subject)
        ) {
          claim.subject = fetchedEntities.get(claim.subject);
        }

        (claim.qualifiers || []).forEach((qualifier) => {
          if (
            typeof qualifier.property === 'string' &&
            fetchedEntities.has(qualifier.property)
          ) {
            qualifier.property = fetchedEntities.get(qualifier.property);
          }
          if (
            typeof qualifier.value_relation === 'string' &&
            fetchedEntities.has(qualifier.value_relation)
          ) {
            qualifier.value_relation = fetchedEntities.get(
              qualifier.value_relation
            );
          }
        });

        (claim.references || []).forEach((reference) => {
          if (
            typeof reference.reference === 'string' &&
            fetchedEntities.has(reference.reference)
          ) {
            reference.reference = fetchedEntities.get(reference.reference);
          }
        });
      }
    }

    const outgoingClaims = allClaims.filter(
      (c) =>
        (typeof c.subject === 'object' ? c.subject?.$id : c.subject) ===
        entityId
    );
    const entityType = deriveEntityTypeFromClaims(outgoingClaims, entity.label);

    return {
      entity,
      claims: allClaims,
      entityType,
    };
  } catch (error) {
    console.error('Error fetching entity details:', error);
    throw error;
  }
}
