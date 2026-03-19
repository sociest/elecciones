import type { Claim } from '../types';

export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * Mock/CSV version of getting candidate claims (Aggregated in our CSV)
 */
export async function getCandidateClaimsForTerritory(
  territory: string,
  allRoleIds: string[]
): Promise<Claim[]> {
  // In the CSV version, we don't fetch separate claims.
  // This is kept for compatibility with internal legacy logic if needed.
  return [];
}

