import React, {
  useReducer,
  useEffect,
  useCallback,
  useMemo,
  memo,
  lazy,
  Suspense,
} from 'react';

import type { LatLngExpression, Icon, DivIcon } from 'leaflet';
import { MapPin, RotateCcw } from 'lucide-react';

import { useMapGeometry } from './hooks/useMapGeometry';
import { useUserLocationDetection } from './hooks/useUserLocationDetection';
import { useMapStyling } from './hooks/useMapStyling';
import { useMapEventHandlers } from './hooks/useMapEventHandlers';
import { pointInPolygon, saveMunicipalityToStorage } from './utils/geomHelpers';
import { LEVEL_NAMES } from './constants';
import type { MapViewProps } from './types';

// --- Lazy-load the entire Leaflet map UI so it never evaluates during SSR ---
const LeafletMapUI = lazy(() => import('./LeafletMapUI'));

type MapViewState = {
  selectedFeatureId: string | null;
  userDetectedFeatureId: string | null;
  userDetectedFeatureName: string | null;
  hoveredFeatureId: string | null;
};

type MapViewAction =
  | { type: 'SET_SELECTED_FEATURE'; payload: string | null }
  | { type: 'SET_HOVERED_FEATURE'; payload: string | null }
  | {
      type: 'SET_USER_DETECTED_FEATURE';
      payload: { id: string | null; name: string | null };
    }
  | { type: 'RESET_MAP' };

const mapReducer = (
  state: MapViewState,
  action: MapViewAction
): MapViewState => {
  switch (action.type) {
    case 'SET_SELECTED_FEATURE':
      return { ...state, selectedFeatureId: action.payload };
    case 'SET_HOVERED_FEATURE':
      return { ...state, hoveredFeatureId: action.payload };
    case 'SET_USER_DETECTED_FEATURE':
      return {
        ...state,
        userDetectedFeatureId: action.payload.id,
        userDetectedFeatureName: action.payload.name,
        selectedFeatureId: action.payload.id || state.selectedFeatureId,
      };
    case 'RESET_MAP':
      return { ...state, selectedFeatureId: null };
    default:
      return state;
  }
};

const MapViewLeaflet: React.FC<MapViewProps> = ({
  onMunicipalitySelect,
  onMapReset,
  selectedEntityId,
  selectedDepartment,
}) => {
  const [state, dispatch] = useReducer(mapReducer, {
    selectedFeatureId: selectedEntityId || null,
    userDetectedFeatureId: null,
    userDetectedFeatureName: null,
    hoveredFeatureId: null,
  });

  // Leaflet icon state — initialized client-side only via useEffect.
  // useEffect never runs during SSR, so this is safe with client:load.
  const [leafletIcons, setLeafletIcons] = React.useState<{
    default: Icon;
    userLocation: DivIcon;
  } | null>(null);

  useEffect(() => {
    // Dynamic import ensures leaflet (and its `window` access) only loads in browser
    import('leaflet').then((L) => {
      import('leaflet/dist/images/marker-icon.png?url').then(
        ({ default: iconUrl }) => {
          import('leaflet/dist/images/marker-shadow.png?url').then(
            ({ default: iconShadowUrl }) => {
              const defaultIcon = L.default.icon({
                iconUrl,
                shadowUrl: iconShadowUrl,
                iconAnchor: [12, 41],
              });
              L.default.Marker.prototype.options.icon = defaultIcon;
              const userLocationIcon = L.default.divIcon({
                className: 'custom-user-marker',
                html: '<div style="background-color: #10b981; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>',
                iconSize: [20, 20],
                iconAnchor: [10, 10],
              });
              setLeafletIcons({
                default: defaultIcon,
                userLocation: userLocationIcon,
              });
            }
          );
        }
      );
    });
  }, []);

  const { geoJsonData, loading, error, ready } = useMapGeometry();
  const userLocation = useUserLocationDetection();
  const {
    selectedFeatureId,
    userDetectedFeatureId,
    userDetectedFeatureName,
    hoveredFeatureId,
  } = state;
  const { getFeatureStyle } = useMapStyling(
    selectedFeatureId,
    userDetectedFeatureId,
    hoveredFeatureId,
    selectedDepartment
  );
  const { onEachFeature } = useMapEventHandlers(
    userDetectedFeatureId,
    onMunicipalitySelect,
    (id: string | null) =>
      dispatch({ type: 'SET_SELECTED_FEATURE', payload: id }),
    (id: string | null) =>
      dispatch({ type: 'SET_HOVERED_FEATURE', payload: id })
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
        queueMicrotask(() => {
          dispatch({
            type: 'SET_USER_DETECTED_FEATURE',
            payload: {
              id: detected.properties.id,
              name: detected.properties.name,
            },
          });
        });

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
    const id = setTimeout(() => {
      dispatch({
        type: 'SET_SELECTED_FEATURE',
        payload: selectedEntityId || null,
      });
    }, 0);
    return () => clearTimeout(id);
  }, [selectedEntityId]);

  const handleResetMap = useCallback(() => {
    dispatch({ type: 'RESET_MAP' });
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
    return { center: [-16.5, -64.5], zoom: 5.5 };
  }, []);

  if (loading || !ready) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black rounded-[2.5rem]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-sm text-gray-200 font-medium">
            Cargando minimapa...
          </p>
          <p className="text-xs text-gray-300 mt-2">
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
          <p className="text-gray-200 font-bold mb-2">Mapa no disponible</p>
          <p className="text-sm text-gray-300">
            {error || 'No se pudieron cargar los datos'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 rounded-[2.5rem] overflow-hidden">
      {/* LeafletMapUI is lazy-loaded — react-leaflet never runs during SSR */}
      <Suspense
        fallback={
          <div className="absolute inset-0 flex items-center justify-center bg-black rounded-[2.5rem]">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500" />
          </div>
        }
      >
        <LeafletMapUI
          center={center}
          zoom={zoom}
          geoJsonData={geoJsonData}
          getFeatureStyle={getFeatureStyle}
          onEachFeature={onEachFeature}
          userLocation={userLocation}
          leafletIcons={leafletIcons}
          selectedFeatureId={selectedFeatureId}
          selectedEntityId={selectedEntityId}
          selectedDepartment={selectedDepartment}
        />
      </Suspense>

      {userLocation && userDetectedFeatureName && (
        <div className="absolute top-4 left-4 right-4 bg-primary-green/90 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl z-[1000] animate-fadeIn border border-white/10">
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

      <div className="absolute top-4 right-4 z-[1000]">
        <button
          onClick={handleResetMap}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-700/90 text-white rounded-xl shadow-lg hover:bg-emerald-600 transition-colors backdrop-blur-md border border-white/10 text-xs font-bold"
        >
          <RotateCcw size={16} />
          <span>Bolivia</span>
        </button>
      </div>

      <div className="absolute bottom-4 left-4 bg-black/80 backdrop-blur-sm border border-white/5 rounded-xl p-3 shadow-xl z-[999]">
        <p className="text-xs font-bold mb-2 text-gray-200">
          Niveles Administrativos
        </p>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded border border-emerald-500/30"
              style={{ backgroundColor: '#bf4a18', opacity: 0.6 }}
            />
            <span className="text-xs text-gray-200">Municipio</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(MapViewLeaflet);
