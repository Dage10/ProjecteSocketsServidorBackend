const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json())
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*' }
});
app.use('/videos', express.static(path.join(__dirname, 'videos')));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server listening on ${PORT}`));

const videos = [
    {id: 1, nombre_archivo:'video1.mp4', codigo: null,permitido:false},
    {id: 2, nombre_archivo: 'video2.mp4', codigo: null,permitido:false}
];

io.on('connection', (socket) => {
    console.log('Nuevo cliente conectado', socket.id);

    socket.on('pedirVideo', () => {
        const video = videos[Math.floor(Math.random() * videos.length)];
        video.codigo = generarCodigo();
        socket.emit('videoAsignado', { id: video.id, nombre_archivo: video.nombre_archivo, codigo: video.codigo, url: `/videos/${video.nombre_archivo}` });
    });
});

function generarCodigo() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let codigo = '';
    for (let i = 0; i < 4; i++) {
        codigo += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return codigo;
}

app.post('/validarCodigo', (req, res) => {
    const { id, codigo } = req.body;
    const video = videos.find(v => v.id === id);
    if (!video) return res.status(404).json({ ok: false, mensaje: 'Video no encontrado' });

    if (video.codigo === codigo) {
        return res.json({ ok: true, mensaje: 'Codi correcto, reproduccion permitida' });
    } else {
        return res.json({ ok: false, mensaje: 'Codigo incorrecto' });
    }
});

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