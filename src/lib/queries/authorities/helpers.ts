import { databases, DATABASE_ID, COLLECTIONS, Query } from '../../appwrite';
import type { Claim, Qualifier } from '../types';
import { QUALIFIER_TERRITORY, CANDIDATE_PROPERTY } from './constants';

export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export async function getCandidateClaimsForTerritory(
  territory: string,
  allRoleIds: string[]
): Promise<Claim[]> {
  const claimIds: string[] = [];
  const pageSize = 500;
  let offset = 0;

  while (true) {
    const qualifiers = await databases.listDocuments<Qualifier>(
      DATABASE_ID,
      COLLECTIONS.QUALIFIERS,
      [
        Query.equal('property', QUALIFIER_TERRITORY),
        Query.equal('value_relation', territory),
        Query.limit(pageSize),
        Query.offset(offset),
      ]
    );

    if (qualifiers.documents.length === 0) break;

    qualifiers.documents.forEach((q) => {
      const id = typeof q.claim === 'object' ? q.claim.$id : q.claim;
      if (id) claimIds.push(id);
    });

    if (qualifiers.documents.length < pageSize) break;
    offset += pageSize;
  }

  if (claimIds.length === 0) return [];

  const uniqueClaimIds = Array.from(new Set(claimIds));
  const claimBatchSize = 100;
  const batchPromises: Promise<Claim[]>[] = [];

  for (let i = 0; i < uniqueClaimIds.length; i += claimBatchSize) {
    const batch = uniqueClaimIds.slice(i, i + claimBatchSize);
    batchPromises.push(
      databases
        .listDocuments<Claim>(DATABASE_ID, COLLECTIONS.CLAIMS, [
          Query.equal('$id', batch),
          Query.equal('property', CANDIDATE_PROPERTY),
          Query.equal('value_relation', allRoleIds),
          Query.limit(claimBatchSize),
        ])
        .then((r) => r.documents)
    );
  }

  const results = await Promise.all(batchPromises);
  return results.flat();
}
