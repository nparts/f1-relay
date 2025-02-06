// src/index.ts
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { F123UDP } from './udpSocket';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Initialize UDP socket
const udpClient = new F123UDP();

// Handle WebSocket connections
io.on('connection', (socket) => {
    console.log(`[WS] Client connected (id: ${socket.id})`);
    console.log(`[WS] Total clients connected: ${io.engine.clientsCount}`);

    socket.on('disconnect', (reason) => {
        console.log(`[WS] Client disconnected (id: ${socket.id}, reason: ${reason})`);
        console.log(`[WS] Remaining clients: ${io.engine.clientsCount}`);
    });

    socket.on('error', (error) => {
        console.error(`[WS] Socket error (id: ${socket.id}):`, error);
    });
});

// Forward UDP events to WebSocket clients
const forwardEvents = [
    'motion',
    'session',
    'lapData',
    'event',
    'participants',
    'carSetups',
    'carTelemetry',
    'carStatus',
    'finalClassification',
    'lobbyInfo',
    'carDamage',
    'sessionHistory',
    'tyreSets',
    'motionEx'
];

forwardEvents.forEach(eventName => {
    udpClient.on(eventName, (data) => {
        console.log(`[UDP → WS] Received ${eventName} event`);
        
        // Get connected clients count
        const clientsCount = io.engine.clientsCount;

        // convert bigint to string
        data.m_header.session_uid = data.m_header.session_uid.toString();
        io.emit(eventName, data);
        console.log(`[UDP → WS] Forwarded ${eventName} to ${clientsCount} client(s)`);
        
        // For detailed debugging of telemetry data
        if (eventName === 'carTelemetry') {
            console.log('[UDP → WS] Telemetry details:', {
                speed: data.m_carTelemetryData?.[0]?.m_speed,
                rpm: data.m_carTelemetryData?.[0]?.m_engineRPM,
                gear: data.m_carTelemetryData?.[0]?.m_gear,
                throttle: data.m_carTelemetryData?.[0]?.m_throttle,
                brake: data.m_carTelemetryData?.[0]?.m_brake
            });
        }
    });
});

// Start UDP client
udpClient.start();

const PORT = process.env.PORT || 3333;
httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Cleanup on server shutdown
process.on('SIGTERM', () => {
    console.log('Server shutting down...');
    udpClient.stop();
    httpServer.close();
});