import type { Entity } from '../types';
import { CACHE_DURATION } from '../constants';

export const searchCache = new Map<
  string,
  { data: Entity[]; timestamp: number; total: number }
>();

export const quickSearchCache = new Map<
  string,
  { data: Entity[]; timestamp: number; total: number }
>();

export const quickSearchTypeCache = new Map<
  string,
  { data: Entity[]; timestamp: number }
>();

export const deptMunicipalityCache = new Map<string, string[]>();
let municipalityCacheReady = false;

export async function loadMunicipalityCache(): Promise<void> {
  if (municipalityCacheReady) return;
  try {
    const base =
      typeof document !== 'undefined'
        ? new URL('/municipalities-index.json', document.baseURI).href
        : '/municipalities-index.json';
    const url = base;

    const response = await fetch(url);
    const data: Array<{ id: string; department: string }> =
      await response.json();

    data.forEach((m) => {
      if (!m.id || !m.department) return;
      if (!deptMunicipalityCache.has(m.department)) {
        deptMunicipalityCache.set(m.department, []);
      }
      deptMunicipalityCache.get(m.department)!.push(m.id);
    });

    municipalityCacheReady = true;
  } catch (err) {
    console.warn(
      '[loadMunicipalityCache] Could not load municipalities-index.json:',
      err
    );
  }
}

export { CACHE_DURATION };
