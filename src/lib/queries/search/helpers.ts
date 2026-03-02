import { databases, DATABASE_ID, COLLECTIONS, Query } from '../../appwrite';
import type { Entity, Claim } from '../types';
import { PROPERTY_IDS } from '../constants';
import { quickSearchTypeCache, CACHE_DURATION } from './cache';

export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function calculateQuickSearchScore(
  entity: Entity,
  searchKey: string
): number {
  const label = normalizeText(entity.label || '');
  const description = normalizeText(entity.description || '');
  const aliases = (entity.aliases || []).map((a: string) => normalizeText(a));

  let score = 0;

  if (label === searchKey) score += 1000;
  if (label.startsWith(searchKey)) score += 500;
  if (label.includes(searchKey)) score += 100;
  if (aliases.some((a) => a.includes(searchKey))) score += 80;
  if (description.includes(searchKey)) score += 50;

  const searchWords = searchKey.split(/\s+/).filter((w) => w.length > 0);
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

export async function fetchEntitiesByTypeId(typeId: string): Promise<Entity[]> {
  const cached = quickSearchTypeCache.get(typeId);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  const LIMIT = 500;
  let offset = 0;
  let keepFetching = true;
  const subjectIds: string[] = [];

  while (keepFetching) {
    const response = await databases.listDocuments<Claim>(
      DATABASE_ID,
      COLLECTIONS.CLAIMS,
      [
        Query.equal('property', PROPERTY_IDS.INSTANCE_OF),
        Query.equal('value_relation', typeId),
        Query.limit(LIMIT),
        Query.offset(offset),
      ]
    );

    response.documents.forEach((claim) => {
      const id = claim.subject?.$id || (claim.subject as unknown as string);
      if (id) subjectIds.push(id);
    });

    if (response.documents.length < LIMIT) {
      keepFetching = false;
    } else {
      offset += LIMIT;
    }
  }

  if (subjectIds.length === 0) {
    quickSearchTypeCache.set(typeId, { data: [], timestamp: Date.now() });
    return [];
  }

  const entities: Entity[] = [];
  const batchSize = 50;
  for (let i = 0; i < subjectIds.length; i += batchSize) {
    const batch = subjectIds.slice(i, i + batchSize);
    const response = await databases.listDocuments<Entity>(
      DATABASE_ID,
      COLLECTIONS.ENTITIES,
      [Query.equal('$id', batch), Query.limit(batchSize)]
    );
    entities.push(...response.documents);
  }

  quickSearchTypeCache.set(typeId, { data: entities, timestamp: Date.now() });
  return entities;
}

export async function fetchEntitiesByLabels(
  labels: string[]
): Promise<Entity[]> {
  if (labels.length === 0) return [];
  const response = await databases.listDocuments<Entity>(
    DATABASE_ID,
    COLLECTIONS.ENTITIES,
    [Query.equal('label', labels), Query.limit(100)]
  );
  return response.documents;
}

export function calculateSearchScore(
  entity: Entity,
  searchKey: string,
  searchWords: string[]
): number {
  const label = (entity.label || '').toLowerCase();
  const description = (entity.description || '').toLowerCase();
  const aliases = (entity.aliases || []).map((a: string) => a.toLowerCase());

  let score = 0;

  if (label === searchKey) score += 1000;
  if (label.startsWith(searchKey)) score += 500;
  if (label.includes(searchKey)) score += 100;
  if (aliases.some((a) => a.includes(searchKey))) score += 80;
  if (description.includes(searchKey)) score += 50;

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

export async function performClientSideSearch(
  searchKey: string,
  searchWords: string[]
): Promise<Entity[]> {
  const batchSize = 100;
  const maxBatches = 10;
  const allEntities: Entity[] = [];

  for (let i = 0; i < maxBatches; i++) {
    const batchResponse = await databases.listDocuments<Entity>(
      DATABASE_ID,
      COLLECTIONS.ENTITIES,
      [
        Query.limit(batchSize),
        Query.offset(i * batchSize),
        Query.orderDesc('$createdAt'),
      ]
    );

    allEntities.push(...batchResponse.documents);

    if (batchResponse.documents.length < batchSize) break;
  }

  return allEntities
    .map((doc) => ({
      doc,
      score: calculateSearchScore(doc, searchKey, searchWords),
    }))
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((result) => result.doc);
}
