import React from "react";
import useMapStore from "../store/useMapStore.js";
import RouteMap from "./RouteMap";

// Captain-side tracking map: shows pickup, destination and the route between them.
const LiveTrackingCaptain = () => {
  const location = useMapStore((state) => state.location);
  const destination = useMapStore((state) => state.destination);

  return <RouteMap location={location} destination={destination} />;
};

export default LiveTrackingCaptain;
