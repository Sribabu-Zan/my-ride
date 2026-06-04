import Constants from "expo-constants";

// Values come from app.json -> expo.extra, overridable per environment.
// Android emulator reaches the host machine via 10.0.2.2; iOS simulator uses
// localhost; a physical device must use your machine's LAN IP (set EXPO_PUBLIC_*).
const extra = Constants.expoConfig?.extra ?? {};

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || extra.apiBaseUrl || "http://10.0.2.2:4000";

export const OSRM_URL =
  process.env.EXPO_PUBLIC_OSRM_URL || extra.osrmUrl || "https://router.project-osrm.org";

export const TILE_URL =
  process.env.EXPO_PUBLIC_TILE_URL ||
  extra.tileUrl ||
  "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
