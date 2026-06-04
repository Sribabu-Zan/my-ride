const axios = require('axios');
const captainModel = require("../db/Models/captain.model");

// Keyless OpenStreetMap-based providers. Override via env in production.
const NOMINATIM_URL = process.env.NOMINATIM_URL || "https://nominatim.openstreetmap.org";
const OSRM_URL = process.env.OSRM_URL || "https://router.project-osrm.org";

// Nominatim's usage policy requires a descriptive User-Agent identifying the app.
const NOMINATIM_HEADERS = {
    "User-Agent": process.env.NOMINATIM_USER_AGENT || "uber-clone/1.0 (maps service)"
};

// Restrict geocoding to these ISO country codes so results favour Indian places.
const COUNTRY_CODES = process.env.GEOCODE_COUNTRY_CODES || "in";

module.exports.getAddressCoordinate = async (address) => {
    if (!address) {
        throw new Error("Address is required");
    }

    // The controller passes req.query (an object); the rest of the app passes a string.
    const query = typeof address === 'string' ? address : address.address;
    if (!query) {
        throw new Error("Address is required");
    }

    const url = `${NOMINATIM_URL}/search`;

    try {
        const response = await axios.get(url, {
            headers: NOMINATIM_HEADERS,
            params: {
                q: query,
                format: "json",
                limit: 1,
                countrycodes: COUNTRY_CODES
            }
        });

        const data = response.data;
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error("Failed to fetch coordinates");
        }

        return {
            latitude: parseFloat(data[0].lat),
            longitude: parseFloat(data[0].lon)
        };
    } catch (error) {
        throw new Error("Error fetching coordinates: " + error.message);
    }
};

// Geocode an address AND return its administrative components (city, state),
// used to classify a trip as local / intercity / interstate.
module.exports.getGeocodeDetailed = async (address) => {
    if (!address) throw new Error("Address is required");
    const query = typeof address === "string" ? address : address.address;

    const response = await axios.get(`${NOMINATIM_URL}/search`, {
        headers: NOMINATIM_HEADERS,
        params: {
            q: query,
            format: "json",
            limit: 1,
            addressdetails: 1,
            countrycodes: COUNTRY_CODES,
        },
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
        display: data[0].display_name,
    };
};

// OSRM route between two { latitude, longitude } points → { distance, duration }.
module.exports.getRouteByCoords = async (origin, destination) => {
    const coords = `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`;
    const response = await axios.get(`${OSRM_URL}/route/v1/driving/${coords}`, {
        params: { overview: "false" },
    });
    const data = response.data;
    if (data.code !== "Ok" || !Array.isArray(data.routes) || data.routes.length === 0) {
        throw new Error("No route found");
    }
    return { distance: data.routes[0].distance, duration: data.routes[0].duration };
};

module.exports.getDistanceTime = async (origins, destinations) => {
    if (!origins || !destinations) {
        throw new Error("Origin/Destination cant be null");
    }

    // OSRM works on coordinates, so resolve both endpoints first.
    const origin = await module.exports.getAddressCoordinate(origins);
    const destination = await module.exports.getAddressCoordinate(destinations);

    const coords = `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`;
    const url = `${OSRM_URL}/route/v1/driving/${coords}`;

    try {
        const response = await axios.get(url, {
            params: { overview: "false" }
        });
        const data = response.data;

        if (data.code !== "Ok" || !Array.isArray(data.routes) || data.routes.length === 0) {
            throw new Error("No route found");
        }

        const route = data.routes[0];
        // Shape kept compatible with the previous Google distance-matrix element:
        // distance.value in metres, duration.value in seconds.
        return {
            distance: {
                value: route.distance,
                text: `${(route.distance / 1000).toFixed(1)} km`
            },
            duration: {
                value: route.duration,
                text: `${Math.round(route.duration / 60)} mins`
            }
        };
    } catch (err) {
        throw new Error("Error fetching distance: " + err.message);
    }
};

module.exports.getAutoCompleteSuggestions = async (input) => {
    if (!input) {
        throw new Error("Input is null");
    }

    const url = `${NOMINATIM_URL}/search`;

    try {
        const response = await axios.get(url, {
            headers: NOMINATIM_HEADERS,
            params: {
                q: input,
                format: "json",
                addressdetails: 1,
                limit: 5,
                countrycodes: COUNTRY_CODES
            }
        });

        if (!Array.isArray(response.data)) {
            throw new Error("Failed to fetch suggestions");
        }

        // Keep `description` so existing frontend consumers keep working.
        return response.data.map((result) => ({
            description: result.display_name,
            placeId: result.place_id,
            lat: parseFloat(result.lat),
            lng: parseFloat(result.lon)
        }));
    } catch (err) {
        throw new Error("Error fetching suggestions: " + err.message);
    }
};

module.exports.getReverseGeocode = async (lat, lng) => {
    if (lat === undefined || lng === undefined || lat === "" || lng === "") {
        throw new Error("Latitude and longitude are required");
    }

    const url = `${NOMINATIM_URL}/reverse`;

    try {
        const response = await axios.get(url, {
            headers: NOMINATIM_HEADERS,
            params: {
                lat,
                lon: lng,
                format: "json",
                addressdetails: 1
            }
        });

        const data = response.data;
        if (!data || !data.display_name) {
            throw new Error("Failed to reverse geocode location");
        }

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

module.exports.getCaptainsInTheRadius = async (ltd, lng, radius) => {
    //// radius in km
    const captains = await captainModel.find({
        location: {
            $geoWithin: {
                $centerSphere: [[ ltd, lng ], radius/6371]
            }
        }
    });
    return captains;
}
