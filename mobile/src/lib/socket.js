import { io } from "socket.io-client";
import { API_BASE_URL } from "./config";

// One shared socket.io connection. Same event names as the web app, so the
// backend needs no client-specific changes.
const socket = io(API_BASE_URL, {
  autoConnect: true,
  transports: ["websocket"],
});

export default socket;
