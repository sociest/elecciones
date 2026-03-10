import { databases, DATABASE_ID, COLLECTIONS, Query } from '../../appwrite';
import type { Claim } from '../types';
import { PROPERTY_IDS } from '../constants';

const TERRITORIAL_CODE_MAP_KEY = 'territorial_code_map_v2';
const TERRITORIAL_CODE_TIME_KEY = 'territorial_code_time_v2';
const POLYGON_CACHE_DURATION = 30 * 60 * 1000;

let territorialCodeMapCache: Map<string, string> | null = null;

export async function getTerritorialCodeMap(): Promise<Map<string, string>> {
  if (territorialCodeMapCache) return territorialCodeMapCache;

  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(TERRITORIAL_CODE_MAP_KEY);
    const cachedTime = localStorage.getItem(TERRITORIAL_CODE_TIME_KEY);
    if (cached && cachedTime) {
      const cacheAge = Date.now() - Number(cachedTime);
      if (!Number.isNaN(cacheAge) && cacheAge < POLYGON_CACHE_DURATION) {
        try {
          const parsed = JSON.parse(cached) as Record<string, string>;
          territorialCodeMapCache = new Map(Object.entries(parsed));
          return territorialCodeMapCache;
        } catch {
          localStorage.removeItem(TERRITORIAL_CODE_MAP_KEY);
          localStorage.removeItem(TERRITORIAL_CODE_TIME_KEY);
        }
      }
    }
  }

  const map = new Map<string, string>();
  const LIMIT = 500;
  let offset = 0;
  let keepFetching = true;

  while (keepFetching) {
    const response = await databases.listDocuments<Claim>(
      DATABASE_ID,
      COLLECTIONS.CLAIMS,
      [
        Query.equal('property', PROPERTY_IDS.TERRITORIAL_CODE),
        Query.limit(LIMIT),
        Query.offset(offset),
      ]
    );

    response.documents.forEach((claim) => {
      if (!claim.value_raw || !claim.subject) return;
      const code = claim.value_raw.trim();
      if (code.length !== 6) return;
      const entityId =
        typeof claim.subject === 'string' ? claim.subject : claim.subject.$id;
      if (entityId) map.set(code, entityId);
    });

    if (response.documents.length < LIMIT) {
      keepFetching = false;
    } else {
      offset += LIMIT;
    }
  }

  territorialCodeMapCache = map;

  if (typeof window !== 'undefined') {
    try {
      const serialized = JSON.stringify(Object.fromEntries(map.entries()));
      localStorage.setItem(TERRITORIAL_CODE_MAP_KEY, serialized);
      localStorage.setItem(TERRITORIAL_CODE_TIME_KEY, Date.now().toString());
    } catch {
      console.warn('No se pudo guardar mapa de codigo territorial');
    }
  }

  return map;
}
