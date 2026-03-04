/**
 * LeafletMapUI.tsx
 *
 * This file contains ALL react-leaflet imports.
 * It is ONLY imported via React.lazy() from MapViewLeaflet.tsx,
 * so it is NEVER evaluated during SSR — safe with client:load.
 */
import React, { useEffect } from 'react';
import {
    MapContainer,
    TileLayer,
    GeoJSON,
    Marker,
    Popup,
    useMap,
} from 'react-leaflet';
import type { LatLngExpression, Icon, DivIcon, Layer } from 'leaflet';
import type { Feature } from 'geojson';
import type { MunicipalityFeature, MunicipalityGeoJSON } from './types';
import MapController from './components/MapController';

interface LeafletMapUIProps {
    center: LatLngExpression;
    zoom: number;
    geoJsonData: MunicipalityGeoJSON;
    getFeatureStyle: (feature: MunicipalityFeature) => object;
    onEachFeature: (feature: MunicipalityFeature, layer: Layer) => void;
    userLocation: { lat: number; lon: number } | null;
    leafletIcons: { default: Icon; userLocation: DivIcon } | null;
    selectedFeatureId: string | null;
    selectedEntityId?: string | null;
    selectedDepartment?: string | null;
}

function MapResizer() {
    const map = useMap();

    useEffect(() => {
        const timeouts = [50, 200, 500].map((ms) =>
            setTimeout(() => map.invalidateSize(), ms)
        );

        const container = map.getContainer();
        let raf = 0;
        const ro = new ResizeObserver(() => {
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(() => map.invalidateSize());
        });
        ro.observe(container);

        const onAfterSwap = () => {
            setTimeout(() => map.invalidateSize(), 0);
            setTimeout(() => map.invalidateSize(), 150);
        };
        document.addEventListener('astro:after-swap', onAfterSwap);

        return () => {
            timeouts.forEach(clearTimeout);
            cancelAnimationFrame(raf);
            ro.disconnect();
            document.removeEventListener('astro:after-swap', onAfterSwap);
        };
    }, [map]);

    return null;
}

export default function LeafletMapUI({
    center,
    zoom,
    geoJsonData,
    getFeatureStyle,
    onEachFeature,
    userLocation,
    leafletIcons,
    selectedFeatureId,
    selectedDepartment,
}: LeafletMapUIProps) {
    return (
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

            {geoJsonData && (
                <GeoJSON
                    key="municipal-polygons"
                    data={geoJsonData}
                    style={(feature) => getFeatureStyle(feature as MunicipalityFeature)}
                    onEachFeature={onEachFeature as (feature: Feature, layer: Layer) => void}
                />
            )}

            {userLocation && leafletIcons && (
                <Marker
                    position={[userLocation.lat, userLocation.lon]}
                    icon={leafletIcons.userLocation}
                >
                    <Popup>
                        <div className="text-center font-bold text-sm text-primary-green">
                            Tu ubicación
                        </div>
                    </Popup>
                </Marker>
            )}

            <MapController
                selectedFeatureId={selectedFeatureId}
                features={geoJsonData.features}
                selectedDepartment={selectedDepartment}
            />
        </MapContainer>
    );
}
