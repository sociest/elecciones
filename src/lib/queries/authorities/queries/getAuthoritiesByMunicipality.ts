import type { AuthoritiesByMunicipality } from '../types';
import { getAuthoritiesByMunicipalityStreaming } from './getAuthoritiesByMunicipalityStreaming';

/**
 * Get authorities for a municipality (Non-streaming version)
 */
export async function getAuthoritiesByMunicipality(
  territoryId: string
): Promise<AuthoritiesByMunicipality> {
  // Reuse the streaming version but wait for completion
  return getAuthoritiesByMunicipalityStreaming(territoryId, () => {});
}

