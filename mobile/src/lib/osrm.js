import axios from "axios";
import { OSRM_URL } from "./config";

/**
 * Driving route between two { latitude, longitude } points.
 * Returns [{ latitude, longitude }] for a react-native-maps <Polyline>, or [].
 */
export async function fetchRoute(origin, destination) {
  if (!origin || !destination) return [];
  const coords = `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`;
  const url = `${OSRM_URL}/route/v1/driving/${coords}`;

  try {
    const { data } = await axios.get(url, {
      params: { overview: "full", geometries: "geojson" },
    });
    if (data.code !== "Ok" || !data.routes?.length) return [];
    return data.routes[0].geometry.coordinates.map(([longitude, latitude]) => ({
      latitude,
      longitude,
    }));
  } catch {
    return [];
  }
}
