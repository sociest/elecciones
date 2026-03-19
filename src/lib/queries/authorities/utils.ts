import type { Entity, Claim, Authority } from '../types';
import { getRoleTypeSync } from './cache';
import type { AuthoritiesByMunicipality } from './types';

export function buildOfficialsMap(
  claims: Claim[]
): Map<string, { roleId: string; personId: string; claimId: string }[]> {
  const map = new Map<
    string,
    { roleId: string; personId: string; claimId: string }[]
  >();
  for (const c of claims) {
    const pid = typeof c.subject === 'object' ? c.subject.$id : c.subject;
    const rid =
      typeof c.value_relation === 'object'
        ? c.value_relation.$id
        : c.value_relation;
    if (!pid || !rid) continue;
    if (!map.has(pid)) map.set(pid, []);
    map.get(pid)!.push({ roleId: rid, personId: pid, claimId: c.$id });
  }
  return map;
}

export async function fetchAndEmit(
  officialsToFetch: Map<
    string,
    { roleId: string; personId: string; claimId: string }[]
  >,
  merged: AuthoritiesByMunicipality,
  onBatch: (batch: Authority[], replace: boolean) => void,
  isFirst: boolean
): Promise<void> {
  // In the CSV version, images and parties are already attached to the Entity
  // No need for complex Appwrite batches
  onBatch([], isFirst);
}

export async function fetchImagesForEntities(
  entities: Entity[]
): Promise<Map<string, string>> {
  const candidateImageMap = new Map<string, string>();
  entities.forEach(e => {
    if (e.imageUrl) candidateImageMap.set(e.$id, e.imageUrl);
  });
  return candidateImageMap;
}

export async function attachImagesToEntities(
  entities: Entity[]
): Promise<Authority[]> {
  const imageMap = await fetchImagesForEntities(entities);
  return entities.map((e) => ({
    ...e,
    role: (e as any).role,
    party: (e as any).party,
    imageUrl: imageMap.get(e.$id) || e.imageUrl,
  })) as Authority[];
}

