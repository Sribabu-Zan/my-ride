import express from "express";
import { body, query } from "express-validator";
import * as rideController from "../contollers/ride.controller.js";
import * as authMiddleware from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/create",
    authMiddleware.authUser,
    body("pickup").isString().isLength({ min: 3 }).withMessage("invalid pickup location"),
    body("destination").isString().isLength({ min: 3 }).withMessage("invalid destination"),
    body("vehicleType").isString().isIn(["auto", "car", "motorcycle"]).withMessage("invalid vehicle"),
    body("bookingMode").optional().isIn(["now", "scheduled"]),
    rideController.createRide
);

router.get("/get-fare",
    authMiddleware.authUser,
    query("pickup").isString().isLength({ min: 3 }).withMessage("invalid pickup location"),
    query("destination").isString().isLength({ min: 3 }).withMessage("invalid destination"),
    rideController.getFare
);

router.post("/confirm",
    authMiddleware.authCaptain,
    body("rideId").isString().isLength({ min: 24 }).withMessage("invalid ride id"),
    rideController.confirmRide
);

router.get("/start-ride",
    authMiddleware.authCaptain,
    query("rideId").isMongoId().withMessage("Invalid ride id"),
    query("otp").isString().isLength({ min: 6, max: 6 }).withMessage("Invalid OTP"),
    rideController.startRide
);

router.post("/end-ride",
    authMiddleware.authCaptain,
    body("rideId").isString().isLength({ min: 24 }).withMessage("invalid ride id"),
    rideController.endRide
);

export default router;
