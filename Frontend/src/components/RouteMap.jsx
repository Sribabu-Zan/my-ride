import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import "../utils/leafletSetup";
import { fetchRoute } from "../utils/osrm";

// Keeps the map framed on the available points. react-leaflet's `center` prop is
// only read on mount, so view updates have to go through the map instance.
function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    const valid = points.filter(Boolean);
    if (valid.length === 0) return;
    if (valid.length === 1) {
      map.setView([valid[0].lat, valid[0].lng], 14);
    } else {
      map.fitBounds(
        valid.map((p) => [p.lat, p.lng]),
        { padding: [50, 50] }
      );
    }
  }, [points, map]);
  return null;
}

/**
 * Renders an OpenStreetMap view with markers for `location` (and `destination`,
 * if present) and draws the driving route between them via OSRM.
 * Both coordinates use the `{ lat, lng }` shape held in the map store.
 */
const RouteMap = ({ location, destination }) => {
  const [route, setRoute] = useState([]);

  useEffect(() => {
    let active = true;
    if (location && destination) {
      fetchRoute(location, destination)
        .then((coords) => active && setRoute(coords))
        .catch(() => active && setRoute([]));
    } else {
      setRoute([]);
    }
    return () => {
      active = false;
    };
  }, [location, destination]);

  if (!location) return null;

  return (
    <MapContainer
      center={[location.lat, location.lng]}
      zoom={13}
      style={{ width: "100%", height: "100%" }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <Marker position={[location.lat, location.lng]} />
      {destination && <Marker position={[destination.lat, destination.lng]} />}
      {route.length > 0 && <Polyline positions={route} />}
      <FitBounds points={[location, destination]} />
    </MapContainer>
  );
};

export default RouteMap;
