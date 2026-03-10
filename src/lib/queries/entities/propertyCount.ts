let _propertyCountMemCache: number | null = null;
const PROPERTY_COUNT_LS_KEY = 'gae_property_count';
const PROPERTY_COUNT_LS_TIME_KEY = 'gae_property_count_time';
const PROPERTY_COUNT_TTL = 60 * 60 * 1000; // 1 hour

import { databases, DATABASE_ID, COLLECTIONS, Query } from '../../appwrite';
import type { Claim } from '../types';

/**
 * Get count of unique properties.
 *
 * Implementation note: counting unique property IDs by scanning every claim
 * (Query.limit(5000)) is prohibitively expensive.  Instead we cache the value
 * in localStorage with a 1-hour TTL and in memory for the lifetime of the tab.
 * The number of distinct property types in the KB changes rarely, so staleness
 * is acceptable.
 */
export async function getPropertyCount(): Promise<number> {
  if (_propertyCountMemCache !== null) return _propertyCountMemCache;

  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(PROPERTY_COUNT_LS_KEY);
      const storedTime = localStorage.getItem(PROPERTY_COUNT_LS_TIME_KEY);
      if (stored !== null && storedTime !== null) {
        const age = Date.now() - Number(storedTime);
        if (!Number.isNaN(age) && age < PROPERTY_COUNT_TTL) {
          const cached = Number(stored);
          _propertyCountMemCache = cached;
          return cached;
        }
      }
    } catch {
      // ignore
    }
  }

  try {
    const response = await databases.listDocuments<Claim>(
      DATABASE_ID,
      COLLECTIONS.CLAIMS,
      [Query.limit(100), Query.select(['property'])]
    );

    const uniqueProperties = new Set<string>();
    response.documents.forEach((claim) => {
      if (claim.property) {
        const propertyId =
          typeof claim.property === 'string'
            ? claim.property
            : (claim.property as { $id?: string }).$id;
        if (propertyId) uniqueProperties.add(propertyId);
      }
    });

    const count = uniqueProperties.size;
    _propertyCountMemCache = count;

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(PROPERTY_COUNT_LS_KEY, String(count));
        localStorage.setItem(PROPERTY_COUNT_LS_TIME_KEY, String(Date.now()));
      } catch {
        // Ignore write errors
      }
    }

    return count;
  } catch (error) {
    console.error('Error getting property count:', error);
    return 0;
  }
}
