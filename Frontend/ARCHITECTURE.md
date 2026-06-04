# Frontend Architecture & Functionality (Web)

This document describes how the **current React web frontend** is designed and what
it does. It is the reference for the planned React Native port.

---

## 1. Tech stack

| Concern | Library |
|---|---|
| Framework | **React 18** (function components + hooks) |
| Build tool | **Vite 6** |
| Routing | **react-router-dom v7** |
| Styling | **Tailwind CSS 3** + **flowbite / flowbite-react** components |
| Animation | **GSAP** (`@gsap/react` `useGSAP`) — slide-up panels |
| Local app state | **Zustand** (`useMapStore`) + **React Context** (user, captain, socket) |
| HTTP | **axios** (per-call, no shared instance) |
| Realtime | **socket.io-client** |
| Maps | **Leaflet + react-leaflet** (OSM tiles, OSRM routing) |
| Toasts | **react-hot-toast** |
| Icons | **remixicon**, **react-icons** |

Two user types share one app: **User (rider)** and **Captain (driver)**.

---

## 2. Directory layout

```
src/
├── main.jsx                 # Entry; mounts provider tree + Router
├── App.jsx                  # Route table + <Toaster/>
├── index.css / App.css      # Tailwind + custom keyframe CSS
├── context/
│   ├── UserContext.jsx      # { user, setUser }
│   ├── CaptainContext.jsx   # { captain, setCaptain, isLoading, error, ... }
│   └── SocketContext.jsx    # { socket } — single socket.io connection
├── store/
│   └── useMapStore.js       # zustand: { location, destination, setters }
├── hooks/
│   └── useDebouncedFunction.jsx
├── utils/
│   ├── leafletSetup.js      # Leaflet CSS + marker-icon fix
│   └── osrm.js              # fetchRoute() → polyline coords
├── pages/                   # Route-level screens
└── components/              # Reusable UI + the map components
```

---

## 3. Provider tree & app bootstrap

`main.jsx` wraps the app in nested providers (outermost → innermost):

```
<CaptainContext>
  <UserContext>
    <SocketProvider>      // opens socket.io to VITE_BASE_URL at module load
      <BrowserRouter>
        <App />
```

- **`SocketContext`** creates **one** socket connection (`io(VITE_BASE_URL)`) at module
  scope and shares it via context. Logs connect/disconnect.
- **`UserContext`** holds the logged-in rider `{ email, fullName{...} }`.
- **`CaptainContext`** holds the logged-in captain plus `isLoading`/`error` flags.

---

## 4. Routing map (`App.jsx`)

| Path | Screen | Protected |
|---|---|---|
| `/` | `Start` (landing/CTA) | no |
| `/login`, `/signup` | User auth | no |
| `/captain-login`, `/captain-signup` | Captain auth | no |
| `/home` | `Home` (rider main) | **UserProtectWrapper** |
| `/user/logout` | `UserLogout` | UserProtectWrapper |
| `/captain-home` | `CaptainHome` (driver main) | **CaptainProtectWrapper** |
| `/riding` | `Riding` (rider in-trip) | no* |
| `/captain-riding` | `CaptainRiding` (driver in-trip) | no* |
| `/user-end`, `/captain-end` | trip-complete screens | no* |
| `/*` | `PageNotFound` | no |

\* These rely on navigation `state` (ride object) rather than a route guard — a
known gap (they're publicly reachable but useless without ride state).

---

## 5. Authentication & session

- **Token-based (JWT)**. On login/signup the backend returns `{ user|captain, token }`.
  The token is stored in **`localStorage` under `"token"`** and attached manually as
  `Authorization: Bearer <token>` on each axios call.
- **`UserProtectWrapper` / `CaptainProtectWrapper`**: on mount, read the token; if
  missing → redirect to login. Otherwise call `/users/profile` (or
  `/captains/profile`), populate context, and render children. On error → clear token
  and redirect. While checking, render a plain `"Loading..."`.
- **Logout** hits the backend logout endpoint and clears the token.

---

## 6. Global / shared state

- **`useMapStore` (zustand)** — the cross-screen bridge for the map:
  `location` (pickup, `{lat,lng}`), `destination` (`{lat,lng}`), and their setters.
  Both rider and captain screens read/write it so their maps stay in sync via sockets.
- **Contexts** — identity (`user`/`captain`) and the shared `socket`.

---

## 7. Rider (User) flow — `Home.jsx`

The single most complex screen. Layout: full-screen map behind a stack of GSAP
slide-up panels.

1. **Join socket**: on mount emits `join { userId, userType:"user" }`.
2. **Find a trip form**: two inputs — *pickup* and *destination*. Typing (debounced
   500 ms via `useDebouncedFunction`) calls `GET /maps/get-suggestions` and shows an
   autocomplete list in **`LocationSearchPanel`** (which also has a **"Use current
   location"** button → GPS → `GET /maps/reverse-geocode` → fills the field).
3. **Fare**: once both fields are chosen, `LocationSearchPanel` calls
   `GET /rides/get-fare` → `{ auto, car, motorcycle }`.
4. **Vehicle selection** (`VehiclePanel`) → **confirm** (`ConfirmedVehicle`) →
   `POST /rides/create`. If "No captain found in the radius", the UI resets + toasts.
5. **Looking for driver** (`LookingForDriver`) then **waiting** (`WaitForDriver`).
6. **`ride-confirmed`** socket event → fetch pickup+destination coordinates
   (`/maps/get-coordinates` ×2), push them into `useMapStore`, and emit
   `destination-coordinates` so the captain's map gets them.
7. **`ride-started`** socket event → navigate to **`/riding`** with the ride object.

Panels are sequenced booleans (`panelOpen`, `vehiclePanel`, `confirmVehiclePanel`,
`vehicleFound`, `waitingForDriver`) each animated by a `useGSAP` block.

### `Riding.jsx` (rider in-trip)
Shows `LiveTracking` (route map) + driver/vehicle/OTP/fare card + a "Make a Payment"
button. Listens for **`ride-ended`** → navigates to `/user-end`.

---

## 8. Captain (Driver) flow — `CaptainHome.jsx`

1. **Join socket**: emits `join { userId, userType:"captain" }`.
2. **Location publishing**: every 10 s, reads GPS and emits
   `update-location-captain { userId, location:{ltd,lng} }`.
3. **`new-ride`** socket event → opens **`RidePopUp`** with ride details.
4. Captain accepts → `POST /rides/confirm` → opens **`ConfirmRidePopUp`**.
5. **OTP** (`Otp.jsx`): captain enters the rider's 6-digit OTP; on full length it
   auto-submits `GET /rides/start-ride` → navigates to **`/captain-riding`**.
6. **`destination-coordinates`** socket event → writes pickup/destination into
   `useMapStore` so `LiveTrackingCaptain` can draw the route.

### `CaptainRiding.jsx`
Shows `LiveTrackingCaptain` + a slide-up **`FinishRide`** panel → `GET /rides/end-ride`
→ emits `ride-ended` → `/captain-end`.

---

## 9. Realtime socket events

| Event | Direction | Purpose |
|---|---|---|
| `join` | client→server | register `socketId` for user/captain |
| `update-location-captain` | captain→server | push live driver location |
| `new-ride` | server→captain | a nearby ride request appeared |
| `ride-confirmed` | server→rider | a captain accepted |
| `destination-coordinates` | rider→server→captain | share pickup/destination coords |
| `ride-started` | server→rider | OTP verified, trip begins |
| `ride-ended` | server→rider | trip completed |

---

## 10. Maps subsystem (post-migration)

Three thin components over a shared core:

- **`LiveTrackingSingle`** — current-user marker only; uses GPS, falls back to a
  New-Delhi default.
- **`RouteMap`** (shared) — markers for `location`+`destination`, fetches the driving
  route from **OSRM** (`utils/osrm.js`) and draws a `<Polyline>`, auto-fits bounds.
- **`LiveTracking`** / **`LiveTrackingCaptain`** — wrappers that feed `RouteMap` from
  `useMapStore`.

Tiles: OpenStreetMap raster. Geocoding/autocomplete/reverse + routing run through the
**backend** (`/maps/*`), which uses Nominatim + OSRM, biased to India (`countrycodes=in`).

---

## 11. Backend endpoints consumed

```
POST /users/register · /users/login · GET /users/profile · GET /users/logout
POST /captains/register · /captains/login · GET /captains/profile · /captains/logout
GET  /maps/get-suggestions · /maps/get-coordinates · /maps/reverse-geocode
POST /rides/create · /rides/confirm     GET /rides/get-fare · /rides/start-ride · /rides/end-ride
```

Base URL: `import.meta.env.VITE_BASE_URL`.

---

## 12. Environment variables

| Var | Purpose |
|---|---|
| `VITE_BASE_URL` | Backend API + socket.io origin |
| `VITE_OSRM_URL` | (optional) routing server for the polyline |

---

## 13. Known quirks (carry-over to port)

- Tokens in `localStorage` (XSS-exposed); no shared axios instance/interceptors.
- Some socket listeners (`ride-started`, `new-ride`, `ride-ended`) are attached during
  render rather than in `useEffect` → can register multiple times.
- `Riding.jsx` references undefined `setVehicleFound`/`setConfirmVehiclePanel` in its
  payment button (dead/buggy handler).
- Several hardcoded display values ("562/11 A", "Maruti Suzuki Swift").
- Mixed coordinate keys: store uses `{lat,lng}`; captain location emits `{ltd,lng}`.
