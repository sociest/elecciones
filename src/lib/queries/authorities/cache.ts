import type { AuthorityRole } from './types';
import { CANDIDATE_PROPERTY } from './constants';

/**
 * Mock role IDs for CSV compatibility
 */
export async function getRoleIds(): Promise<Record<AuthorityRole, string>> {
  return {
    Alcalde: 'role_alcalde',
    Gobernador: 'role_gobernador',
    Concejal: 'role_concejal',
    Asambleísta: 'role_asambleista',
  };
}

export async function getAllRoleIds(): Promise<string[]> {
  return ['role_alcalde', 'role_gobernador', 'role_concejal', 'role_asambleista'];
}

export function getRoleTypeSync(roleId: string): AuthorityRole | null {
  if (roleId === 'role_alcalde') return 'Alcalde';
  if (roleId === 'role_gobernador') return 'Gobernador';
  if (roleId === 'role_concejal') return 'Concejal';
  if (roleId === 'role_asambleista') return 'Asambleísta';
  return null;
}

export { CANDIDATE_PROPERTY };

