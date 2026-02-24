/**
 * Client-side municipality index module.
 *
 * Loads `municipalities-index.json` (generated at build time by
 * scripts/generate-municipality-index.ts) and exposes:
 *  - getMunicipalityIndex()       → cached list of all municipalities
 *  - findMunicipalityByCoords()   → GPS point-in-polygon (no Appwrite call)
 *  - searchMunicipalities()       → normalized fuzzy search
 */


export interface MunicipalityEntry {
  id: string; // Appwrite entity ID
  name: string; // e.g. "La Paz"
  ineCode: string; // e.g. "020101"
  department: string; // e.g. "La Paz"
  bbox: { minLat: number; maxLat: number; minLon: number; maxLon: number };
  polygon: number[][]; // simplified exterior ring [[lon, lat], ...]
}


const CACHE_KEY = "municipality_index_v1";
const CACHE_TIME_KEY = "municipality_index_time_v1";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

let memoryCache: MunicipalityEntry[] | null = null;


function readFromLocalStorage(): MunicipalityEntry[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const ts = localStorage.getItem(CACHE_TIME_KEY);
    if (!raw || !ts) return null;
    if (Date.now() - Number(ts) > CACHE_TTL_MS) return null;
    return JSON.parse(raw) as MunicipalityEntry[];
  } catch {
    return null;
  }
}

function writeToLocalStorage(data: MunicipalityEntry[]): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    localStorage.setItem(CACHE_TIME_KEY, String(Date.now()));
  } catch {
  }
}


/**
 * Returns the full municipality list.
 * Order of preference: memory → localStorage → network fetch.
 */
export async function getMunicipalityIndex(): Promise<MunicipalityEntry[]> {
  if (memoryCache) return memoryCache;

  const stored = readFromLocalStorage();
  if (stored) {
    memoryCache = stored;
    return stored;
  }

  const base = import.meta.env.PUBLIC_BASE_URL ?? "/";
  const baseRoute = import.meta.env.PUBLIC_BASE_ROUTE ?? "/";
  const url = `${base.replace(/\/$/, "")}${baseRoute.replace(/\/$/, "")}/municipalities-index.json`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `Failed to load municipalities-index.json: ${res.status} ${res.statusText}`,
    );
  }

  const data: MunicipalityEntry[] = await res.json();
  memoryCache = data;
  writeToLocalStorage(data);
  return data;
}

/**
 * Ray-casting point-in-polygon check.
 * Polygon vertices are [lon, lat] pairs.
 * Point is passed as (lat, lon) to match geolocation API conventions.
 */
function isPointInPolygon(lat: number, lon: number, ring: number[][]): boolean {
  let inside = false;
  const x = lon;
  const y = lat;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Finds which municipality contains the given GPS coordinates.
 * Uses bbox pre-filtering then ray-casting — entirely local, no network calls.
 */
export async function findMunicipalityByCoords(
  lat: number,
  lon: number,
): Promise<MunicipalityEntry | null> {
  const index = await getMunicipalityIndex();

  const candidates = index.filter(
    (m) =>
      lat >= m.bbox.minLat &&
      lat <= m.bbox.maxLat &&
      lon >= m.bbox.minLon &&
      lon <= m.bbox.maxLon,
  );

  for (const candidate of candidates) {
    if (isPointInPolygon(lat, lon, candidate.polygon)) {
      return candidate;
    }
  }

  return null;
}

/**
 * Searches municipalities by name using normalized accent-insensitive matching.
 * Returns up to `limit` results, sorted so prefix matches come first.
 */
export function searchMunicipalities(
  index: MunicipalityEntry[],
  query: string,
  limit = 8,
): MunicipalityEntry[] {
  const normalized = normalizeStr(query.trim());
  if (!normalized) return index.slice(0, limit);

  return index
    .filter((m) => normalizeStr(m.name).includes(normalized))
    .sort((a, b) => {
      const aStarts = normalizeStr(a.name).startsWith(normalized);
      const bStarts = normalizeStr(b.name).startsWith(normalized);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return 0;
    })
    .slice(0, limit);
}

export function normalizeStr(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
