import React, { createContext, useEffect } from "react";
import socket from "../lib/socket";

export const SocketContext = createContext();

export default function SocketProvider({ children }) {
  useEffect(() => {
    const onConnect = () => console.log("socket connected");
    const onDisconnect = () => console.log("socket disconnected");
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
}
