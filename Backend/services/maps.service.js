import axios from "axios";

// Keyless OpenStreetMap-based providers. Override via env in production.
const NOMINATIM_URL = process.env.NOMINATIM_URL || "https://nominatim.openstreetmap.org";
const OSRM_URL = process.env.OSRM_URL || "https://router.project-osrm.org";

// Nominatim's usage policy requires a descriptive User-Agent identifying the app.
const NOMINATIM_HEADERS = {
    "User-Agent": process.env.NOMINATIM_USER_AGENT || "uber-clone/1.0 (maps service)"
};

// Restrict geocoding to these ISO country codes so results favour Indian places.
const COUNTRY_CODES = process.env.GEOCODE_COUNTRY_CODES || "in";

export const getAddressCoordinate = async (address) => {
    if (!address) throw new Error("Address is required");

    // Controller passes req.query (object); the rest of the app passes a string.
    const query = typeof address === "string" ? address : address.address;
    if (!query) throw new Error("Address is required");

    try {
        const response = await axios.get(`${NOMINATIM_URL}/search`, {
            headers: NOMINATIM_HEADERS,
            params: { q: query, format: "json", limit: 1, countrycodes: COUNTRY_CODES }
        });
        const data = response.data;
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error("Failed to fetch coordinates");
        }
        return { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) };
    } catch (error) {
        throw new Error("Error fetching coordinates: " + error.message);
    }
};

// Geocode an address AND return its administrative components (city, state),
// used to classify a trip as local / intercity / interstate.
export const getGeocodeDetailed = async (address) => {
    if (!address) throw new Error("Address is required");
    const query = typeof address === "string" ? address : address.address;

    const response = await axios.get(`${NOMINATIM_URL}/search`, {
        headers: NOMINATIM_HEADERS,
        params: { q: query, format: "json", limit: 1, addressdetails: 1, countrycodes: COUNTRY_CODES }
    });

    const data = response.data;
    if (!Array.isArray(data) || data.length === 0) {
        throw new Error("Failed to fetch coordinates");
    }
    const a = data[0].address || {};
    return {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon),
        city: a.city || a.town || a.village || a.county || null,
        state: a.state || null,
        display: data[0].display_name
    };
};

// OSRM route between two { latitude, longitude } points → { distance, duration }.
export const getRouteByCoords = async (origin, destination) => {
    const coords = `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`;
    const response = await axios.get(`${OSRM_URL}/route/v1/driving/${coords}`, {
        params: { overview: "false" }
    });
    const data = response.data;
    if (data.code !== "Ok" || !Array.isArray(data.routes) || data.routes.length === 0) {
        throw new Error("No route found");
    }
    return { distance: data.routes[0].distance, duration: data.routes[0].duration };
};

export const getDistanceTime = async (origins, destinations) => {
    if (!origins || !destinations) throw new Error("Origin/Destination cant be null");

    const origin = await getAddressCoordinate(origins);
    const destination = await getAddressCoordinate(destinations);
    const { distance, duration } = await getRouteByCoords(origin, destination);

    // Shape kept compatible with the previous Google distance-matrix element.
    return {
        distance: { value: distance, text: `${(distance / 1000).toFixed(1)} km` },
        duration: { value: duration, text: `${Math.round(duration / 60)} mins` }
    };
};

export const getAutoCompleteSuggestions = async (input) => {
    if (!input) throw new Error("Input is null");

    try {
        const response = await axios.get(`${NOMINATIM_URL}/search`, {
            headers: NOMINATIM_HEADERS,
            params: { q: input, format: "json", addressdetails: 1, limit: 5, countrycodes: COUNTRY_CODES }
        });
        if (!Array.isArray(response.data)) throw new Error("Failed to fetch suggestions");
        return response.data.map((r) => ({
            description: r.display_name,
            placeId: r.place_id,
            lat: parseFloat(r.lat),
            lng: parseFloat(r.lon)
        }));
    } catch (err) {
        throw new Error("Error fetching suggestions: " + err.message);
    }
};

export const getReverseGeocode = async (lat, lng) => {
    if (lat === undefined || lng === undefined || lat === "" || lng === "") {
        throw new Error("Latitude and longitude are required");
    }
    try {
        const response = await axios.get(`${NOMINATIM_URL}/reverse`, {
            headers: NOMINATIM_HEADERS,
            params: { lat, lon: lng, format: "json", addressdetails: 1 }
        });
        const data = response.data;
        if (!data || !data.display_name) throw new Error("Failed to reverse geocode location");
        const a = data.address || {};
        return {
            address: data.display_name,
            latitude: parseFloat(data.lat),
            longitude: parseFloat(data.lon),
            city: a.city || a.town || a.village || a.county || null,
            state: a.state || null
        };
    } catch (error) {
        throw new Error("Error reverse geocoding: " + error.message);
    }
};
