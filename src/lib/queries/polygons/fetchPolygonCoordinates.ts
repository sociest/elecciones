import { storage } from '../../appwrite';
import type { Claim } from '../types';
import { parseGeoJsonCoordinates } from './geoHelpers';

/**
 * Fetch polygon data from storage or parse inline GeoJSON
 */
export async function fetchPolygonCoordinates(
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
