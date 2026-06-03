import axios from "axios";

const OSRM_URL = import.meta.env.VITE_OSRM_URL || "https://router.project-osrm.org";

/**
 * Fetch a driving route between two {lat, lng} points from OSRM.
 * Returns the route geometry as an array of [lat, lng] pairs ready for a
 * Leaflet <Polyline>, or [] if no route is available.
 */
export async function fetchRoute(origin, destination) {
  if (!origin || !destination) return [];

  const coords = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
  const url = `${OSRM_URL}/route/v1/driving/${coords}`;

  const response = await axios.get(url, {
    params: { overview: "full", geometries: "geojson" },
  });

  const data = response.data;
  if (data.code !== "Ok" || !data.routes?.length) return [];

  // OSRM returns GeoJSON coordinates as [lng, lat]; Leaflet expects [lat, lng].
  return data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
}
