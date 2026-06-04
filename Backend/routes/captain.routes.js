import express from "express";
import { body } from "express-validator";
import * as captainController from "../contollers/captain.controller.js";
import * as authMiddleware from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/register", [
    body("email").isEmail().withMessage("Invalid email"),
    body("fullname.firstname").isLength({ min: 3 }).withMessage("Name must be atleast 3 characters long"),
    body("password").isLength({ min: 5 }).withMessage("Password must be atleast 5 characters long"),
    body("vehicle.color").isLength({ min: 3 }).withMessage("Color must be atleast 3 characters long"),
    body("vehicle.plate").isLength({ min: 3 }).withMessage("Plate must be atleast 3 characters long"),
    body("vehicle.capacity").isNumeric().withMessage("Capacity must be a number"),
    body("vehicle.vehicleType").isIn(["car", "auto", "motorcycle"]).withMessage("Invalid vehicle type"),
], captainController.registerCaptain);

router.post("/login", [
    body("email").isEmail().withMessage("Invalid email"),
    body("password").isLength({ min: 5 }).withMessage("Password must be atleast 5 characters long")
], captainController.loginCaptain);

router.get("/profile", authMiddleware.authCaptain, captainController.getCaptainProfile);
router.post("/logout", authMiddleware.authCaptain, captainController.logoutCaptain);
router.get("/logout", authMiddleware.authCaptain, captainController.logoutCaptain); // legacy

export default router;
