import userModel from "../db/Models/user.model.js";
import * as userService from "../services/user.services.js";
import { validationResult } from "express-validator";
import blacklistTokenModel from "../db/Models/blacklistToken.model.js";

export const registerUser = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { fullname, email, password } = req.body;
    const isUserAlreadyExists = await userModel.findOne({ email });
    if (isUserAlreadyExists) return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await userModel.hashPassword(password);
    const user = await userService.createUser({
        firstname: fullname.firstname,
        lastname: fullname.lastname,
        email,
        password: hashedPassword
    });
    const token = user.generateAuthToken();
    res.status(201).json({ token, user });
};

export const loginUser = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;
    const user = await userModel.findOne({ email }).select("+password");
    if (!user) return res.status(401).json({ message: "Invalid email or password" });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ message: "Invalid email or password" });

    const token = user.generateAuthToken();
    res.cookie("token", token);
    res.status(200).json({ token, user });
};

export const getUserProfile = async (req, res) => {
    res.status(200).json({ user: req.user });
};

export const logoutUser = async (req, res) => {
    res.clearCookie("token");
    const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
    if (token) await blacklistTokenModel.create({ token });
    res.status(200).json({ message: "Logged out successfully" });
};
