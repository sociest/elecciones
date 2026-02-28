import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Marker,
  Popup,
  useMap,
} from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, RotateCcw } from 'lucide-react';
import L from 'leaflet';
import iconUrl from 'leaflet/dist/images/marker-icon.png?url';
import iconShadowUrl from 'leaflet/dist/images/marker-shadow.png?url';

const DefaultIcon = L.icon({
  iconUrl: iconUrl,
  shadowUrl: iconShadowUrl,
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const UserLocationIcon = L.divIcon({
  className: 'custom-user-marker',
  html: '<div style="background-color: #10b981; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

// Import hooks and utilities
import { useMapGeometry } from './hooks/useMapGeometry';
import { useUserLocationDetection } from './hooks/useUserLocationDetection';
import { useMapStyling } from './hooks/useMapStyling';
import { useMapEventHandlers } from './hooks/useMapEventHandlers';
import { pointInPolygon, saveMunicipalityToStorage } from './utils/geomHelpers';
import { LEVEL_NAMES } from './constants';
import MapController from './components/MapController';
import type { MapViewProps } from './types';

function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const timeouts = [10, 50, 200, 500, 1000].map((ms) =>
      setTimeout(() => {
        map.invalidateSize();
      }, ms)
    );
    return () => timeouts.forEach(clearTimeout);
  }, [map]);
  return null;
}

const MapViewLeaflet: React.FC<MapViewProps> = ({
  onMunicipalitySelect,
  onMapReset,
  selectedEntityId,
}) => {
  const [selectionState, setSelectionState] = useState<{
    selectedFeatureId: string | null;
    userDetectedFeatureId: string | null;
    userDetectedFeatureName: string | null;
  }>({
    selectedFeatureId: selectedEntityId || null,
    userDetectedFeatureId: null,
    userDetectedFeatureName: null,
  });
  const [hoveredFeatureId, setHoveredFeatureId] = useState<string | null>(null);

  const { geoJsonData, loading, error, ready } = useMapGeometry();
  const userLocation = useUserLocationDetection();
  const { selectedFeatureId, userDetectedFeatureId, userDetectedFeatureName } =
    selectionState;
  const { getFeatureStyle } = useMapStyling(
    selectedFeatureId,
    userDetectedFeatureId,
    hoveredFeatureId
  );
  const { onEachFeature } = useMapEventHandlers(
    userDetectedFeatureId,
    onMunicipalitySelect,
    (id: string | null) =>
      setSelectionState((prev) => ({ ...prev, selectedFeatureId: id })),
    setHoveredFeatureId
  );

  useEffect(() => {
    if (userLocation && geoJsonData && !userDetectedFeatureId) {
      const detected = geoJsonData.features.find((feature) => {
        return pointInPolygon(
          [userLocation.lon, userLocation.lat],
          feature.geometry.coordinates
        );
      });

      if (detected) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSelectionState((prev) => ({
          ...prev,
          userDetectedFeatureId: detected.properties.id,
          userDetectedFeatureName: detected.properties.name,
          selectedFeatureId: detected.properties.id,
        }));

        const levelName =
          LEVEL_NAMES[detected.properties.level] || 'Desconocido';

        if (onMunicipalitySelect) {
          onMunicipalitySelect(
            {
              name: detected.properties.name,
              department: detected.properties.department,
              entityId: detected.properties.id,
              hasEntity: detected.properties.hasEntity,
            },
            true
          );
        }

        saveMunicipalityToStorage(() => {
          localStorage.setItem(
            'detected_municipality',
            JSON.stringify({
              name: detected.properties.name,
              department: detected.properties.department,
              entityId: detected.properties.id,
              level: detected.properties.level,
              levelName: levelName,
            })
          );
        });
      }
    }
  }, [userLocation, geoJsonData, userDetectedFeatureId, onMunicipalitySelect]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectionState((prev) => ({
      ...prev,
      selectedFeatureId: selectedEntityId || null,
    }));
  }, [selectedEntityId]);

  const handleResetMap = useCallback(() => {
    setSelectionState((prev) => ({ ...prev, selectedFeatureId: null }));
    if (onMapReset) {
      onMapReset();
    } else if (onMunicipalitySelect) {
      onMunicipalitySelect(
        {
          name: '',
          department: '',
          entityId: '',
        },
        true
      );
    }
  }, [onMunicipalitySelect, onMapReset]);

  const { center, zoom } = useMemo<{
    center: LatLngExpression;
    zoom: number;
  }>(() => {
    // Siempre mostrar mapa completo de Bolivia por defecto según requerimiento
    return { center: [-16.5, -64.5], zoom: 5.5 };
  }, []);

  if (loading || !ready) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black rounded-[2.5rem]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-sm text-gray-400 font-medium">
            Cargando minimapa...
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Preparando polígonos municipales
          </p>
        </div>
      </div>
    );
  }

  if (error || !geoJsonData) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black rounded-[2.5rem]">
        <div className="text-center p-8">
          <p className="text-gray-400 font-bold mb-2">Mapa no disponible</p>
          <p className="text-sm text-gray-500">
            {error || 'No se pudieron cargar los datos'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 rounded-[2.5rem] overflow-hidden">
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
        className="rounded-[2.5rem]"
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <MapResizer />

        {geoJsonData && ready && (
          <GeoJSON
            key="municipal-polygons"
            data={geoJsonData}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            style={(feature) => getFeatureStyle(feature as any)}
            onEachFeature={onEachFeature}
          />
        )}

        {userLocation && (
          <Marker
            position={[userLocation.lat, userLocation.lon]}
            icon={UserLocationIcon}
          >
            <Popup>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 font-bold text-sm text-emerald-500">
                  <MapPin size={16} />
                  <span>Tu ubicación</span>
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        <MapController
          selectedFeatureId={selectedFeatureId}
          features={geoJsonData.features}
        />
      </MapContainer>

      {/* Botón Reiniciar Mapa */}
      <div className="absolute top-4 right-4 z-1000">
        <button
          onClick={handleResetMap}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-700/90 text-white rounded-xl shadow-lg hover:bg-emerald-600 transition-colors backdrop-blur-md border border-white/10 text-xs font-bold"
        >
          <RotateCcw size={16} />
          <span>Bolivia</span>
        </button>
      </div>

      {/* User Location Banner */}
      {userLocation && userDetectedFeatureName && (
        <div className="absolute top-4 left-4 right-4 bg-emerald-700/90 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl z-1000 animate-fadeIn border border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <MapPin size={20} className="text-white" />
              </div>
              <div>
                <p className="text-xs font-semibold opacity-90">
                  Tu ubicación detectada
                </p>
                <p className="text-lg font-black">{userDetectedFeatureName}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-black/80 backdrop-blur-sm border border-white/5 rounded-xl p-3 shadow-xl z-999">
        <p className="text-xs font-bold mb-2 text-gray-300">
          Niveles Administrativos
        </p>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded border border-emerald-500/30"
              style={{ backgroundColor: '#10b981', opacity: 0.6 }}
            />
            <span className="text-xs text-gray-400">Municipio</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(MapViewLeaflet);
