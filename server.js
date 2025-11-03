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
    console.log('Client connectat:', socket.id);

    // Registrar plataforma
    socket.on('registerPlatform', (platform) => {
        console.log(`${socket.id} registrat com ${platform}`);
        socket.join(platform);
    });

    //Demana un vídeo
    socket.on('pedirVideo', () => {
        const video = videos[Math.floor(Math.random() * videos.length)];
        video.codigo = generarCodigo();
        video.permitido = false;

        socket.emit('videoAsignado', {
            id: video.id,
            nombre_archivo: video.nombre_archivo,
            codigo: video.codigo,
            url: `/videos/${video.nombre_archivo}`
        });

        console.log(`Vídeo ${video.nombre_archivo} assignat amb codi ${video.codigo}`);
    });

    //Envia codi per validar
    socket.on('validarCodigo', ({ id, codigo }) => {
        const video = videos.find(v => v.id === Number(id));
        if (!video) return socket.emit('validacion', { ok: false, mensaje: 'Video no encontrado' });

        if (video.codigo === codigo) {
            video.permitido = true;
            // Avisar A1 que pot reproduir el vídeo
            io.to('PC').emit('permisoVideo', { id: video.id });
            socket.emit('validacion', { ok: true, mensaje: 'Codi correcte' });
            console.log(`Codi correcte per vídeo ${video.nombre_archivo}`);
        } else {
            socket.emit('validacion', { ok: false, mensaje: 'Codi incorrecte' });
            console.log(`Codi incorrecte intentat per vídeo ${video.nombre_archivo}`);
        }
    });

    // Llista vídeos disponibles (per A2)
    socket.on('llistaVideos', () => {
        const lista = videos.map(v => v.nombre_archivo);
        socket.emit('videos', lista);
    });

    socket.on('disconnect', () => {
        console.log('Client desconnectat:', socket.id);
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
        video.permitido = true
        return res.json({ ok: true, mensaje: 'Codigo correcto, reproduccion permitida' });
    } else {
        return res.json({ ok: false, mensaje: 'Codigo incorrecto' });
    }
});

