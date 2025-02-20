import { io } from "socket.io-client";

let socket;

export async function connectToSocket() {
    if(socket?.connected) {
        return socket;
    }

    socket = io("http://localhost:8000");

    socket.connect();
    return socket;
}