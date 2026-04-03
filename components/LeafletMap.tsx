// components/LeafletMap.tsx
'use client';

import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

type Location = { lat: number; lng: number };

type Props = {
  accident?: Location;
  ambulance?: Location;
  hospitals?: Location[];
  className?: string;
};

// Fix Leaflet icon paths
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const LeafletMap: React.FC<Props> = ({
  accident,
  ambulance,
  hospitals = [],
  className = 'w-full h-[300px] md:h-[500px] rounded-xl overflow-hidden',
}) => {
  const center: [number, number] =
    accident
      ? [accident.lat, accident.lng]
      : ambulance
      ? [ambulance.lat, ambulance.lng]
      : [20.5937, 78.9629]; // fallback

  return (
    <div className={className}>
      <MapContainer center={center} zoom={13} className="h-full w-full" scrollWheelZoom>
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {accident && (
          <Marker position={[accident.lat, accident.lng]}>
            <Popup>Accident Location</Popup>
          </Marker>
        )}

        {ambulance && (
          <Marker position={[ambulance.lat, ambulance.lng]}>
            <Popup>Ambulance</Popup>
          </Marker>
        )}

        {hospitals.map((h, i) => (
          <Marker key={i} position={[h.lat, h.lng]}>
            <Popup>Hospital #{i + 1}</Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default LeafletMap;