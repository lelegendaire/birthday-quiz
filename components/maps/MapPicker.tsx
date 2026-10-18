"use client";

import {
  MapContainer,
  TileLayer,
  useMapEvents,
  CircleMarker,
} from "react-leaflet";

type Point = { lat: number; lng: number };
type Props = {
  value: Point | null;
  onChange?: (point: Point) => void;
  disabled?: boolean;
  center?: [number, number];
  zoom?: number;
  markerColor?: string;
};

function ClickHandler({ onChange, disabled }: { onChange?: (point: Point) => void; disabled?: boolean }) {
  useMapEvents({
    click(event) {
      if (!disabled && onChange) onChange({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
  });
  return null;
}

export default function MapPicker({ value, onChange, disabled = false, center = [20, 0], zoom = 2, markerColor = "#facc15" }: Props) {
  const mapCenter: [number, number] = value ? [value.lat, value.lng] : center;
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10">
      <MapContainer center={mapCenter} zoom={value ? Math.max(zoom, 5) : zoom} scrollWheelZoom className="h-90 w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        <ClickHandler onChange={onChange} disabled={disabled} />
        {value && <CircleMarker center={[value.lat, value.lng]} radius={9} pathOptions={{ color: "#ffffff", weight: 3, fillColor: markerColor, fillOpacity: 1 }} />}
      </MapContainer>
    </div>
  );
}
