// frontend/src/hooks/useSocket.js
import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { getToken } from "../lib/authToken";

let socket = null;

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [socketInstance, setSocketInstance] = useState(null);

  useEffect(() => {
    // The jwt cookie is httpOnly, so document.cookie never contained it and
    // this always bailed out - the socket never connected. Read the copy the
    // server hands back on login/signup instead.
    const token = getToken();

    if (!token) {
      console.log("🔴 No token found - user may not be logged in");
      return;
    }

    if (socket && socket.connected) {
      console.log("🟢 Socket already connected, reusing");
      setSocketInstance(socket);
      setIsConnected(true);
      return;
    }

    console.log("🔄 Creating new socket connection...");
    
    socket = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:5001", {
      auth: { token },
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    socket.on("connect", () => {
      console.log("✅ Socket connected:", socket.id);
      setIsConnected(true);
      setSocketInstance(socket);
    });

    socket.on("disconnect", (reason) => {
      console.log("🔴 Socket disconnected:", reason);
      setIsConnected(false);
    });

    socket.on("connect_error", (error) => {
      console.error("❌ Socket connection error:", error.message);
      setIsConnected(false);
    });

    socket.on("reconnect", (attemptNumber) => {
      console.log("🔄 Socket reconnected after", attemptNumber, "attempts");
      setIsConnected(true);
    });

    socket.on("reconnect_attempt", (attemptNumber) => {
      console.log("🔄 Socket reconnection attempt:", attemptNumber);
    });

    socket.on("reconnect_error", (error) => {
      console.error("❌ Socket reconnection error:", error.message);
    });

    socket.on("reconnect_failed", () => {
      console.error("❌ Socket reconnection failed");
      setIsConnected(false);
    });

    return () => {
      if (socket) {
        console.log("🧹 Cleaning up socket connection");
        socket.off("connect");
        socket.off("disconnect");
        socket.off("connect_error");
        socket.off("reconnect");
        socket.off("reconnect_attempt");
        socket.off("reconnect_error");
        socket.off("reconnect_failed");
        socket.disconnect();
        socket = null;
      }
    };
  }, []);

  return { socket: socketInstance, isConnected };
};