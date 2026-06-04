import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";

import connectToDB from "./db/db.js";
import userRoutes from "./routes/user.routes.js";
import captainRoutes from "./routes/captain.routes.js";
import mapsRoutes from "./routes/map.routes.js";
import rideRoutes from "./routes/ride.routes.js";

connectToDB();

const app = express();

// CORS: allowlist via env in production; reflect any origin in dev.
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map((s) => s.trim())
    : true;

app.use(helmet());
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Throttle auth endpoints against brute force.
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true, legacyHeaders: false });

app.get("/", (req, res) => res.send("Hello world"));
app.use("/users", authLimiter, userRoutes);
app.use("/captains", authLimiter, captainRoutes);
app.use("/maps", mapsRoutes);
app.use("/rides", rideRoutes);

export default app;
