import captainModel from "../db/Models/captain.model.js";

// Search radius (km) by trip type. Long-distance trips cast a wider net around
// the pickup since fewer captains opt into them.
const RADIUS_KM = { local: 5, intercity: 15, interstate: 25 };

/**
 * Find captains eligible for a ride, ordered by distance from pickup.
 * Uses a GeoJSON 2dsphere $near query (coordinates are [lng, lat]).
 *
 * @param {{ latitude:number, longitude:number }} pickup
 * @param {{ tripType?:string, vehicleType?:string, limit?:number }} opts
 */
export const findCaptainsForRide = async (pickup, { tripType = "local", vehicleType, limit = 25 } = {}) => {
    const radiusKm = RADIUS_KM[tripType] ?? RADIUS_KM.local;

    const query = {
        status: "active",
        serviceTypes: tripType,
        location: {
            $near: {
                $geometry: { type: "Point", coordinates: [pickup.longitude, pickup.latitude] },
                $maxDistance: radiusKm * 1000
            }
        }
    };
    if (vehicleType) query["vehicle.vehicleType"] = vehicleType;

    return captainModel.find(query).limit(limit);
};
