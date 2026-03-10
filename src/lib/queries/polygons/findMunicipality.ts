import { databases, DATABASE_ID, COLLECTIONS } from '../../appwrite';
import type { Entity, PolygonData } from '../types';
import { fetchPolygons } from './fetchPolygons';
import { getPolygonBounds, isPointInPolygon } from './geoHelpers';

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
