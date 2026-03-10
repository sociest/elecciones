import {
  databases,
  storage,
  DATABASE_ID,
  COLLECTIONS,
  Query,
} from '../appwrite';
import type { Entity, Claim, PolygonData } from './types';
import { fetchAdministrativeLevels } from './administrative';
import { PROPERTY_IDS } from './constants';

let polygonCache: PolygonData[] | null = null;
let polygonCacheTime: number = 0;
const POLYGON_CACHE_DURATION = 30 * 60 * 1000;
const LOCALSTORAGE_KEY = 'polygons_cache_v3';
const LOCALSTORAGE_TIME_KEY = 'polygons_cache_time_v3';
const MUNICIPAL_CACHE_KEY = 'municipal_geojson_cache_v2';
const MUNICIPAL_CACHE_TIME_KEY = 'municipal_geojson_cache_time_v2';
const TERRITORIAL_CODE_MAP_KEY = 'territorial_code_map_v2';
const TERRITORIAL_CODE_TIME_KEY = 'territorial_code_time_v2';

const MUNICIPAL_GEOJSON_URL =
  'https://appwrite.sociest.org/v1/storage/buckets/6982ca130039bc0ee4e2/files/69925c22001112baddeb/view?project=697ea96f003c3264105c';

const DEPARTMENT_NAME_BY_CODE: Record<string, string> = {
  '01': 'Chuquisaca',
  '02': 'La Paz',
  '03': 'Cochabamba',
  '04': 'Oruro',
  '05': 'Potosí',
  '06': 'Tarija',
  '07': 'Santa Cruz',
  '08': 'Beni',
  '09': 'Pando',
};

type MunicipalFeature = {
  type: 'Feature';
  properties?: { id?: string; nombre?: string };
  geometry?: { type: string; coordinates: unknown };
};

let territorialCodeMapCache: Map<string, string> | null = null;

async function getTerritorialCodeMap(): Promise<Map<string, string>> {
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

/**
 * Helper function to parse GeoJSON coordinates from various formats
 */
function parseGeoJsonCoordinates(
  geoJsonData: {
    type?: string;
    geometry?: { type: string; coordinates: unknown };
    coordinates?: unknown;
  },
  claimId: string
): number[][][] | null {
  let coordinates: number[][][] | null = null;

  if (geoJsonData.type === 'Feature' && geoJsonData.geometry) {
    if (geoJsonData.geometry.type === 'MultiPolygon') {
      // Para MultiPolygon, tomamos el primer polígono (puede haber múltiples)
      coordinates = (geoJsonData.geometry.coordinates as number[][][][])[0];
    } else if (geoJsonData.geometry.type === 'Polygon') {
      coordinates = geoJsonData.geometry.coordinates as number[][][];
    }
  } else if (geoJsonData.type === 'MultiPolygon') {
    coordinates = (geoJsonData.coordinates as number[][][][])[0];
  } else if (geoJsonData.type === 'Polygon') {
    coordinates = geoJsonData.coordinates as number[][][];
  } else if (Array.isArray(geoJsonData)) {
    coordinates = geoJsonData as unknown as number[][][];
  }

  if (!coordinates || !Array.isArray(coordinates) || coordinates.length === 0) {
    console.warn(
      '[parseGeoJsonCoordinates] Coordenadas vacías o inválidas para claim:',
      claimId
    );
    return null;
  }

  if (
    !coordinates[0] ||
    !Array.isArray(coordinates[0]) ||
    coordinates[0].length < 3
  ) {
    console.warn(
      '[parseGeoJsonCoordinates] Ring principal inválido (menos de 3 puntos) para claim:',
      claimId
    );
    return null;
  }

  const firstRing = coordinates[0];
  for (let i = 0; i < firstRing.length; i++) {
    const point = firstRing[i];
    if (
      !Array.isArray(point) ||
      point.length < 2 ||
      typeof point[0] !== 'number' ||
      typeof point[1] !== 'number' ||
      isNaN(point[0]) ||
      isNaN(point[1])
    ) {
      console.warn(
        '[parseGeoJsonCoordinates] Punto inválido en índice',
        i,
        'para claim:',
        claimId
      );
      return null;
    }
  }

  return coordinates;
}

/**
 * Fetch polygon data from storage or parse inline GeoJSON
 */
async function fetchPolygonCoordinates(
  claim: Claim
): Promise<number[][][] | null> {
  try {
    let coordinates;

    if (
      typeof claim.value_raw === 'string' &&
      claim.value_raw.startsWith('http')
    ) {
      const urlMatch = claim.value_raw.match(
        /\/buckets\/([^/]+)\/files\/([^/]+)\//
      );

      if (urlMatch) {
        const [, bucketId, fileId] = urlMatch;

        try {
          const fileUrl = storage.getFileView(bucketId, fileId);

          const geoJsonResponse = await fetch(fileUrl);

          if (!geoJsonResponse.ok) {
            const directResponse = await fetch(claim.value_raw, {
              method: 'GET',
              headers: {
                Accept: 'application/json',
              },
              mode: 'cors',
              credentials: 'omit',
            });

            if (!directResponse.ok) {
              return null;
            }

            const geoJsonData = await directResponse.json();
            coordinates = parseGeoJsonCoordinates(geoJsonData, claim.$id);
          } else {
            const geoJsonData = await geoJsonResponse.json();
            coordinates = parseGeoJsonCoordinates(geoJsonData, claim.$id);
          }
        } catch {
          // Fallback: try direct fetch
          try {
            const directResponse = await fetch(claim.value_raw);
            if (!directResponse.ok) {
              return null;
            }
            const geoJsonData = await directResponse.json();
            coordinates = parseGeoJsonCoordinates(geoJsonData, claim.$id);
          } catch {
            return null;
          }
        }
      } else {
        try {
          const geoJsonResponse = await fetch(claim.value_raw);
          if (!geoJsonResponse.ok) {
            return null;
          }
          const geoJsonData = await geoJsonResponse.json();
          coordinates = parseGeoJsonCoordinates(geoJsonData, claim.$id);
        } catch {
          return null;
        }
      }
    } else if (claim.value_raw) {
      coordinates = JSON.parse(claim.value_raw);
    } else {
      return null;
    }

    if (
      !coordinates ||
      !Array.isArray(coordinates) ||
      coordinates.length === 0
    ) {
      return null;
    }

    return coordinates;
  } catch {
    return null;
  }
}

/**
 * Fetch polygon data for map visualization
 */
export async function fetchPolygons(): Promise<PolygonData[]> {
  console.log('[fetchPolygons] Iniciando carga de polígonos...');

  const now = Date.now();
  if (polygonCache && now - polygonCacheTime < POLYGON_CACHE_DURATION) {
    console.log(
      '[fetchPolygons] ✅ Retornando desde caché en memoria (' +
        polygonCache.length +
        ' polígonos)'
    );
    return polygonCache;
  }

  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(MUNICIPAL_CACHE_KEY);
    const cachedTime = localStorage.getItem(MUNICIPAL_CACHE_TIME_KEY);
    if (cached && cachedTime) {
      const cacheAge = Date.now() - Number(cachedTime);
      if (!Number.isNaN(cacheAge) && cacheAge < POLYGON_CACHE_DURATION) {
        try {
          console.log(
            '[fetchPolygons] ✅ Cargando desde localStorage (edad: ' +
              Math.round(cacheAge / 1000) +
              's)'
          );
          const parsed = JSON.parse(cached);
          polygonCache = parsed;
          polygonCacheTime = Number(cachedTime);
          console.log(
            '[fetchPolygons] ✅ ' +
              parsed.length +
              ' polígonos cargados desde localStorage'
          );
          return parsed;
        } catch (e) {
          console.warn(
            '[fetchPolygons] ⚠️ Error parseando caché, limpiando...',
            e
          );
          localStorage.removeItem(MUNICIPAL_CACHE_KEY);
          localStorage.removeItem(MUNICIPAL_CACHE_TIME_KEY);
        }
      } else {
        console.log(
          '[fetchPolygons] ⏰ Caché expirado (edad: ' +
            Math.round(cacheAge / 1000) +
            's)'
        );
      }
    }
  }

  // 3. Cargar desde MUNICIPAL_GEOJSON_URL (prioridad)
  console.log(
    '[fetchPolygons] 📡 Descargando GeoJSON municipal desde servidor...'
  );
  const fetchStartTime = performance.now();

  try {
    const response = await fetch(MUNICIPAL_GEOJSON_URL, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      mode: 'cors',
      credentials: 'omit',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch municipal GeoJSON: ' + response.status);
    }

    const data = await response.json();
    const fetchDuration = performance.now() - fetchStartTime;
    console.log(
      '[fetchPolygons] ✅ GeoJSON descargado en ' +
        Math.round(fetchDuration) +
        'ms'
    );

    const features = (data?.features || []) as MunicipalFeature[];
    console.log(
      '[fetchPolygons] 📊 Procesando ' +
        features.length +
        ' features del GeoJSON...'
    );

    const codeMap = await getTerritorialCodeMap();
    console.log(
      '[fetchPolygons] 📋 Mapa de códigos territoriales cargado (' +
        codeMap.size +
        ' códigos)'
    );

    const polygons: PolygonData[] = [];
    let skippedNoCode = 0;
    let skippedNoCoords = 0;

    for (const feature of features) {
      const props = feature.properties || {};
      const ineCode = props.id ? String(props.id) : '';
      const name = props.nombre || '';

      if (!ineCode || !name) {
        skippedNoCode++;
        continue;
      }

      if (!feature.geometry) {
        skippedNoCode++;
        continue;
      }

      const entityId = codeMap.get(ineCode);

      const coordinates = parseGeoJsonCoordinates(
        { type: 'Feature', geometry: feature.geometry },
        ineCode
      );

      if (!coordinates) {
        skippedNoCoords++;
        continue;
      }

      if (
        !coordinates[0] ||
        !Array.isArray(coordinates[0]) ||
        coordinates[0].length < 3
      ) {
        skippedNoCoords++;
        continue;
      }

      const departmentCode = ineCode.slice(0, 2);
      const departamentName = DEPARTMENT_NAME_BY_CODE[departmentCode];

      polygons.push({
        entityId: entityId || `municipality_${ineCode}`,
        entityLabel: name,
        coordinates,
        administrativeLevel: 3,
        departamentName,
        ineCode,
        hasEntity: !!entityId,
      });
    }

    const withEntity = polygons.filter((p) => p.hasEntity).length;
    const withoutEntity = polygons.filter((p) => !p.hasEntity).length;

    console.log(
      '[fetchPolygons] ✅ ' +
        polygons.length +
        ' polígonos procesados correctamente'
    );
    console.log(
      '[fetchPolygons] 📊 Con entityId: ' +
        withEntity +
        ' | Sin entityId: ' +
        withoutEntity
    );
    if (skippedNoCode > 0)
      console.log(
        '[fetchPolygons] ⚠️ ' +
          skippedNoCode +
          ' features sin código/nombre/geometría'
      );
    if (skippedNoCoords > 0)
      console.log(
        '[fetchPolygons] ⚠️ ' +
          skippedNoCoords +
          ' features con coordenadas inválidas'
      );

    polygonCache = polygons;
    polygonCacheTime = Date.now();

    if (typeof window !== 'undefined') {
      try {
        const cacheStartTime = performance.now();
        localStorage.setItem(MUNICIPAL_CACHE_KEY, JSON.stringify(polygons));
        localStorage.setItem(
          MUNICIPAL_CACHE_TIME_KEY,
          polygonCacheTime.toString()
        );
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

    const totalDuration = performance.now() - fetchStartTime;
    console.log(
      '[fetchPolygons] 🎉 Carga completa en ' + Math.round(totalDuration) + 'ms'
    );
    return polygons;
  } catch (error) {
    console.error(
      '[fetchPolygons] ❌ Error cargando GeoJSON municipal:',
      error
    );
    console.log('[fetchPolygons] 🔄 Intentando fallback a método legacy...');
  }

  const fallbackNow = Date.now();
  if (polygonCache && fallbackNow - polygonCacheTime < POLYGON_CACHE_DURATION) {
    return polygonCache;
  }

  if (typeof window !== 'undefined') {
    try {
      const cachedData = localStorage.getItem(LOCALSTORAGE_KEY);
      const cachedTime = localStorage.getItem(LOCALSTORAGE_TIME_KEY);

      if (cachedData && cachedTime) {
        const cacheAge = fallbackNow - parseInt(cachedTime);
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
  }

  try {
    const LIMIT = 500;
    let offset = 0;
    let keepFetching = true;
    const allExampleClaims: Claim[] = [];

    while (keepFetching) {
      console.log(`📡 Fetching polygons offset ${offset}...`);
      const response = await databases.listDocuments<Claim>(
        DATABASE_ID,
        COLLECTIONS.CLAIMS,
        [
          Query.equal('datatype', 'polygon'),
          Query.limit(LIMIT),
          Query.offset(offset),
        ]
      );

      allExampleClaims.push(...response.documents);

      if (response.documents.length < LIMIT) {
        keepFetching = false;
      } else {
        offset += LIMIT;
      }
    }

    const adminLevels = await fetchAdministrativeLevels();
    const polygons: PolygonData[] = [];

    for (const claim of allExampleClaims) {
      if (claim.value_raw && claim.subject) {
        try {
          const coordinates = await fetchPolygonCoordinates(claim);

          if (!coordinates) {
            continue;
          }

          const entityId =
            typeof claim.subject === 'string'
              ? claim.subject
              : claim.subject.$id;
          const administrativeLevel = adminLevels.get(entityId) || 0;

          const cleanCoordinates = JSON.parse(JSON.stringify(coordinates));

          polygons.push({
            entityId,
            entityLabel:
              typeof claim.subject === 'string'
                ? ''
                : claim.subject.label || '',
            coordinates: cleanCoordinates,
            administrativeLevel,
          });
        } catch {
          // Skip invalid JSON
        }
      }
    }

    const stats = {
      level0: 0,
      level1: 0,
      level2: 0,
      level3: 0,
      total: polygons.length,
    };
    polygons.forEach((p) => {
      if (p.administrativeLevel === 1) stats.level1++;
      else if (p.administrativeLevel === 2) stats.level2++;
      else if (p.administrativeLevel === 3) stats.level3++;
      else stats.level0++;
    });
    console.log('📊 Distribución de Niveles Administrativos:', stats);

    const polygonsNeedingLabels = polygons.filter(
      (p) => !p.entityLabel || p.entityLabel === ''
    );
    if (polygonsNeedingLabels.length > 0) {
      try {
        const entityIds = [
          ...new Set(polygonsNeedingLabels.map((p) => p.entityId)),
        ];
        const entityLabels = new Map<string, string>();

        for (let i = 0; i < entityIds.length; i += 25) {
          const batch = entityIds.slice(i, i + 25);
          const entitiesResponse = await databases.listDocuments<Entity>(
            DATABASE_ID,
            COLLECTIONS.ENTITIES,
            [Query.equal('$id', batch), Query.limit(25)]
          );

          for (const entity of entitiesResponse.documents) {
            entityLabels.set(entity.$id, entity.label || '');
          }
        }

        for (const polygon of polygons) {
          if (!polygon.entityLabel || polygon.entityLabel === '') {
            const label = entityLabels.get(polygon.entityId);
            if (label) {
              polygon.entityLabel = label;
            }
          }
        }
      } catch (error) {
        console.warn('Error fetching entity labels:', error);
      }
    }

    polygonCache = polygons;
    polygonCacheTime = Date.now();

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(polygons));
        localStorage.setItem(
          LOCALSTORAGE_TIME_KEY,
          polygonCacheTime.toString()
        );
        console.log(`✅ ${polygons.length} polígonos almacenados en caché`);
      } catch {
        console.warn(
          'No se pudo guardar en localStorage (espacio insuficiente?)'
        );
      }
    }

    return polygons;
  } catch (error) {
    console.error('Error fetching polygons:', error);
    throw error;
  }
}

/**
 * Find municipality by coordinates using polygon intersection
 * Optimized with geographic bounds pre-filtering
 */
export async function findMunicipalityByCoordinates(
  lat: number,
  lon: number
): Promise<Entity | null> {
  const startTime = performance.now();

  try {
    const polygons = await fetchPolygons();

    if (lat < -23 || lat > -9 || lon < -70 || lon > -57) {
      console.warn('Coordenadas fuera de Bolivia:', { lat, lon });
    }

    const polygonsWithBounds = polygons.map((p) => ({
      ...p,
      bounds: getPolygonBounds(p.coordinates),
    }));

    const candidatePolygons = polygonsWithBounds.filter((polygon) => {
      const bounds = polygon.bounds;
      const inBounds =
        lat >= bounds.minLat &&
        lat <= bounds.maxLat &&
        lon >= bounds.minLon &&
        lon <= bounds.maxLon;

      if (!inBounds) return false;

      return polygon.administrativeLevel === 3;
    });

    candidatePolygons.sort((a, b) => {
      if (a.administrativeLevel !== b.administrativeLevel) {
        return b.administrativeLevel - a.administrativeLevel; // 3 va primero
      }

      const areaA =
        (a.bounds.maxLat - a.bounds.minLat) *
        (a.bounds.maxLon - a.bounds.minLon);
      const areaB =
        (b.bounds.maxLat - b.bounds.minLat) *
        (b.bounds.maxLon - b.bounds.minLon);
      return areaA - areaB;
    });

    for (const polygon of candidatePolygons) {
      if (isPointInPolygon([lon, lat], polygon.coordinates)) {
        const elapsed = performance.now() - startTime;
        console.log(
          `✅ Territorio encontrado: ${polygon.entityLabel} (Nivel ${polygon.administrativeLevel}) en ${elapsed.toFixed(0)}ms`
        );

        const entity = await databases.getDocument<Entity>(
          DATABASE_ID,
          COLLECTIONS.ENTITIES,
          polygon.entityId
        );
        return entity;
      }
    }

    const elapsed = performance.now() - startTime;
    console.log(`❌ No se encontró municipio (${elapsed.toFixed(0)}ms)`);
    return null;
  } catch (error) {
    console.error('Error finding municipality:', error);
    return null;
  }
}

/**
 * Calculate bounding box for a polygon
 */
function getPolygonBounds(coordinates: number[][][]): {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
} {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLon = Infinity;
  let maxLon = -Infinity;

  const ring = coordinates[0];
  for (const [lon, lat] of ring) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
  }

  return { minLat, maxLat, minLon, maxLon };
}

/**
 * Point-in-polygon algorithm (ray casting)
 * @param point [longitude, latitude]
 * @param polygon GeoJSON polygon coordinates
 */
function isPointInPolygon(point: number[], polygon: number[][][]): boolean {
  const [x, y] = point;

  const ring = polygon[0];
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0],
      yi = ring[i][1];
    const xj = ring[j][0],
      yj = ring[j][1];

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}
