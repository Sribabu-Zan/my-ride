import mongoose from "mongoose";

const pointSchema = new mongoose.Schema(
    {
        type: { type: String, enum: ["Point"], default: "Point" },
        coordinates: { type: [Number], default: undefined } // [lng, lat]
    },
    { _id: false }
);

const rideSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.ObjectId,
        ref: "User",
        required: true
    },
    captain: {
        type: mongoose.Schema.ObjectId,
        ref: "Captain"
    },
    pickup: {
        type: String,
        required: true
    },
    destination: {
        type: String,
        required: true
    },
    pickupLoc: pointSchema,
    dropLoc: pointSchema,
    fare: {
        type: Number,
        required: true
    },
    fareBreakup: {
        type: Object
    },
    status: {
        type: String,
        enum: ["pending", "accepted", "completed", "cancelled", "ongoing", "expired"],
        default: "pending"
    },
    vehicleType: {
        type: String,
        enum: ["car", "auto", "motorcycle"]
    },
    tripType: {
        type: String,
        enum: ["local", "intercity", "interstate"],
        default: "local"
    },
    bookingMode: {
        type: String,
        enum: ["now", "scheduled"],
        default: "now"
    },
    scheduledAt: { type: Date },
    duration: { type: Number }, // seconds
    distance: { type: Number }, // metres
    paymentID: { type: String },
    orderId: { type: String },
    signature: { type: String },
    otp: {
        type: String,
        select: false,
        required: true
    }
});

export default mongoose.model("ride", rideSchema);
