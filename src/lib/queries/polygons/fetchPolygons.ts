import type { PolygonData } from '../types';
import {
  getPolygonCache,
  setPolygonCache,
  isCacheValid,
  loadFromLocalStorage,
  saveToLocalStorage,
  loadLegacyCache,
} from './cache';


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
    
    const legacyData = loadLegacyCache();
    if (legacyData) {
      return legacyData;
    }
    
    return [];
  }
}

async function fetchMunicipalGeojson(
  fetchStartTime: number
): Promise<PolygonData[]> {
  const response = await fetch('/municipalities-index.json', {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch municipal index: ' + response.status);
  }

  const data = await response.json();
  const fetchDuration = performance.now() - fetchStartTime;
  console.log(
    '[fetchPolygons] ✅ Index municipal descargado en ' +
      Math.round(fetchDuration) +
      'ms'
  );

  const municipalities = (data || []) as any[];
  console.log(
    '[fetchPolygons] 📊 Procesando ' +
      municipalities.length +
      ' municipios del index...'
  );

  const polygons: PolygonData[] = [];

  for (const item of municipalities) {
    const { id, name, ineCode, department, coordinates } = item;

    if (!id || !name || !coordinates) continue;

    const departmentCode = ineCode ? ineCode.slice(0, 2) : '';
    const departamentName = department || DEPARTMENT_NAME_BY_CODE[departmentCode];

    // Wrap coordinates in number[][][] format if they are number[][]
    const formattedCoordinates = Array.isArray(coordinates[0][0]) 
      ? coordinates 
      : [coordinates];

    polygons.push({
      entityId: id,
      entityLabel: name,
      coordinates: formattedCoordinates,
      administrativeLevel: 3,
      departamentName,
      ineCode,
      hasEntity: true,
    });
  }

  console.log(
    '[fetchPolygons] ✅ ' +
      polygons.length +
      ' polígonos procesados desde index local'
  );

  const totalDuration = performance.now() - fetchStartTime;
  console.log(
    '[fetchPolygons] 🎉 Carga completa en ' + Math.round(totalDuration) + 'ms'
  );

  return polygons;
}

// No-op for removed functions
