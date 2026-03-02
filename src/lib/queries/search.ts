export {
  QUICK_SEARCH_TYPE_IDS,
  QUICK_SEARCH_INSTITUTION_LABELS,
} from './search/constants';

export {
  searchCache,
  quickSearchCache,
  quickSearchTypeCache,
  deptMunicipalityCache,
  loadMunicipalityCache,
  CACHE_DURATION,
} from './search/cache';

export {
  normalizeText,
  calculateQuickSearchScore,
  fetchEntitiesByTypeId,
  fetchEntitiesByLabels,
  calculateSearchScore,
  performClientSideSearch,
} from './search/helpers';

export {
  fetchQuickSearchEntities,
  fetchEntitiesFiltered,
  getEntitiesByType,
  getEntitiesByDepartment,
} from './search/queries';
