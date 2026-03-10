/**
 * Calculate bounding box for a polygon
 */
export function getPolygonBounds(coordinates: number[][][]): {
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
export function isPointInPolygon(
  point: number[],
  polygon: number[][][]
): boolean {
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

/**
 * Helper function to parse GeoJSON coordinates from various formats
 */
export function parseGeoJsonCoordinates(
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
