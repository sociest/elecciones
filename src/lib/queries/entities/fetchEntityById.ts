import { databases, DATABASE_ID, COLLECTIONS, Query } from '../../appwrite';
import type { Entity, Claim } from '../types';

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
