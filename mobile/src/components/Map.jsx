import React, { useEffect, useRef, useState } from "react";
import MapView, { Marker, Polyline, UrlTile, PROVIDER_DEFAULT } from "react-native-maps";
import { TILE_URL } from "../lib/config";
import { fetchRoute } from "../lib/osrm";

const DELHI = { latitude: 28.6139, longitude: 77.209 };

/**
 * OSM-tiled map. Pass `location` for a single marker, add `destination` +
 * `showRoute` to draw the OSRM route and fit both points.
 * Coordinates are { latitude, longitude }.
 */
export default function Map({ location, destination, showRoute = false }) {
  const mapRef = useRef(null);
  const [route, setRoute] = useState([]);
  const center = location || DELHI;

  useEffect(() => {
    let active = true;
    if (showRoute && location && destination) {
      fetchRoute(location, destination).then((r) => active && setRoute(r));
    } else {
      setRoute([]);
    }
    return () => {
      active = false;
    };
  }, [location, destination, showRoute]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (showRoute && location && destination) {
      map.fitToCoordinates([location, destination], {
        edgePadding: { top: 80, right: 60, bottom: 80, left: 60 },
        animated: true,
      });
    } else if (location) {
      map.animateToRegion(
        { ...location, latitudeDelta: 0.04, longitudeDelta: 0.04 },
        500
      );
    }
  }, [location, destination, showRoute]);

  return (
    <MapView
      ref={mapRef}
      provider={PROVIDER_DEFAULT}
      style={{ flex: 1 }}
      initialRegion={{ ...center, latitudeDelta: 0.05, longitudeDelta: 0.05 }}
      showsUserLocation
    >
      {/* OSM raster tiles overlaid on the base map (keyless). */}
      <UrlTile urlTemplate={TILE_URL} maximumZ={19} flipY={false} zIndex={-1} />
      {location && <Marker coordinate={location} title="Pickup" />}
      {destination && <Marker coordinate={destination} title="Drop" pinColor="green" />}
      {route.length > 0 && (
        <Polyline coordinates={route} strokeWidth={4} strokeColor="#1d4ed8" />
      )}
    </MapView>
  );
}
