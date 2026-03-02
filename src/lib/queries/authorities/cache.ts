import { databases, DATABASE_ID, COLLECTIONS, Query } from '../../appwrite';
import type { Entity } from '../types';
import type { AuthorityRole } from './types';
import { VALID_ROLES, CANDIDATE_PROPERTY } from './constants';

let roleIdsCache: Record<AuthorityRole, string> | null = null;
let allRoleIdsCache: string[] | null = null;
let roleIdToTypeCache: Map<string, AuthorityRole> | null = null;

export async function getRoleIds(): Promise<Record<AuthorityRole, string>> {
  if (roleIdsCache) return roleIdsCache;

  try {
    const response = await databases.listDocuments<Entity>(
      DATABASE_ID,
      COLLECTIONS.ENTITIES,
      [Query.equal('label', VALID_ROLES), Query.limit(15)]
    );

    const roles: Partial<Record<AuthorityRole, string>> = {};
    const allIds: string[] = [];
    const roleIdToType = new Map<string, AuthorityRole>();

    response.documents.forEach((doc) => {
      allIds.push(doc.$id);

      if (doc.label === 'Alcalde') {
        roles.Alcalde = doc.$id;
        roleIdToType.set(doc.$id, 'Alcalde');
      }
      if (doc.label === 'Gobernador') {
        roles.Gobernador = doc.$id;
        roleIdToType.set(doc.$id, 'Gobernador');
      }
      if (doc.label === 'Concejal' || doc.label === 'Conceales Municipales') {
        if (!roles.Concejal || doc.label === 'Conceales Municipales') {
          roles.Concejal = doc.$id;
        }
        roleIdToType.set(doc.$id, 'Concejal');
      }
      if (
        doc.label === 'Asambleísta' ||
        doc.label === 'Asambleista' ||
        doc.label === 'Asambleístas Departamentales por Territorio'
      ) {
        if (
          !roles.Asambleísta ||
          doc.label === 'Asambleístas Departamentales por Territorio'
        ) {
          roles.Asambleísta = doc.$id;
        }
        roleIdToType.set(doc.$id, 'Asambleísta');
      }
    });

    roleIdsCache = roles as Record<AuthorityRole, string>;
    allRoleIdsCache = allIds;
    roleIdToTypeCache = roleIdToType;

    return roleIdsCache;
  } catch (error) {
    console.error('Error fetching role IDs:', error);
    throw error;
  }
}

export async function getAllRoleIds(): Promise<string[]> {
  if (allRoleIdsCache) return allRoleIdsCache;
  await getRoleIds();
  return allRoleIdsCache || [];
}

export function getRoleTypeSync(roleId: string): AuthorityRole | null {
  return roleIdToTypeCache?.get(roleId) ?? null;
}

export { CANDIDATE_PROPERTY };
