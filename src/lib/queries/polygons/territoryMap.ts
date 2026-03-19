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
  try {
    const response = await fetch('/municipalities-meta.json');
    if (!response.ok) throw new Error('Failed to fetch municipalities meta');
    const data = await response.json();
    
    data.forEach((item: any) => {
      if (item.id && item.ineCode) {
        map.set(item.ineCode, item.id);
      }
    });
  } catch (error) {
    console.error('Error loading territorial code map (JSON):', error);
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
