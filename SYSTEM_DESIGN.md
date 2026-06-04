# System Design — Uber-style Ride-Hailing Platform (Local + Inter-city + Inter-state)

> A professional engineering design for the platform: how the system is structured,
> how each subsystem is built, the data models and algorithms, the API and realtime
> contracts, and the mobile (React Native) client architecture. Written so it can be
> implemented directly.

---

## 1. Product scope & requirements

### 1.1 Functional requirements
- **Two actors:** Rider (user) and Captain (driver). Each has auth, profile, session.
- **Trip categories** (new):
  1. **Local / intra-city** — point-to-point within a city. Matched in real time to
     nearby captains. Immediate.
  2. **Inter-city** — pickup and drop in different cities, same state (e.g. Hyderabad → Vijayawada).
  3. **Inter-state** — pickup and drop in different states (e.g. Hyderabad → Bengaluru).
- **Booking modes:** *On-demand* (now) for local; *Scheduled* (pick date/time) for
  inter-city/inter-state, plus optional *one-way / round-trip*.
- Address search/autocomplete, reverse geocode ("use current location"), fare
  estimation, ride creation, captain matching, OTP-verified start, live tracking,
  ride completion, fare settlement (cash for now).

### 1.2 Non-functional requirements
- **Realtime** location + ride-state propagation (< 2 s perceived latency).
- **Availability** of read paths (search/quote) even under matching load.
- **Horizontal scalability** of the API and socket layer.
- **Cost control** on maps (geocoding/routing) via caching and provider abstraction.
- **Security**: signed tokens, least-privilege CORS, input validation, rate limiting.

### 1.3 Out of scope (v1)
Online payments/wallets, ratings, surge ML, driver payouts, multi-stop.

---

## 2. High-level architecture

```
        ┌───────────────────────┐        ┌───────────────────────┐
        │  Rider App (RN/Expo)  │        │ Captain App (RN/Expo) │
        │  - screens/nav        │        │  - screens/nav        │
        │  - REST + socket.io   │        │  - bg location        │
        └───────────┬───────────┘        └───────────┬───────────┘
                    │ HTTPS / WSS                     │
                    └───────────────┬─────────────────┘
                                    ▼
                       ┌──────────────────────────┐
                       │     API Gateway / LB      │   (TLS, rate limit, CORS)
                       └─────────────┬─────────────┘
              ┌──────────────────────┼───────────────────────┐
              ▼                      ▼                       ▼
   ┌──────────────────┐  ┌────────────────────┐  ┌─────────────────────┐
   │  REST API (HTTP) │  │  Realtime (socket) │  │  Maps Service (BFF) │
   │  Express         │  │  socket.io + Redis │  │  geocode/route/ETA  │
   │  controllers/svc │  │  adapter (pub/sub) │  │  provider-agnostic  │
   └────────┬─────────┘  └─────────┬──────────┘  └──────────┬──────────┘
            │                      │                        │
            ▼                      ▼                        ▼
   ┌──────────────────┐   ┌────────────────┐     ┌────────────────────────┐
   │   MongoDB        │   │     Redis      │     │  External map providers │
   │  users/captains  │   │ socket adapter │     │  Nominatim/Photon (geo) │
   │  rides (2dsphere)│   │ geo presence   │     │  OSRM/ORS (route, ETA)  │
   └──────────────────┘   │ cache, queues  │     │  tiles (OSM/MapTiler)   │
                          └────────────────┘     └────────────────────────┘
```

**Why this shape**
- **Maps as a Backend-For-Frontend (BFF) service**: clients never call providers
  directly. We control keys, add caching, and can swap Nominatim→LocationIQ or
  OSRM→OpenRouteService by config only. (Already the pattern in `maps.service.js`.)
- **Realtime separated from REST** so we can scale sockets independently and use a
  **Redis adapter** to broadcast across multiple socket.io nodes (today the socket
  server is single-node — see §9).
- **Redis** also holds **driver geo-presence** (live locations) so matching does not
  hammer Mongo on every location ping.

---

## 3. Domain model & ride taxonomy

### 3.1 Trip classification (how `local | intercity | interstate` is decided)
At quote time the Maps Service reverse-resolves both endpoints to administrative
areas (`city`, `state`, `country`) via geocoding `addressdetails`. Classification:

```js
function classifyTrip(pickupAddr, dropAddr) {
  if (pickupAddr.state !== dropAddr.state)  return 'interstate';
  if (pickupAddr.city  !== dropAddr.city)   return 'intercity';
  return 'local';
}
```

This drives **fare model, matching strategy, booking mode, and required fields**
(e.g. interstate may require permit/toll handling).

### 3.2 Data models (MongoDB / Mongoose)

```js
// user.model.js  (existing, unchanged core)
{
  fullname: { firstname: String, lastname: String },
  email: { type: String, unique: true },
  password: { type: String, select: false },
  socketId: String,
}

// captain.model.js  (extended)
{
  fullname, email, password (select:false), socketId,
  status: { type: String, enum: ['active','inactive'], default: 'inactive' },
  vehicle: { color, plate, capacity, vehicleType:['car','auto','motorcycle'] },

  // NEW — long-distance capability
  serviceTypes: [{ type: String, enum: ['local','intercity','interstate'] }],
  baseCity:  String,           // home city for return-trip matching
  baseState: String,

  location: { type: { type:String, enum:['Point'], default:'Point' },
              coordinates: [Number] },   // [lng, lat]  (GeoJSON)
}
captainSchema.index({ location: '2dsphere' });   // REQUIRED for $near matching

// ride.model.js  (extended)
{
  user:  { ref:'user' },
  captain: { ref:'captain' },
  pickup: String, destination: String,         // human addresses
  pickupLoc:  { type:'Point', coordinates:[Number] },   // [lng,lat] snapshot
  dropLoc:    { type:'Point', coordinates:[Number] },

  // NEW — taxonomy + scheduling
  tripType:   { type:String, enum:['local','intercity','interstate'], default:'local' },
  bookingMode:{ type:String, enum:['now','scheduled'], default:'now' },
  scheduledAt: Date,                            // for scheduled rides
  roundTrip:  { type:Boolean, default:false },
  returnAt:   Date,

  vehicleType: String,
  fare: Number,
  fareBreakup: {                                // transparency
    base:Number, distanceFare:Number, timeFare:Number,
    interStateTax:Number, tollEstimate:Number, nightSurcharge:Number,
    platformFee:Number, surgeMultiplier:Number,
  },
  distance: Number,   // metres
  duration: Number,   // seconds

  status: { type:String,
            enum:['pending','accepted','ongoing','completed','cancelled','expired'],
            default:'pending' },
  otp: { type:String, select:false, required:true },
}
rideSchema.index({ status:1, tripType:1, scheduledAt:1 });
```

> **Migration note from current code:** today captain `location` is `{ltd,lng}` and
> `getCaptainsInTheRadius(lat,lng)` passes args in the wrong order, and there is no
> `2dsphere` index. The design standardises on **GeoJSON `[lng,lat]` + 2dsphere**.

---

## 4. Fare engine (code-level)

Fares are computed server-side only (clients never compute money). The engine is a
**pure function** of distance, duration, trip type, time-of-day, and config so it is
unit-testable and tunable without code changes.

```js
// config/pricing.js — tunable, could live in DB
const PRICING = {
  local: {
    base:   { car:50, auto:30, motorcycle:20 },
    perKm:  { car:12, auto:9,  motorcycle:6  },
    perMin: { car:2,  auto:1.5,motorcycle:1  },
    minFare:{ car:60, auto:40, motorcycle:25 },
  },
  intercity: {                       // lower per-km, no per-min (highway speed)
    base:   { car:300 }, perKm: { car:14 }, perMin: { car:0 },
    driverAllowance: 250,            // flat, long trips
  },
  interstate: {
    base:   { car:500 }, perKm: { car:16 }, perMin: { car:0 },
    driverAllowance: 500,
    interStateTaxPerTrip: 400,       // permit/border, simplified
  },
  surge:   { enabled:true, max:2.0 },
  nightSurchargePct: 0.10,           // 22:00–05:00
  platformFeePct:    0.05,
  tollPerKmInterCity: 1.2,           // rough estimate; real tolls via provider later
};

function computeFare({ tripType, vehicleType='car', distanceM, durationS, when, surge=1 }) {
  const p = PRICING[tripType];
  const km = distanceM / 1000, min = durationS / 60;

  let base = p.base[vehicleType] ?? p.base.car;
  let distanceFare = (p.perKm[vehicleType] ?? p.perKm.car) * km;
  let timeFare = (p.perMin[vehicleType] ?? p.perMin.car ?? 0) * min;

  const allowance = p.driverAllowance ?? 0;
  const interStateTax = p.interStateTaxPerTrip ?? 0;
  const tollEstimate = tripType === 'local' ? 0
                     : Math.round(km * (PRICING.tollPerKmInterCity));

  let subtotal = base + distanceFare + timeFare + allowance + interStateTax + tollEstimate;

  const isNight = (h => h >= 22 || h < 5)(new Date(when).getHours());
  const nightSurcharge = isNight ? subtotal * PRICING.nightSurchargePct : 0;
  const surgeMult = Math.min(surge, PRICING.surge.max);
  subtotal = (subtotal + nightSurcharge) * surgeMult;

  const platformFee = subtotal * PRICING.platformFeePct;
  const total = Math.round(subtotal + platformFee);

  const minFare = p.minFare?.[vehicleType] ?? 0;
  return {
    total: Math.max(total, minFare),
    breakup: { base, distanceFare:Math.round(distanceFare), timeFare:Math.round(timeFare),
               interStateTax, tollEstimate, nightSurcharge:Math.round(nightSurcharge),
               platformFee:Math.round(platformFee), surgeMultiplier:surgeMult },
  };
}
```

`distanceM`/`durationS` come from the routing provider (OSRM `route` → `distance`,
`duration`). For intercity/interstate the same OSRM call works because it is
coordinate-based; only the **pricing table and toll/allowance** differ.

---

## 5. Captain matching (strategy per trip type)

### 5.1 Local — proximity matching (real time)
```js
// Redis GEO presence (preferred) OR Mongo 2dsphere fallback
// Redis: GEOADD captains:online <lng> <lat> <captainId>
//        GEOSEARCH captains:online FROMLONLAT <lng> <lat> BYRADIUS 3 km ASC
async function findLocalCaptains(pickup /*[lng,lat]*/, radiusKm=3) {
  return captainModel.find({
    status:'active',
    serviceTypes:'local',
    'vehicle.vehicleType': vehicleType,
    location: { $near: { $geometry:{type:'Point',coordinates:pickup},
                         $maxDistance: radiusKm*1000 } },
  }).limit(20);
}
```
Broadcast `new-ride` to each matched captain’s `socketId`; first to accept wins
(atomic `findOneAndUpdate({_id, status:'pending'},{status:'accepted',captain})`).

### 5.2 Inter-city / inter-state — route & schedule matching
Proximity is the wrong primitive (the trip leaves the city). Instead:
- **On-demand intercity:** match captains whose `serviceTypes` includes the trip type
  AND who are currently near the **pickup** (same `$near`, larger radius e.g. 10 km),
  AND opted into long-distance. Show the **destination + earnings** in the offer so a
  driver opts in knowingly.
- **Scheduled:** insert into a **scheduled-rides queue**; a worker dispatches offers
  to eligible captains `scheduledAt - 60min`. Captains whose `baseCity == dropCity`
  get priority (a useful **return trip**). Acceptance locks the ride.

```js
async function findIntercityCaptains(pickup, tripType) {
  return captainModel.find({
    status:'active', serviceTypes: tripType,
    location:{ $near:{ $geometry:{type:'Point',coordinates:pickup}, $maxDistance:10000 } },
  }).limit(50);
}
```

### 5.3 Offer lifecycle & expiry
A `pending` ride that no one accepts within N seconds (local) / minutes (scheduled)
transitions to `expired` via a TTL/worker; the rider is notified and can retry.

---

## 6. Booking sequence flows

### 6.1 Local, on-demand (happy path)
```
Rider                 API/Maps              Matching/Socket          Captain
 │  GET /maps/get-suggestions ───────────►                              │
 │  GET /rides/get-fare (quote+classify) ►  computeFare()               │
 │  POST /rides/create {pickup,drop,type} ► persist(pending,otp)        │
 │                                          findLocalCaptains()         │
 │                                          emit new-ride ─────────────►│
 │                                                          accept ◄────│  POST /rides/confirm
 │  ◄──────── ride-confirmed (socket) ─────                             │
 │  emit destination-coordinates ─────────────────────────────────────►│  (draw route)
 │                                          OTP shown to rider          │
 │                                          captain enters OTP ────────►│  GET /rides/start-ride
 │  ◄──────── ride-started ────────────────                             │
 │  (live tracking via update-location-captain)                        │
 │                                          captain ends ──────────────►│  GET /rides/end-ride
 │  ◄──────── ride-ended ──────────────────                             │
```

### 6.2 Inter-city / inter-state additions
- Quote response includes `tripType`, `fareBreakup`, and (if scheduled)
  `availableSlots`. Create accepts `bookingMode`, `scheduledAt`, `roundTrip`.
- Scheduled rides skip immediate broadcast; a **dispatch worker** handles offers.

---

## 7. API contract (REST)

```
# Auth
POST /users/register | /users/login        → { user, token }
GET  /users/profile  | POST /users/logout
POST /captains/register | /captains/login   → { captain, token }
GET  /captains/profile | POST /captains/logout

# Maps (BFF, provider-agnostic, India-biased)
GET /maps/get-suggestions?input=        → [{ description, placeId, lat, lng }]
GET /maps/get-coordinates?address=      → { latitude, longitude }
GET /maps/reverse-geocode?lat=&lng=     → { address, latitude, longitude, city, state }
GET /maps/get-distance-time?origins=&destinations= → { distance:{value}, duration:{value} }

# Rides
GET  /rides/get-fare?pickup=&destination=&bookingMode=&scheduledAt=
     → { tripType, fares:{car,auto,motorcycle}, breakup, distance, duration }
POST /rides/create   { pickup, destination, vehicleType, tripType, bookingMode, scheduledAt, roundTrip }
POST /rides/confirm  { rideId, captainId }
GET  /rides/start-ride?rideId=&otp=
GET  /rides/end-ride?rideId=
GET  /rides/scheduled            (captain: upcoming dispatch offers)
```

**Cross-cutting:** every state-changing route validated with `express-validator`;
auth via `Authorization: Bearer <jwt>`; standardized error envelope
`{ message, errors? }`; logout is **POST** (state change).

---

## 8. Maps service design (cost + reliability)

- **Provider abstraction**: `NOMINATIM_URL`, `OSRM_URL`, `TILE_URL`, `GEOCODE_COUNTRY_CODES`
  — swap public demo → LocationIQ/ORS/MapTiler with zero code change.
- **Caching (Redis):** geocode/reverse results keyed by normalized query (TTL days);
  route distance/duration keyed by rounded `origin|dest` (TTL hours). Cuts provider
  calls drastically and respects Nominatim's 1 req/s policy.
- **Autocomplete throttling:** client debounce (500 ms) + server token-bucket per IP.
- **Resilience:** timeouts + retry/backoff; degrade gracefully (e.g. straight-line
  Haversine fallback for distance if routing is down, flagged as estimate).

---

## 9. Realtime design

- **Rooms:** each user/captain joins a private room keyed by their id (`join`). Ride
  events are emitted to specific rooms — no global broadcast (current
  `destination-coordinates` broadcasts to everyone; design fixes this to room-scoped).
- **Multi-node scale:** `socket.io-redis` adapter so any node can reach any socket.
- **Location pings:** captain emits `update-location-captain` (throttled ~5 s).
  Server updates **Redis GEO** (presence) and forwards to the active ride's rider
  room; periodic snapshot to Mongo for history.
- **Reconnect:** on disconnect mark presence stale (Redis TTL); client auto-reconnects
  and re-`join`s.

---

## 10. Security

- JWT (short-lived) + token **blacklist** on logout (existing) — move toward refresh
  tokens + httpOnly cookies on mobile-secure storage (`expo-secure-store`).
- **CORS allowlist** (not `*`), **helmet**, **express-rate-limit** on auth + maps.
- Input validation everywhere; passwords bcrypt-hashed (existing), `select:false`.
- Secrets via env/secret manager; never in repo.

---

## 11. Mobile client architecture (React Native / Expo)

```
mobile/
├── app.json / app.config.js     # Expo config (permissions, plugins)
├── babel.config.js              # NativeWind + reanimated plugins
├── tailwind.config.js           # NativeWind theme (mirror web colors)
├── global.css                   # tailwind directives
└── src/
    ├── navigation/              # @react-navigation: Stack + role-based flows
    │   └── RootNavigator.jsx    # Auth stack ↔ User stack ↔ Captain stack
    ├── context/                 # UserContext, CaptainContext, SocketContext
    ├── store/                   # zustand useMapStore (shared logic ports 1:1)
    ├── lib/
    │   ├── api.js               # axios instance + interceptors (token, errors)
    │   ├── socket.js            # socket.io-client singleton
    │   └── storage.js           # expo-secure-store (token) wrapper
    ├── components/              # Button, Panel (BottomSheet), Map, OtpInput…
    ├── screens/
    │   ├── auth/ (Start, UserLogin, UserSignup, CaptainLogin, CaptainSignup)
    │   ├── rider/ (Home, Riding, RideEnd)
    │   └── captain/ (Home, Riding, RideEnd)
    └── theme.js
```

**Web→Native mapping (how the UI is preserved):**

| Web | React Native |
|---|---|
| `react-router-dom` | `@react-navigation/native` + native-stack |
| Tailwind classes | **NativeWind** `className` (same utility names) |
| flowbite `TextInput`/`Label` | RN `TextInput` + styled wrappers |
| GSAP slide-up panels | `@gorhom/bottom-sheet` / Reanimated |
| react-leaflet `MapContainer` | `react-native-maps` `<MapView>` + `<UrlTile>` (OSM) + `<Marker>` + `<Polyline>` |
| `navigator.geolocation` | `expo-location` (`getCurrentPositionAsync`, `watchPositionAsync`) |
| `localStorage` token | `expo-secure-store` |
| `import.meta.env.VITE_*` | `expo-constants` / `process.env.EXPO_PUBLIC_*` |
| `axios` per-call | shared `lib/api.js` instance + interceptors |
| `react-hot-toast` | `react-native-toast-message` / Snackbar |

**Maps without API keys:** `react-native-maps` renders OSM raster tiles through
`<UrlTile urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />`; routing
polyline comes from the same OSRM helper (`lib/osrm.js`) ported from web. For
production-grade map UX, switch `TILE_URL` to MapTiler/Stadia.

**State & realtime:** Contexts and the zustand store port almost verbatim from web
(plain JS, no DOM). The socket client and event names are identical, so the backend
needs no client-specific changes.

**Background location (captain):** `expo-location` foreground watch in v1; upgrade to
`expo-task-manager` background updates for production so location flows while the app
is backgrounded on a long intercity trip.

---

## 12. Scalability & ops (forward-looking)

- Stateless API behind a load balancer; sticky-less sockets via Redis adapter.
- Mongo: 2dsphere on captain/ride geo; compound indexes on `(status,tripType,scheduledAt)`.
- Redis: geo-presence, geocode/route cache, scheduled-ride queue, socket pub/sub.
- Observability: structured logging (pino), request IDs, metrics on match latency &
  provider error rates.
- Scheduled-ride **dispatch worker** as a separate process (cron/queue consumer).

---

## 13. Phased delivery

1. **Foundation:** Expo app, navigation, contexts, api/socket/storage libs, theme.
2. **Auth:** Start + user/captain login/signup (SecureStore tokens).
3. **Rider core:** Home map, autocomplete, current-location, **trip classification +
   fare (local/intercity/interstate)**, vehicle + booking-mode select, create ride.
4. **Ride lifecycle:** LookingForDriver → Riding (live tracking) → end; Captain Home
   (offers, OTP) → Riding → finish.
5. **Backend extensions:** ride-type/scheduling fields, fare engine, classification in
   reverse-geocode, room-scoped sockets, geo index + matching fixes.
6. **Hardening:** caching, rate limit, scheduled dispatch worker, background location.
