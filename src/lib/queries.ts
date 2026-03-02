// Re-export commonly used types
export type { Entity, Authority, Claim } from './queries/types';

// Re-export selected constants (without low-level IDs that are internal)
export { DEPARTMENT_IDS } from './queries/constants';

// Re-export search functions
export {
  fetchQuickSearchEntities,
  fetchEntitiesFiltered,
  getEntitiesByType,
  getEntitiesByDepartment,
} from './queries/search';

// Re-export entity functions
export {
  fetchEntityById,
  getEntityById,
  getEntityCount,
  getClaimCount,
  getPropertyCount,
  fetchEntityDetails,
} from './queries/entities';

// Re-export polygon functions
export {
  fetchPolygons,
  findMunicipalityByCoordinates,
} from './queries/polygons';

// Re-export administrative functions
export {
  fetchAdministrativeLevels,
  searchMunicipalities,
} from './queries/administrative';

// Re-export authority functions
export {
  getAuthoritiesByMunicipality,
  getAuthoritiesByMunicipalityStreaming,
  fetchAuthorities,
  getPersonAndPartyIdsForDepartment,
} from './queries/authorities';
