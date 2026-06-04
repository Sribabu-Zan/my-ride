import rideModel from "../db/Models/ride.model.js";
import * as mapService from "./maps.service.js";
import { classifyTrip, computeAllFares } from "./fare.service.js";
import crypto from "crypto";

// Single source of truth for a quote: geocode both endpoints ONCE, classify the
// trip, get distance/duration, and compute fares. Reused by getFare + createRide
// so a create does not geocode/route twice.
async function quote(pickup, destination) {
    if (!pickup || !destination) throw new Error("Missing pickup or destination");

    const origin = await mapService.getGeocodeDetailed(pickup);
    const dest = await mapService.getGeocodeDetailed(destination);
    const tripType = classifyTrip(origin, dest);
    const { distance, duration } = await mapService.getRouteByCoords(origin, dest);
    const { fares, breakup } = computeAllFares({ tripType, distanceM: distance, durationS: duration });

    return { origin, dest, tripType, distance, duration, fares, breakup };
}

// Public quote: vehicle fares (backward-compatible top-level keys) + trip info.
export async function getFare(pickup, destination) {
    const { tripType, distance, duration, fares, breakup } = await quote(pickup, destination);
    return { ...fares, fares, tripType, distance, duration, breakup };
}

export const createRide = async ({ user, pickup, destination, vehicleType, bookingMode = "now", scheduledAt }) => {
    if (!user || !pickup || !destination || !vehicleType) {
        throw new Error("Missing user, pickup, destination or vehicle type");
    }
    const q = await quote(pickup, destination);

    const ride = await rideModel.create({
        user,
        pickup,
        destination,
        pickupLoc: { type: "Point", coordinates: [q.origin.longitude, q.origin.latitude] },
        dropLoc: { type: "Point", coordinates: [q.dest.longitude, q.dest.latitude] },
        otp: getOTP(6),
        fare: q.fares[vehicleType],
        fareBreakup: q.breakup,
        vehicleType,
        tripType: q.tripType,
        distance: q.distance,
        duration: q.duration,
        bookingMode,
        scheduledAt: bookingMode === "scheduled" ? scheduledAt : undefined
    });

    // Return ride plus the resolved pickup coordinate so the controller can run
    // captain matching without geocoding again.
    return { ride, pickupCoord: { latitude: q.origin.latitude, longitude: q.origin.longitude }, tripType: q.tripType };
};

function getOTP(num) {
    return crypto.randomInt(Math.pow(10, num - 1), Math.pow(10, num)).toString();
}

export const confirmRide = async (rideId, captainId) => {
    if (!rideId) throw new Error("Missing ride id");
    await rideModel.findOneAndUpdate({ _id: rideId }, { status: "accepted", captain: captainId });
    const ride = await rideModel.findOne({ _id: rideId }).populate("user").populate("captain").select("+otp");
    if (!ride) throw new Error("Ride not found");
    return ride;
};

export const startRide = async ({ rideId, otp }) => {
    if (!rideId || !otp) throw new Error("Ride id and OTP are required");

    const ride = await rideModel.findOne({ _id: rideId }).populate("user").populate("captain").select("+otp");
    if (!ride) throw new Error("Ride not found");
    if (ride.status !== "accepted") throw new Error("Ride not accepted");
    if (ride.otp !== otp) throw new Error("Invalid OTP");

    await rideModel.findOneAndUpdate({ _id: rideId }, { status: "ongoing" });
    return ride;
};

export const endRide = async ({ rideId }) => {
    if (!rideId) throw new Error("Missing ride id");
    const ride = await rideModel.findOne({ _id: rideId }).populate("user").populate("captain").select("+otp");
    if (!ride) throw new Error("Ride not found");
    if (ride.status !== "ongoing") throw new Error("Ride not ongoing");
    await rideModel.findOneAndUpdate({ _id: rideId }, { status: "completed" });
    return ride;
};
