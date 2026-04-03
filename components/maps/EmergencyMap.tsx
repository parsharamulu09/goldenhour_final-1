import React, { useMemo, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap
} from "react-leaflet";
import L, { LatLngExpression } from "leaflet";

/* ---------------- TYPES ---------------- */

export type LatLng = { lat: number; lng: number };

export type AmbulanceMarker = {
  id: string;
  lat: number;
  lng: number;
  label?: string;
};

export type HospitalMarker = {
  name: string;
  lat: number;
  lng: number;
  icuAvailable: boolean;
  recommended?: boolean;
};

export type PoliceUnitMarker = {
  id: string;
  lat: number;
  lng: number;
  label?: string;
};

type Props = {
  accident?: LatLng | null;
  ambulance?: AmbulanceMarker | null;
  hospitals?: HospitalMarker[];
  policeUnits?: PoliceUnitMarker[];
  showRouteLine?: boolean;
  className?: string;
};

/* ---------------- MAP RESIZER ---------------- */

function MapResizer() {
  const map = useMap();

  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize();
    }, 100);
  }, [map]);

  return null;
}

/* ---------------- ICON GENERATOR ---------------- */

function svgIcon(svg: string) {
  return L.icon({
    iconUrl: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    iconSize: [44, 44],
    iconAnchor: [22, 42],
    popupAnchor: [0, -40]
  });
}

/* ---------------- ICONS ---------------- */

const icons = {
  accident: svgIcon(`
<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44">
<path d="M22 42s14-12.2 14-24A14 14 0 0 0 8 18c0 11.8 14 24 14 24z" fill="#DC2626"/>
<circle cx="22" cy="18" r="6" fill="white"/>
</svg>
`),

  ambulance: svgIcon(`
<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44">
<path d="M22 42s14-12.2 14-24A14 14 0 0 0 8 18c0 11.8 14 24 14 24z" fill="#2563EB"/>
<rect x="13" y="14" width="18" height="12" rx="3" fill="white"/>
</svg>
`),

  hospital: svgIcon(`
<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44">
<path d="M22 42s14-12.2 14-24A14 14 0 0 0 8 18c0 11.8 14 24 14 24z" fill="#10B981"/>
<rect x="14" y="14" width="16" height="16" rx="3" fill="white"/>
</svg>
`),

  police: svgIcon(`
<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44">
<path d="M22 42s14-12.2 14-24A14 14 0 0 0 8 18c0 11.8 14 24 14 24z" fill="#111827"/>
</svg>
`)
};

/* ---------------- COMPONENT ---------------- */

export default function EmergencyMap({
  accident,
  ambulance,
  hospitals = [],
  policeUnits = [],
  showRouteLine = false,
  className
}: Props) {

  /* ---------- MAP CENTER ---------- */

  const center: LatLngExpression = useMemo(() => {
    if (accident) return [accident.lat, accident.lng];
    if (ambulance) return [ambulance.lat, ambulance.lng];
    if (hospitals.length) return [hospitals[0].lat, hospitals[0].lng];
    return [17.385, 78.486];
  }, [accident, ambulance, hospitals]);

  const zoom = 13;

  /* ---------- ROUTE LINE ---------- */

  const routeLine: LatLngExpression[] | null =
    showRouteLine && accident && ambulance
      ? [
          [ambulance.lat, ambulance.lng],
          [accident.lat, accident.lng]
        ]
      : null;

  /* ---------- RENDER ---------- */

  return (
    <div className={className}>
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={false}
        className="h-full w-full rounded-2xl overflow-hidden"
      >
        <MapResizer />

        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {routeLine && (
          <Polyline
            positions={routeLine}
            pathOptions={{ color: "#2563EB", weight: 4 }}
          />
        )}

        {accident && (
          <Marker position={[accident.lat, accident.lng]} icon={icons.accident}>
            <Popup>Accident Location</Popup>
          </Marker>
        )}

        {ambulance && (
          <Marker
            position={[ambulance.lat, ambulance.lng]}
            icon={icons.ambulance}
          >
            <Popup>{ambulance.label || ambulance.id}</Popup>
          </Marker>
        )}

        {hospitals.map((h) => (
          <Marker key={h.name} position={[h.lat, h.lng]} icon={icons.hospital}>
            <Popup>
              <b>{h.name}</b>
              <br />
              ICU: {h.icuAvailable ? "Available" : "Standby"}
            </Popup>
          </Marker>
        ))}

        {policeUnits.map((p) => (
          <Marker key={p.id} position={[p.lat, p.lng]} icon={icons.police}>
            <Popup>{p.label || p.id}</Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}