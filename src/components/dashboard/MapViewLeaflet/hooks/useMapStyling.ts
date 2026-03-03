import { useCallback } from 'react';
import type { MunicipalityFeature } from '../types';

export const useMapStyling = (
  selectedFeatureId: string | null,
  userDetectedFeatureId: string | null,
  hoveredFeatureId: string | null,
  selectedDepartment?: string | null
) => {
  const getFeatureStyle = useCallback(
    (feature: MunicipalityFeature) => {
      const isUserLocation = feature.properties.id === userDetectedFeatureId;
      const isSelected = feature.properties.id === selectedFeatureId;
      const isHovered = feature.properties.id === hoveredFeatureId;
      const isInDepartment =
        !!selectedDepartment &&
        selectedDepartment !== 'Todos' &&
        feature.properties.department === selectedDepartment;

      if (isUserLocation) {
        return {
          fillColor: '#bf4a18',
          fillOpacity: 0.1,
          color: '#d88e77',
          weight: 2,
          opacity: 0.8,
          dashArray: '5, 5',
        };
      }

      if (isSelected) {
        return {
          fillColor: '#d88e77',
          fillOpacity: 0.55,
          color: '#bf4a18',
          weight: 3,
          opacity: 1,
        };
      }

      if (isInDepartment) {
        return {
          fillColor: isHovered ? '#60a5fa' : '#3b82f6',
          fillOpacity: isHovered ? 0.55 : 0.4,
          color: '#2563eb',
          weight: isHovered ? 2 : 1.5,
          opacity: 1,
        };
      }

      return {
        fillColor: '#bf4a18',
        fillOpacity: isHovered ? 0.3 : 0.05,
        color: isHovered ? '#d88e77' : '#bf4a18',
        weight: isHovered ? 2 : 1,
        opacity: 0.6,
      };
    },
    [
      selectedFeatureId,
      userDetectedFeatureId,
      hoveredFeatureId,
      selectedDepartment,
    ]
  );

  return { getFeatureStyle };
};
