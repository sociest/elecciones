import {
  databases,
  storage,
  DATABASE_ID,
  COLLECTIONS,
  Query,
} from '../../appwrite';
import type { Entity, Claim, PolygonData } from '../types';
import { fetchAdministrativeLevels } from '../administrative';
import {
  getPolygonCache,
  setPolygonCache,
  getPolygonCacheTime,
  isCacheValid,
  loadFromLocalStorage,
  saveToLocalStorage,
  loadLegacyCache,
  saveLegacyCache,
  getCacheConstants,
} from './cache';
import { getTerritorialCodeMap } from './territoryMap';
import { parseGeoJsonCoordinates } from './geoHelpers';
import { fetchPolygonCoordinates } from './fetchPolygonCoordinates';

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

/**
 * Fetch polygon data for map visualization
 */
export async function fetchPolygons(): Promise<PolygonData[]> {
  console.log('[fetchPolygons] Iniciando carga de polígonos...');

  const now = Date.now();
  const cachedPolygons = getPolygonCache();
  if (cachedPolygons && isCacheValid(now)) {
    console.log(
      '[fetchPolygons] ✅ Retornando desde caché en memoria (' +
        cachedPolygons.length +
        ' polígonos)'
    );
    return cachedPolygons;
  }

  // Try loading from localStorage (municipal geojson)
  const localStorageData = loadFromLocalStorage();
  if (localStorageData) {
    console.log(
      '[fetchPolygons] ✅ ' +
        localStorageData.length +
        ' polígonos cargados desde localStorage'
    );
    return localStorageData;
  }

  // 3. Cargar desde MUNICIPAL_GEOJSON_URL (prioridad)
  console.log(
    '[fetchPolygons] 📡 Descargando GeoJSON municipal desde servidor...'
  );
  const fetchStartTime = performance.now();

  try {
    const polygons = await fetchMunicipalGeojson(fetchStartTime);
    setPolygonCache(polygons);
    saveToLocalStorage(polygons);
    return polygons;
  } catch (error) {
    console.error(
      '[fetchPolygons] ❌ Error cargando GeoJSON municipal:',
      error
    );
    console.log('[fetchPolygons] 🔄 Intentando fallback a método legacy...');
  }

  // Fallback to legacy method
  const fallbackNow = Date.now();
  if (cachedPolygons && isCacheValid(fallbackNow)) {
    return cachedPolygons;
  }

  const legacyData = loadLegacyCache();
  if (legacyData) {
    return legacyData;
  }

  // Final fallback: fetch from database
  try {
    const polygons = await fetchPolygonsFromDatabase();
    setPolygonCache(polygons);
    saveLegacyCache(polygons);
    return polygons;
  } catch (error) {
    console.error('Error fetching polygons:', error);
    throw error;
  }
}

async function fetchMunicipalGeojson(
  fetchStartTime: number
): Promise<PolygonData[]> {
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

  const totalDuration = performance.now() - fetchStartTime;
  console.log(
    '[fetchPolygons] 🎉 Carga completa en ' + Math.round(totalDuration) + 'ms'
  );

  return polygons;
}

async function fetchPolygonsFromDatabase(): Promise<PolygonData[]> {
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
          typeof claim.subject === 'string' ? claim.subject : claim.subject.$id;
        const administrativeLevel = adminLevels.get(entityId) || 0;

        const cleanCoordinates = JSON.parse(JSON.stringify(coordinates));

        polygons.push({
          entityId,
          entityLabel:
            typeof claim.subject === 'string' ? '' : claim.subject.label || '',
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

  return polygons;
}
