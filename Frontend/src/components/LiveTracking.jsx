import React from "react";
import useMapStore from "../store/useMapStore.js";
import RouteMap from "./RouteMap";

// User-side tracking map: shows pickup, destination and the route between them.
const LiveTracking = () => {
  const location = useMapStore((state) => state.location);
  const destination = useMapStore((state) => state.destination);

  return <RouteMap location={location} destination={destination} />;
};

export default LiveTracking;
