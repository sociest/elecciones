import { useReducer, useEffect, useRef } from 'react';
import { buildPath } from '../../../../lib/utils/paths';
import type { MunicipalityFeature, MunicipalityGeoJSON } from '../types';

interface MunicipalityEntry {
  id: string;
  name: string;
  ineCode: string;
  department: string;
  bbox: { minLat: number; maxLat: number; minLon: number; maxLon: number };
  polygon: number[][];
}

// Module-level singleton — survives React StrictMode double-mount
let cachedGeoJson: MunicipalityGeoJSON | null = null;
let fetchPromise: Promise<MunicipalityGeoJSON> | null = null;

async function loadGeoJson(): Promise<MunicipalityGeoJSON> {
  if (cachedGeoJson) return cachedGeoJson;

  if (fetchPromise) return fetchPromise;

  fetchPromise = (async () => {
    const startTime = performance.now();
    console.log(
      '[useMapGeometry] 🚀 Cargando geometrías desde municipalities-index.json...'
    );

    const res = await fetch(buildPath('/municipalities-index.json'));
    if (!res.ok) {
      throw new Error(
        `Error cargando municipalities-index.json: ${res.status}`
      );
    }

    const entries = (await res.json()) as MunicipalityEntry[];
    console.log(`[useMapGeometry] 📦 ${entries.length} municipios recibidos`);

    const features: MunicipalityFeature[] = entries
      .filter((e) => e.polygon && e.polygon.length >= 4)
      .map((e) => ({
        type: 'Feature' as const,
        properties: {
          id: e.id,
          name: e.name,
          department: e.department,
          level: 3,
          ineCode: e.ineCode,
          hasEntity: true,
        },
        geometry: {
          type: 'Polygon' as const,
          coordinates: [e.polygon],
        },
      }));

    const geojson: MunicipalityGeoJSON = {
      type: 'FeatureCollection',
      features,
    };

    cachedGeoJson = geojson;
    const duration = performance.now() - startTime;
    console.log(
      `[useMapGeometry] ✅ ${features.length} municipios listos (${Math.round(duration)}ms)`
    );
    return geojson;
  })();

  return fetchPromise;
}

type MapGeometryState = {
  geoJsonData: MunicipalityGeoJSON | null;
  loading: boolean;
  error: string | null;
  ready: boolean;
};

type MapGeometryAction =
  | { type: 'FETCH_SUCCESS'; payload: MunicipalityGeoJSON }
  | { type: 'FETCH_ERROR'; payload: string };

const mapGeometryReducer = (
  state: MapGeometryState,
  action: MapGeometryAction
): MapGeometryState => {
  switch (action.type) {
    case 'FETCH_SUCCESS':
      return {
        geoJsonData: action.payload,
        loading: false,
        error: null,
        ready: true,
      };
    case 'FETCH_ERROR':
      return {
        geoJsonData: null,
        loading: false,
        error: action.payload,
        ready: false,
      };
    default:
      return state;
  }
};

export const useMapGeometry = () => {
  const [state, dispatch] = useReducer(mapGeometryReducer, {
    geoJsonData: cachedGeoJson,
    loading: !cachedGeoJson,
    error: null,
    ready: !!cachedGeoJson,
  });

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    if (cachedGeoJson) return;

    loadGeoJson()
      .then((geojson) => {
        if (!isMountedRef.current) return;
        dispatch({ type: 'FETCH_SUCCESS', payload: geojson });
      })
      .catch((err: unknown) => {
        if (!isMountedRef.current) return;
        const msg =
          err instanceof Error ? err.message : 'Error al cargar los polígonos';
        console.error('[useMapGeometry] ❌', err);
        dispatch({ type: 'FETCH_ERROR', payload: msg });
        fetchPromise = null;
      });

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return state;
};
