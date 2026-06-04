import express from "express";
import { body } from "express-validator";
import * as userController from "../contollers/user.controller.js";
import * as authMiddleware from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/register", [
    body("email").isEmail().withMessage("Invalid email"),
    body("fullname.firstname").isLength({ min: 3 }).withMessage("Name must be atleast 3 characters long"),
    body("password").isLength({ min: 5 }).withMessage("Password must be atleast 5 characters long"),
], userController.registerUser);

router.post("/login", [
    body("email").isEmail().withMessage("Invalid email"),
    body("password").isLength({ min: 5 }).withMessage("Password must be atleast 5 characters long")
], userController.loginUser);

router.get("/profile", authMiddleware.authUser, userController.getUserProfile);
router.post("/logout", authMiddleware.authUser, userController.logoutUser);
router.get("/logout", authMiddleware.authUser, userController.logoutUser); // legacy

export default router;
