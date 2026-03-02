import { memo, useReducer, useEffect } from 'react';
import { useMap } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';
import { LatLngBounds } from 'leaflet';
import type { MunicipalityFeature } from '../types';

interface MapControllerProps {
  selectedFeatureId: string | null;
  features: MunicipalityFeature[];
  selectedDepartment?: string | null;
}

interface MapState {
  hasZoomed: boolean;
}

type MapAction = { type: 'SET_ZOOMED'; payload: boolean };

const mapReducer = (state: MapState, action: MapAction): MapState => {
  switch (action.type) {
    case 'SET_ZOOMED':
      return { ...state, hasZoomed: action.payload };
    default:
      return state;
  }
};

const MapController = memo(
  ({ selectedFeatureId, features, selectedDepartment }: MapControllerProps) => {
    const map = useMap();
    const [state, dispatch] = useReducer(mapReducer, { hasZoomed: false });
    const { hasZoomed } = state;

    useEffect(() => {
      if (!map) return;

      let count = 0;
      const intervalId = setInterval(() => {
        map.invalidateSize();
        count++;
        if (count >= 15) clearInterval(intervalId);
      }, 200);

      let observer: ResizeObserver | null = null;
      const container = map.getContainer();

      if (container) {
        observer = new ResizeObserver(() => {
          map.invalidateSize();
        });
        observer.observe(container);

        if (container.parentElement) {
          observer.observe(container.parentElement);
          if (container.parentElement.parentElement) {
            observer.observe(container.parentElement.parentElement);
          }
        }
      }

      const resizeHandle = () => map.invalidateSize();
      window.addEventListener('resize', resizeHandle);

      return () => {
        clearInterval(intervalId);
        window.removeEventListener('resize', resizeHandle);
        if (observer) {
          observer.disconnect();
        }
      };
    }, [map]);

    useEffect(() => {
      if (!map) return;

      if (selectedDepartment && selectedDepartment !== 'Todos') {
        const deptFeatures = features.filter(
          (f) => f.properties.department === selectedDepartment
        );
        if (deptFeatures.length === 0) return;

        const allCoords: LatLngExpression[] = deptFeatures.flatMap((f) =>
          f.geometry.coordinates[0].map(
            (coord) => [coord[1], coord[0]] as LatLngExpression
          )
        );

        if (allCoords.length === 0) return;

        const bounds = new LatLngBounds(allCoords);
        setTimeout(
          () => {
            map.fitBounds(bounds, { padding: [40, 40], duration: 1.2 });
            if (!hasZoomed) dispatch({ type: 'SET_ZOOMED', payload: true });
          },
          hasZoomed ? 0 : 300
        );

        return;
      }

      if (selectedFeatureId) {
        const feature = features.find(
          (f) => f.properties.id === selectedFeatureId
        );
        if (feature && feature.geometry.coordinates[0]) {
          const bounds = new LatLngBounds(
            feature.geometry.coordinates[0].map(
              (coord) => [coord[1], coord[0]] as LatLngExpression
            )
          );
          setTimeout(
            () => {
              map.fitBounds(bounds, {
                padding: [50, 50],
                maxZoom: 13,
                duration: hasZoomed ? 1 : 1.5,
              });
              if (!hasZoomed) dispatch({ type: 'SET_ZOOMED', payload: true });
            },
            hasZoomed ? 0 : 300
          );
        } else if (!hasZoomed) {
          dispatch({ type: 'SET_ZOOMED', payload: true });
        }
      } else if (hasZoomed) {
        map.flyTo([-16.5, -64.5], 5.5, { duration: 1.3 });
        dispatch({ type: 'SET_ZOOMED', payload: false });
      }
    }, [selectedDepartment, selectedFeatureId, features, map, hasZoomed]);

    return null;
  }
);

MapController.displayName = 'MapController';

export default MapController;
