import type { PolygonData } from '../types';

let polygonCache: PolygonData[] | null = null;
let polygonCacheTime: number = 0;
const POLYGON_CACHE_DURATION = 30 * 60 * 1000;
const LOCALSTORAGE_KEY = 'polygons_cache_v3';
const LOCALSTORAGE_TIME_KEY = 'polygons_cache_time_v3';
const MUNICIPAL_CACHE_KEY = 'municipal_geojson_cache_v2';
const MUNICIPAL_CACHE_TIME_KEY = 'municipal_geojson_cache_time_v2';

export function getCacheConstants() {
  return {
    POLYGON_CACHE_DURATION,
    LOCALSTORAGE_KEY,
    LOCALSTORAGE_TIME_KEY,
    MUNICIPAL_CACHE_KEY,
    MUNICIPAL_CACHE_TIME_KEY,
  };
}

export function getPolygonCache(): PolygonData[] | null {
  return polygonCache;
}

export function setPolygonCache(data: PolygonData[] | null): void {
  polygonCache = data;
  polygonCacheTime = Date.now();
}

export function getPolygonCacheTime(): number {
  return polygonCacheTime;
}

export function setPolygonCacheTime(time: number): void {
  polygonCacheTime = time;
}

export function isCacheValid(now: number): boolean {
  return (
    polygonCache !== null && now - polygonCacheTime < POLYGON_CACHE_DURATION
  );
}

export function loadFromLocalStorage(): PolygonData[] | null {
  if (typeof window === 'undefined') return null;

  try {
    const cached = localStorage.getItem(MUNICIPAL_CACHE_KEY);
    const cachedTime = localStorage.getItem(MUNICIPAL_CACHE_TIME_KEY);

    if (cached && cachedTime) {
      const cacheAge = Date.now() - Number(cachedTime);
      if (!Number.isNaN(cacheAge) && cacheAge < POLYGON_CACHE_DURATION) {
        const parsed = JSON.parse(cached);
        polygonCache = parsed;
        polygonCacheTime = Number(cachedTime);
        return parsed;
      } else {
        localStorage.removeItem(MUNICIPAL_CACHE_KEY);
        localStorage.removeItem(MUNICIPAL_CACHE_TIME_KEY);
      }
    }
  } catch (e) {
    console.warn('[polygonCache] Error loading from localStorage:', e);
    localStorage.removeItem(MUNICIPAL_CACHE_KEY);
    localStorage.removeItem(MUNICIPAL_CACHE_TIME_KEY);
  }

  return null;
}

export function saveToLocalStorage(data: PolygonData[]): void {
  if (typeof window === 'undefined') return;

  try {
    const cacheStartTime = performance.now();
    localStorage.setItem(MUNICIPAL_CACHE_KEY, JSON.stringify(data));
    localStorage.setItem(MUNICIPAL_CACHE_TIME_KEY, Date.now().toString());
    const cacheDuration = performance.now() - cacheStartTime;
    console.log(
      '[fetchPolygons] 💾 Caché guardado en localStorage (' +
        Math.round(cacheDuration) +
        'ms)'
    );
  } catch {
    console.warn('[fetchPolygons] ⚠️ No se pudo guardar en localStorage');
  }
}

export function loadLegacyCache(): PolygonData[] | null {
  if (typeof window === 'undefined') return null;

  try {
    const cachedData = localStorage.getItem(LOCALSTORAGE_KEY);
    const cachedTime = localStorage.getItem(LOCALSTORAGE_TIME_KEY);

    if (cachedData && cachedTime) {
      const cacheAge = Date.now() - parseInt(cachedTime);
      if (cacheAge < POLYGON_CACHE_DURATION) {
        const parsedData = JSON.parse(cachedData);
        polygonCache = parsedData;
        polygonCacheTime = parseInt(cachedTime);
        console.log('✅ Polígonos cargados desde caché local');
        return parsedData;
      }
    }
  } catch (e) {
    console.warn('Error leyendo caché de polígonos:', e);
  }

  return null;
}

export function saveLegacyCache(data: PolygonData[]): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(data));
    localStorage.setItem(LOCALSTORAGE_TIME_KEY, Date.now().toString());
    console.log(`✅ ${data.length} polígonos almacenados en caché`);
  } catch {
    console.warn('No se pudo guardar en localStorage (espacio insuficiente?)');
  }
}
