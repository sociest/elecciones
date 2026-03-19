import type { Authority } from '../../types';
import { fetchEntitiesFiltered } from '../../search/queries';

export async function fetchAuthorities(
  options: { search?: string; limit?: number; offset?: number } = {}
): Promise<{ documents: Authority[]; total: number }> {
  // We can leverage fetchEntitiesFiltered since it already handles CSV and returns Entities
  // and our aggregated candidatos already have 'role' and 'party' fields mapped to Authority type
  const { documents, total } = await fetchEntitiesFiltered({
    ...options,
    entityType: 'Persona'
  });

  return {
    documents: documents as unknown as Authority[],
    total
  };
}

