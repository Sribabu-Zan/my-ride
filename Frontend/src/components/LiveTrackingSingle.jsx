import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import "../utils/leafletSetup";
import useMapStore from "../store/useMapStore.js";

const DEFAULT_LOCATION = { lat: 28.6139, lng: 77.209 }; // New Delhi fallback

// Keeps the view centered on the user as their location updates.
function Recenter({ location }) {
  const map = useMap();
  useEffect(() => {
    if (location) map.setView([location.lat, location.lng], map.getZoom());
  }, [location, map]);
  return null;
}

// Shows only the current user's position on an OpenStreetMap view.
const LiveTrackingSingle = () => {
  const { location, setLocation } = useMapStore();

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {
        setLocation(DEFAULT_LOCATION);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [setLocation]);

  if (!location) return null;

  return (
    <MapContainer
      center={[location.lat, location.lng]}
      zoom={14}
      style={{ width: "100%", height: "100%" }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <Marker position={[location.lat, location.lng]} />
      <Recenter location={location} />
    </MapContainer>
  );
};

export default LiveTrackingSingle;
