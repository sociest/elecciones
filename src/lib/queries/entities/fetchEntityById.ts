import { fetchEntityById as fetchFromCSV } from '../search/queries';

/**
 * Fetch a single entity by ID
 */
export async function fetchEntityById(entityId: string) {
  const entity = await fetchFromCSV(entityId);
  return {
    entity,
    claims: [], // Mocking empty claims for now as they are aggregated into the entity
  };
}

/**
 * Alias for fetchEntityById - get a single entity by ID
 */
export async function getEntityById(entityId: string) {
  return fetchFromCSV(entityId);
}

