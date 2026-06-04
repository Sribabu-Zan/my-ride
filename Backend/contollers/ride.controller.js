import * as rideService from "../services/ride.services.js";
import { validationResult } from "express-validator";
import { findCaptainsForRide } from "../services/matching.service.js";
import { sendMessageToSocketId } from "../socket.js";
import rideModel from "../db/Models/ride.model.js";

export const createRide = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array() });

    const { pickup, destination, vehicleType, bookingMode, scheduledAt } = req.body;
    try {
        const { ride, pickupCoord, tripType } = await rideService.createRide({
            user: req.user._id,
            pickup,
            destination,
            vehicleType,
            bookingMode,
            scheduledAt
        });

        // Scheduled long-distance rides are not broadcast immediately; a dispatch
        // worker offers them to eligible captains closer to the pickup time.
        if (ride.bookingMode === "scheduled") {
            return res.status(201).json({ ride, message: "Ride scheduled" });
        }

        // Match by trip type (local: nearby; intercity/interstate: wider radius,
        // only captains who serve that trip type).
        const captains = await findCaptainsForRide(pickupCoord, { tripType, vehicleType });
        if (captains.length === 0) {
            return res.status(201).json({ message: "No captain found in the radius" });
        }

        res.status(201).json({ ride });

        const rideWithUser = await rideModel.findOne({ _id: ride._id }).populate("user");
        rideWithUser.otp = "";
        captains.forEach((captain) => {
            sendMessageToSocketId(captain.socketId, {
                event: "new-ride",
                data: { ride: rideWithUser }
            });
        });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

export const getFare = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array() });

    const { pickup, destination } = req.query;
    try {
        const fare = await rideService.getFare(pickup, destination);
        return res.status(200).json(fare);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

export const confirmRide = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array() });

    const { rideId, captainId } = req.body;
    try {
        const ride = await rideService.confirmRide(rideId, captainId);
        sendMessageToSocketId(ride.user.socketId, { event: "ride-confirmed", data: ride });
        return res.status(200).json(ride);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

export const startRide = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { rideId, otp } = req.query;
    try {
        const ride = await rideService.startRide({ rideId, otp });
        sendMessageToSocketId(ride.user.socketId, { event: "ride-started", data: ride });
        return res.status(200).json(ride);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

export const endRide = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { rideId } = req.body;
    try {
        const ride = await rideService.endRide({ rideId });
        sendMessageToSocketId(ride.user.socketId, { event: "ride-ended", data: ride });
        return res.status(200).json(ride);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};
