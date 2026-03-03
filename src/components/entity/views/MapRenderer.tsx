import React, { useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import type { GeoJsonObject } from 'geojson';
import L from 'leaflet';

interface MapRendererProps {
  geoData: GeoJsonObject;
}

function FitBounds({ data }: { data: GeoJsonObject }) {
  const map = useMap();
  useEffect(() => {
    if (!data) return;

    const handleResize = () => {
      map.invalidateSize();
    };

    try {
      map.invalidateSize();
      const layer = L.geoJSON(data);
      const bounds = layer.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [20, 20], maxZoom: 10 });
      }
    } catch (e) {
      console.error('Error setting map bounds', e);
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      const rafId = requestAnimationFrame(() => {
        map.invalidateSize();
      });

      return () => {
        window.removeEventListener('resize', handleResize);
        cancelAnimationFrame(rafId);
      };
    }
  }, [data, map]);
  return null;
}

export default function MapRenderer({ geoData }: MapRendererProps) {
  console.log('[MapRenderer] Rendering with geoData:', geoData);

  return (
    <MapContainer
      zoom={5.5}
      center={[-16.5, -64.5]}
      style={{ width: '100%', height: '100%', background: 'transparent' }}
      zoomControl={false}
      scrollWheelZoom={false}
      dragging={false}
      doubleClickZoom={false}
      className="rounded-[3rem] bg-transparent"
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
      />
      <GeoJSON
        data={geoData}
        style={() => ({
          color: '#fffcdc',
          weight: 2,
          fillColor: '#fffcdc',
          fillOpacity: 0.15,
        })}
      />
      <FitBounds data={geoData} />
    </MapContainer>
  );
}
