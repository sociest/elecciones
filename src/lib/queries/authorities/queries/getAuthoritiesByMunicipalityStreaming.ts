import type { Authority } from '../../types';
import type { AuthoritiesByMunicipality } from '../types';
import { fetchEntitiesFiltered } from '../../search/queries';

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
    // In our CSV world, we can just fetch all candidates for this territory
    // We filter by territoryId (which is the municipality ID or department ID in our CSV)
    const { documents } = await fetchEntitiesFiltered({
      department: territoryId, // In fetchEntitiesFiltered, this checks territoryLabel or department
      limit: 1000,
      entityType: 'Persona'
    });

    const authorities = documents as unknown as Authority[];

    // Categorize them
    authorities.forEach(auth => {
      const role = auth.role || '';
      if (role.toLowerCase().includes('alcalde')) merged.alcalde.push(auth);
      else if (role.toLowerCase().includes('gobernador')) merged.gobernador.push(auth);
      else if (role.toLowerCase().includes('concejal')) merged.concejales.push(auth);
      else if (role.toLowerCase().includes('asambleísta')) merged.asambleistas.push(auth);
    });

    // Emit the batch
    onBatch(authorities, true);

  } catch (error) {
    console.error('Error in getAuthoritiesByMunicipalityStreaming (CSV):', error);
  }

  return merged;
}

