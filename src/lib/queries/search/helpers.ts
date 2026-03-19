import type { Entity } from '../types';

export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * Calculate search score for an entity based on search key and words.
 */
export function calculateSearchScore(
  entity: Entity,
  searchKey: string,
  searchWords: string[]
): number {
  const label = (entity.label || '').toLowerCase();
  const description = (entity.description || '').toLowerCase();
  const aliases = (entity.aliases || []).map((a: string) => a.toLowerCase());

  let score = 0;

  // Exact match
  if (label === searchKey) score += 1000;
  // Prefix match
  if (label.startsWith(searchKey)) score += 500;
  // Includes match
  if (label.includes(searchKey)) score += 100;
  // Aliases
  if (aliases.some((a) => a.includes(searchKey))) score += 80;
  // Description
  if (description.includes(searchKey)) score += 50;

  // Individual word matches
  if (searchWords.length > 1) {
    const allWordsMatch = searchWords.every(
      (word) =>
        label.includes(word) ||
        description.includes(word) ||
        aliases.some((a) => a.includes(word))
    );
    if (allWordsMatch) score += 200;
  }

  return score;
}

/**
 * Calculate quick search score (Simpler version)
 */
export function calculateQuickSearchScore(
  entity: Entity,
  searchKey: string
): number {
  const searchWords = searchKey.split(/\s+/).filter((w) => w.length > 0);
  return calculateSearchScore(entity, searchKey, searchWords);
}

