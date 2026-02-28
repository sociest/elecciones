import { useState, useEffect, useRef } from 'react';
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
  // Return already-resolved data immediately (no extra work on re-mount)
  if (cachedGeoJson) return cachedGeoJson;

  // If a fetch is already in-flight, wait for it instead of starting a second one
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
          hasEntity: true, // every entry in the index has a matched entity id
        },
        geometry: {
          type: 'Polygon' as const,
          // municipalities-index.json stores the exterior ring; GeoJSON Polygon wraps it in an array
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

export const useMapGeometry = () => {
  const [geoJsonData, setGeoJsonData] = useState<MunicipalityGeoJSON | null>(
    // Initialise synchronously from cache when already available (StrictMode second mount)
    cachedGeoJson
  );
  const [loading, setLoading] = useState(!cachedGeoJson);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(!!cachedGeoJson);

  // isMounted ref: prevents setState after unmount (StrictMode cleanup)
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    // Already have data from cache — state was initialised by useState, nothing to do
    if (cachedGeoJson) return;

    loadGeoJson()
      .then((geojson) => {
        if (!isMountedRef.current) return;
        setGeoJsonData(geojson);
        setLoading(false);
        setError(null);
        setReady(true);
      })
      .catch((err: unknown) => {
        if (!isMountedRef.current) return;
        const msg =
          err instanceof Error ? err.message : 'Error al cargar los polígonos';
        console.error('[useMapGeometry] ❌', err);
        setError(msg);
        setLoading(false);
        setReady(false);
        // Clear the failed promise so future mounts can retry
        fetchPromise = null;
      });

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return { geoJsonData, loading, error, ready };
};
