import { useCallback } from 'react';
import { LEVEL_NAMES } from '../constants';
import type { MunicipalityFeature } from '../types';

export const useMapEventHandlers = (
  userDetectedFeatureId: string | null,
  onMunicipalitySelect?: (
    municipality: {
      name: string;
      department: string;
      entityId: string;
      hasEntity?: boolean;
    },
    isAutoDetect?: boolean
  ) => void,
  setSelectedFeatureId?: (id: string) => void,
  setHoveredFeatureId?: (id: string | null) => void
) => {
  const onEachFeature = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (feature: any, layer: any) => {
      if (!feature.properties) return;

      const props = feature.properties as MunicipalityFeature['properties'];
      const isUserLocation = props.id === userDetectedFeatureId;
      const levelName = LEVEL_NAMES[props.level] || 'Desconocido';
      const displayName = props.name || 'Área sin nombre';

      layer.on('click', () => {
        if (setSelectedFeatureId) {
          setSelectedFeatureId(props.id);
        }
        if (onMunicipalitySelect) {
          onMunicipalitySelect({
            name: props.name,
            department: props.department,
            entityId: props.id,
            hasEntity: props.hasEntity,
          });
        }
      });
      layer.on('mouseover', () => {
        if (setHoveredFeatureId) {
          setHoveredFeatureId(props.id);
        }
      });

      layer.on('mouseout', () => {
        if (setHoveredFeatureId) {
          setHoveredFeatureId(null);
        }
      });

      const tooltipContent = isUserLocation
        ? `<div style="font-size: 14px; padding: 4px;"><div style="margin-bottom: 4px;"><strong style="font-size: 15px;">${displayName}</strong></div><div style="color: #10b981; font-weight: 700; font-size: 12px;">TU UBICACIÓN ACTUAL</div><div style="color: #047857; font-size: 11px; margin-top: 2px;">${levelName}</div></div>`
        : `<div style="padding: 2px;"><strong style="font-size: 13px;">${displayName}</strong><br/><span style="font-size: 11px; color: #666;">${levelName}</span></div>`;

      layer.bindTooltip(tooltipContent, {
        sticky: true,
        permanent: isUserLocation,
        direction: isUserLocation ? 'top' : 'auto',
        className: isUserLocation ? 'user-location-tooltip' : '',
        offset: [0, isUserLocation ? -10 : 0],
      });
    },
    [
      onMunicipalitySelect,
      userDetectedFeatureId,
      setSelectedFeatureId,
      setHoveredFeatureId,
    ]
  );

  return { onEachFeature };
};
