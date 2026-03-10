import { databases, DATABASE_ID, COLLECTIONS, Query } from '../../../appwrite';
import type { Claim, Authority } from '../../types';
import { PROPERTY_IDS } from '../../constants';
import { getAllRoleIds, getRoleIds } from '../cache';
import { getCandidateClaimsForTerritory } from '../helpers';
import { buildOfficialsMap, fetchAndEmit } from '../utils';
import type { AuthoritiesByMunicipality } from '../types';

export async function getAuthoritiesByMunicipalityStreaming(
  territoryId: string,
  onBatch: (batch: Authority[], replace: boolean) => void
): Promise<AuthoritiesByMunicipality> {
  const merged: AuthoritiesByMunicipality = {
    alcalde: [],
    gobernador: [],
    concejales: [],
    asambleistas: [],
  };

  try {
    const [allRoleIds] = await Promise.all([getAllRoleIds(), getRoleIds()]);

    const [l0Claims, parentClaims] = await Promise.all([
      getCandidateClaimsForTerritory(territoryId, allRoleIds),
      databases.listDocuments<Claim>(DATABASE_ID, COLLECTIONS.CLAIMS, [
        Query.equal('subject', territoryId),
        Query.equal('property', PROPERTY_IDS.PART_OF),
      ]),
    ]);

    const l0Map = buildOfficialsMap(l0Claims);
    await fetchAndEmit(l0Map, merged, onBatch, true);

    let parentId: string | null = null;
    const parentRel = parentClaims.documents[0]?.value_relation;
    if (parentRel)
      parentId = typeof parentRel === 'object' ? parentRel.$id : parentRel;

    if (parentId && parentId !== territoryId) {
      const [l1Claims, gpClaims] = await Promise.all([
        getCandidateClaimsForTerritory(parentId, allRoleIds),
        databases.listDocuments<Claim>(DATABASE_ID, COLLECTIONS.CLAIMS, [
          Query.equal('subject', parentId),
          Query.equal('property', PROPERTY_IDS.PART_OF),
        ]),
      ]);

      const l1Map = buildOfficialsMap(l1Claims);
      await fetchAndEmit(l1Map, merged, onBatch, false);

      let gpId: string | null = null;
      const gpRel = gpClaims.documents[0]?.value_relation;
      if (gpRel) gpId = typeof gpRel === 'object' ? gpRel.$id : gpRel;

      if (gpId && gpId !== parentId) {
        const l2Claims = await getCandidateClaimsForTerritory(gpId, allRoleIds);
        const l2Map = buildOfficialsMap(l2Claims);
        await fetchAndEmit(l2Map, merged, onBatch, false);
      }
    }
  } catch (error) {
    console.error('Error in getAuthoritiesByMunicipalityStreaming:', error);
  }

  return merged;
}
