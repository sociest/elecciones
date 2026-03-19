import type { Entity } from './types';

/**
 * Fetch administrative levels based on municipalities index
 * Returns a Map of Entity ID -> Administrative Level (1, 2, 3)
 */
export async function fetchAdministrativeLevels(): Promise<
  Map<string, number>
> {
  const adminLevels = new Map<string, number>();

  try {
    const response = await fetch('/municipalities-index.json');
    const municipalities = await response.json();

    for (const muni of municipalities) {
      if (muni.id) {
        // In our index, these are all level 3 (municipalities)
        adminLevels.set(muni.id, 3);
      }
    }
    
    // Departments (Level 1)
    const departments = new Set(municipalities.map((m: any) => m.department));
    departments.forEach(dept => {
        adminLevels.set(dept as string, 1);
    });

  } catch (error) {
    console.error('Error fetching administrative levels (CSV):', error);
  }

  return adminLevels;
}

/**
 * Search municipalities and provinces by name for autocomplete
 */
export async function searchMunicipalities(
  searchTerm: string
): Promise<Entity[]> {
  if (!searchTerm || searchTerm.trim().length < 2) {
    return [];
  }

  try {
    const searchKey = searchTerm.toLowerCase().trim();
    const response = await fetch('/municipalities-index.json');
    const municipalities = await response.json();

    const results = municipalities
      .filter((m: any) => 
        m.name.toLowerCase().includes(searchKey) || 
        m.department.toLowerCase().includes(searchKey)
      )
      .map((m: any) => ({
        $id: m.id,
        label: m.name,
        description: `Municipio - ${m.department}`,
        type: 'Municipio',
        department: m.department
      }))
      .slice(0, 20);

    return results;
  } catch (error) {
    console.error('Error searching municipalities (CSV):', error);
    return [];
  }
}

