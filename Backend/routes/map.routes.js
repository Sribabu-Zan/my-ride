import express from "express";
import { query } from "express-validator";
import * as mapController from "../contollers/maps.controller.js";
import * as authMiddleware from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/get-coordinates", authMiddleware.authUser, mapController.getCoordinates);

router.get("/get-distance-time",
    query("origins").isString().isLength({ min: 3 }),
    query("destinations").isString().isLength({ min: 3 }),
    authMiddleware.authUser,
    mapController.getDistanceTime
);

router.get("/get-suggestions",
    query("input").isString().isLength({ min: 3 }),
    authMiddleware.authUser,
    mapController.getAutoCompleteSuggestions
);

router.get("/reverse-geocode",
    query("lat").isFloat(),
    query("lng").isFloat(),
    authMiddleware.authUser,
    mapController.getReverseGeocode
);

export default router;
