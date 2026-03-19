import { fetchEntitiesFiltered } from '../../search/queries';

/**
 * Get person and party IDs for a department and its municipalities (CSV version)
 */
export async function getPersonAndPartyIdsForDepartment(
  departmentId: string,
  municipalityIds: string[]
): Promise<{ personIds: string[]; partyIds: string[] }> {
  try {
    // In CSV world, we can just fetch all persons for the department and municipalities
    // Since our fetchEntitiesFiltered handles department matching (which includes muni labels)
    // we can simplify this.
    
    const { documents } = await fetchEntitiesFiltered({
      department: departmentId,
      limit: 2000,
      entityType: 'Persona'
    });

    const personIds = documents.map(d => d.$id);
    
    // Extract unique parties from the persons
    const partyIds = Array.from(
      new Set(
        documents
          .map((d: any) => d.party?.label)
          .filter(Boolean)
          .map((label: string) => `party_${label.toLowerCase().replace(/\s+/g, '_')}`)
      )
    );

    return { personIds, partyIds };
  } catch (error) {
    console.error('[getPersonAndPartyIdsForDepartment] CSV Error:', error);
    return { personIds: [], partyIds: [] };
  }
}
