import { databases, DATABASE_ID, COLLECTIONS, Query } from '../../../appwrite';
import type { Claim, Qualifier } from '../../types';
import { PROPERTY_IDS } from '../../constants';
import { getAllRoleIds } from '../cache';
import { getCandidateClaimsForTerritory } from '../helpers';

export async function getPersonAndPartyIdsForDepartment(
  departmentId: string,
  municipalityIds: string[]
): Promise<{ personIds: string[]; partyIds: string[] }> {
  try {
    const allRoleIds = await getAllRoleIds();
    if (allRoleIds.length === 0) return { personIds: [], partyIds: [] };

    const allTerritories = [departmentId, ...municipalityIds];

    const CONCURRENCY = 20;
    const allClaims: Claim[] = [];

    for (let i = 0; i < allTerritories.length; i += CONCURRENCY) {
      const batch = allTerritories.slice(i, i + CONCURRENCY);
      const batchResults = await Promise.all(
        batch.map((territory) =>
          getCandidateClaimsForTerritory(territory, allRoleIds)
        )
      );
      allClaims.push(...batchResults.flat());
    }

    if (allClaims.length === 0) return { personIds: [], partyIds: [] };

    const personIds = Array.from(
      new Set(
        allClaims
          .map(
            (c) =>
              (c.subject?.$id || (c.subject as unknown as string)) as string
          )
          .filter(Boolean)
      )
    );

    const claimIds = allClaims.map((c) => c.$id);
    const BATCH = 100;
    const partyQualPromises: Promise<Qualifier[]>[] = [];

    for (let i = 0; i < claimIds.length; i += BATCH) {
      const chunk = claimIds.slice(i, i + BATCH);
      partyQualPromises.push(
        databases
          .listDocuments<Qualifier>(DATABASE_ID, COLLECTIONS.QUALIFIERS, [
            Query.equal('claim', chunk),
            Query.equal('property', PROPERTY_IDS.POLITICAL_PARTY),
            Query.limit(BATCH),
          ])
          .then((r) => r.documents)
      );
    }

    const partyQualResults = await Promise.all(partyQualPromises);
    const partyIds = Array.from(
      new Set(
        partyQualResults
          .flat()
          .map((q) => {
            const vr = q.value_relation;
            if (!vr) return null;
            return vr.$id;
          })
          .filter((id): id is string => !!id)
      )
    );

    console.log(
      `[getPersonAndPartyIdsForDepartment] ${personIds.length} personas | ${partyIds.length} partidos`
    );

    return { personIds, partyIds };
  } catch (error) {
    console.error('[getPersonAndPartyIdsForDepartment] Error:', error);
    return { personIds: [], partyIds: [] };
  }
}
