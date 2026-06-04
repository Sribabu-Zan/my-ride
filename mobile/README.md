# Uber Clone — Mobile (React Native / Expo)

React Native port of the web frontend. Same backend, same socket events, same
maps stack (OSM tiles + OSRM routing + Nominatim geocoding via the backend).
Supports **local, inter-city and inter-state** trips.

## Stack
- **Expo (SDK 51)** + React Native 0.74
- **NativeWind** (Tailwind classes) for UI parity with the web app
- **@react-navigation/native-stack** for navigation
- **react-native-maps** + `UrlTile` for OSM tiles, `Polyline` for the OSRM route
- **expo-location** (GPS / current location), **expo-secure-store** (JWT)
- **axios** (shared instance + interceptors), **socket.io-client**, **zustand**

## Project layout
```
src/
  lib/        api.js · socket.js · storage.js · osrm.js · config.js
  store/      useMapStore.js
  context/    UserContext · CaptainContext · SocketContext
  navigation/ RootNavigator.jsx
  components/  Button · TextField · Map · OtpInput
  screens/
    auth/     Start · UserLogin · UserSignup · CaptainLogin · CaptainSignup
    rider/    Home · Riding · RideEnd
    captain/  CaptainHome · CaptainRiding · CaptainRideEnd
```

## Setup
```bash
cd mobile
npm install
npm start          # then press a / i, or scan the QR with Expo Go
```

## Pointing at the backend
Set in `app.json → expo.extra.apiBaseUrl` (or env `EXPO_PUBLIC_API_BASE_URL`):

| Where you run | API base URL |
|---|---|
| Android emulator | `http://10.0.2.2:4000` (default) |
| iOS simulator | `http://localhost:4000` |
| Physical phone (Expo Go) | `http://<your-PC-LAN-IP>:4000` |

The backend must be reachable from the device and CORS-open (it already is).

## Maps note (important)
Tiles are keyless OpenStreetMap via `<UrlTile>`. However, **`react-native-maps`
on Android initializes the Google Maps SDK**, which needs a *free* Maps SDK key:

1. Get a key in Google Cloud (Maps SDK for Android) — free tier, no billing for SDK init.
2. Add to `app.json`:
   ```json
   "android": { "config": { "googleMaps": { "apiKey": "YOUR_KEY" } } }
   ```
3. Build a dev client (`npx expo run:android`) — the Google provider isn't available in plain Expo Go on Android.

**iOS uses Apple Maps and needs no key** — it runs in Expo Go as-is.
For a fully keyless cross-platform map, swap to a WebView+Leaflet or MapLibre later
(the OSRM/tile config is already abstracted in `src/lib/config.js`).

## Trip types
Trip classification (local / inter-city / inter-state) is computed by the backend
`/rides/get-fare` from the pickup/drop city & state, and drives pricing
(per-km, driver allowance, inter-state tax, toll estimate). Inter-city/inter-state
trips expose a **Ride now / Schedule** toggle on the Home screen.
