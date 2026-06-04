import mongoose from "mongoose";

export default function connectToDB() {
    mongoose
        .connect(process.env.DB_CONNECT)
        .then(() => console.log("Connected to DB"))
        .catch((err) => console.error("Error connecting to DB:", err));
}
