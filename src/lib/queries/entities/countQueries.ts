import { databases, DATABASE_ID, COLLECTIONS, Query } from '../../appwrite';
import type { Entity, Claim } from '../types';

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
