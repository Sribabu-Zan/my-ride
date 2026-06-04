import { Server } from "socket.io";
import userModel from "./db/Models/user.model.js";
import captainModel from "./db/Models/captain.model.js";

let io;

const socketOrigins = process.env.SOCKET_ORIGINS
    ? process.env.SOCKET_ORIGINS.split(",").map((s) => s.trim())
    : "*";

export const initializeSocket = (server) => {
    io = new Server(server, {
        cors: { origin: socketOrigins, methods: ["GET", "POST"] }
    });

    io.on("connection", (socket) => {
        console.log(`New client connected: ${socket.id}`);

        socket.on("join", async (data) => {
            const { userId, userType } = data;
            if (!userId) return;
            // Per-identity room so events can be targeted instead of broadcast.
            socket.join(userId);

            if (userType === "user") {
                await userModel.findByIdAndUpdate(userId, { socketId: socket.id });
            } else if (userType === "captain") {
                await captainModel.findByIdAndUpdate(userId, { socketId: socket.id, status: "active" });
            }
        });

        socket.on("update-location-captain", async (data) => {
            const { userId, location } = data;
            if (!location || location.ltd == null || location.lng == null) {
                return socket.emit("error", "Invalid location");
            }
            // Store as GeoJSON [lng, lat] for 2dsphere $near matching.
            await captainModel.findByIdAndUpdate(userId, {
                status: "active",
                location: { type: "Point", coordinates: [location.lng, location.ltd] }
            });
        });

        socket.on("destination-coordinates", (data) => {
            // Prefer targeting the assigned captain's room; fall back to broadcast
            // for older clients that don't send captainId.
            if (data?.captainId) {
                io.to(data.captainId).emit("destination-coordinates", data);
            } else {
                io.emit("destination-coordinates", data);
            }
        });

        socket.on("disconnect", () => {
            console.log(`Client disconnected: ${socket.id}`);
        });
    });
};

export const sendMessageToSocketId = (socketId, messageObject) => {
    if (!io) return console.error("Socket.io is not initialized");
    if (!socketId) return;
    io.to(socketId).emit(messageObject.event, messageObject.data);
};
