import { databases, DATABASE_ID, COLLECTIONS, Query } from '../../appwrite';
import type { Entity, Claim, Qualifier, Reference } from '../types';
import { deriveEntityTypeFromClaims } from './entityTypeDerivation';

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
