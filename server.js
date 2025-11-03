const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*' }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server listening on ${PORT}`));

io.on('connection', (socket) => {
    console.log('Client connectat:', socket.id);

    socket.on('registerPlatform', (platform) => {
        console.log(` ${socket.id} registrado como ${platform}`);
        socket.join(platform);
    });

    socket.on('llistaVideos', () => {
        const videos = [
            "Introducción a JavaScript",
            "Cómo crear una API con Node.js y Express",
            "Aprende SQL desde cero",
            "Diseño de interfaces con Figma",
            "Curso básico de React",
            "Instalación y configuración de MongoDB",
            "Tutorial de Git y GitHub para principiantes",
            "Seguridad y cifrado en aplicaciones web",
            "Cómo usar Docker para desarrollo web",
            "Deploy de una app Angular en Vercel"
        ];

        socket.emit('videos', videos);
    });

    socket.on('disconnect', () => {
        console.log('Client desconectat:', socket.id);
    });
});