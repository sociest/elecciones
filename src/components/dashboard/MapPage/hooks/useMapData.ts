import { useReducer, useEffect } from 'react';
import { fetchEntitiesFiltered, DEPARTMENT_IDS } from '../../../../lib/queries';
import type { Entity } from '../../../../lib/queries';

type MapDataState = {
  entities: Entity[];
  loading: boolean;
  mapZoomTarget: string | null;
};

type MapDataAction =
  | { type: 'FETCH_START' }
  | {
      type: 'FETCH_SUCCESS';
      payload: { entities: Entity[]; mapZoomTarget: string | null };
    }
  | { type: 'FETCH_ERROR' };

const mapDataReducer = (
  state: MapDataState,
  action: MapDataAction
): MapDataState => {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true };
    case 'FETCH_SUCCESS':
      return {
        entities: action.payload.entities,
        loading: false,
        mapZoomTarget: action.payload.mapZoomTarget,
      };
    case 'FETCH_ERROR':
      return { ...state, loading: false };
    default:
      return state;
  }
};

export const useMapData = (
  selectedDepartment: string,
  selectedType: string,
  debouncedSearch: string,
  activeMunicipalityId: string | null = null
) => {
  const [state, dispatch] = useReducer(mapDataReducer, {
    entities: [],
    loading: true,
    mapZoomTarget: null,
  });

  useEffect(() => {
    async function loadData() {
      try {
        dispatch({ type: 'FETCH_START' });

        const entitiesData = await fetchEntitiesFiltered({
          limit: selectedDepartment !== 'Todos' ? 200 : 100,
          entityType: selectedType,
          department: selectedDepartment,
          search: debouncedSearch || undefined,
        });

        let newZoomTarget: string | null = null;
        if (selectedDepartment !== 'Todos') {
          const deptId =
            DEPARTMENT_IDS[selectedDepartment as keyof typeof DEPARTMENT_IDS];
          if (deptId) {
            newZoomTarget = deptId;
          }
        } else if (
          entitiesData.documents.length > 0 &&
          entitiesData.documents.length <= 10 &&
          debouncedSearch
        ) {
          newZoomTarget = entitiesData.documents[0].$id;
        }

        let results = entitiesData.documents;

        if (activeMunicipalityId) {
          results = results.filter(
            (entity) => entity.$id !== activeMunicipalityId
          );
        }

        dispatch({
          type: 'FETCH_SUCCESS',
          payload: { entities: results, mapZoomTarget: newZoomTarget },
        });
      } catch (error) {
        console.error('Error loading entities:', error);
        dispatch({ type: 'FETCH_ERROR' });
      }
    }
    loadData();
  }, [selectedDepartment, selectedType, debouncedSearch, activeMunicipalityId]);

  return state;
};
