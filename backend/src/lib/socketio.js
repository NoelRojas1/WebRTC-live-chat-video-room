import express from 'express';
import { Server } from "socket.io";
import http from "http";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: [
            "http://localhost:5173",
            "http://localhost:5173/",
            "http://192.168.4.107:5173",
            "http://192.168.4.107:5173/"
        ],
    }
});

export function getReceiverSocketId(userId) {
    return userSocketMap[userId];
}

// used to store connectedUsers
let userSocketMap = [
    // {userName, socketId}
];

// room storage
let availableRooms = {
    // roomId: {
    //     participants: []
    // }
};

io.on("connection", (socket) => {
    console.log("Received a new connection", socket.id);

    socket.on('join-room', (roomId) => {
        console.log('Joining room', {roomId, user: socket.id});
        socket.join(roomId);

        // add participant to room
        if(!availableRooms[roomId]) {
            availableRooms[roomId] = {
                participants: [socket.id]
            };
        } else {
            availableRooms[roomId].participants.push(socket.id);
        }

        socket.to(roomId).emit('user-joined', socket.id);
    });

    socket.on('offer', ({ roomId, offer }) => {
        socket.to(roomId).emit('message-from-peer', {
            type: 'offer',
            offer,
            sender: socket.id
        });
    });

    socket.on('answer', ({ roomId, answer }) => {
        socket.to(roomId).emit('message-from-peer', {
            type: 'answer',
            answer,
            sender: socket.id
        });
    });

    socket.on('ice-candidate', ({ roomId, candidate }) => {
        socket.to(roomId).emit('message-from-peer', {
            type: 'candidate',
            candidate,
            sender: socket.id
        });
    });

    socket.on('get-rooms', () => {
        socket.emit('rooms', availableRooms);
    });

    socket.on('disconnect', () => {
        console.log("Disconnected", socket.id);

        // find the room user was in
        const roomId = Object.keys(availableRooms).find(roomId => (
            availableRooms[roomId].participants.includes(socket.id))
        );

        if(availableRooms[roomId]) {
            availableRooms[roomId].participants = availableRooms[roomId].participants.filter(userId => userId !== socket.id);
            if(!availableRooms[roomId].participants.length > 0) {
                // remove the room
                availableRooms = Object.fromEntries(
                    Object.entries(availableRooms).filter(([key]) => {
                        return key !== roomId;
                    })
                );
            }
        }

        // broadcast user disconnection
        io.emit("left", { sender: socket.id });
    })

});

export { io, app, server };