const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const pool = require('./db');
const verificarPassword = require('./verificarPassword');

const app = express();
app.use(cors());
app.use(express.json())
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*' }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server listening on ${PORT}`));

const usuariTipus = {
    FREE: 'user',
    PREMIUM: 'premium_user',
    ADMIN: 'admin'
}

const videos = [
    {id: 1, nombre_archivo:'video1.mp4', codigo: null,permitido:false,rol: usuariTipus.FREE},
    {id: 2, nombre_archivo: 'video2.mp4', codigo: null,permitido:false,rol: usuariTipus.PREMIUM}
];

app.get('/videos/:filename',verificarToken, (req, res) => {
    const video = videos.find(v => v.nombre_archivo === req.params.filename);
    if (!video) return res.status(404).send('Video no encontrado');
    if (!video.permitido) return res.status(403).send('No permitido');

    if (video.rol === usuariTipus.PREMIUM && req.user.rol !== usuariTipus.PREMIUM && req.user.rol !== usuariTipus.ADMIN) {
        return res.status(403).send('Només per a usuaris premium');
    }

    res.sendFile(path.join(__dirname, 'videos', video.nombre_archivo));
});

const JWT_SECRET = 'streamvi_super_secret';

io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
        return next(new Error('No token'));
    }

    try {
        socket.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (err) {
        next(new Error('Token invàlid'));
    }
});


io.on('connection', (socket) => {
    if (!socket.user) {
        socket.disconnect();
        return;
    }
    console.log('Client connectat:', socket.id);

    // Registrar plataforma
    socket.on('registerPlatform', (platform) => {
        console.log(`${socket.id} registrat com ${platform}`);
        socket.join(platform);
    });

    //Demana un vídeo
    socket.on('pedirVideo', ({ nombre_archivo }) => {
        const video = videos.find(v => v.nombre_archivo === nombre_archivo);
        if (!video) {
            socket.emit('videoAsignado', { error: 'Video no encontrado' });
            return;
        }

        if (
            video.rol === usuariTipus.PREMIUM &&
            socket.user.rol !== usuariTipus.PREMIUM &&
            socket.user.rol !== usuariTipus.ADMIN
        ) {
            return socket.emit('videoAsignado', { error: 'Només per a usuaris premium' });
        }


        video.codigo = generarCodigo();
        video.permitido = false;

        socket.emit('videoAsignado', {
            id: video.id,
            nombre_archivo: video.nombre_archivo,
            codigo: video.codigo,
            url: `/videos/${video.nombre_archivo}`
        });

        console.log(socket.url)

        console.log(`Vídeo ${video.nombre_archivo} assignat amb codi ${video.codigo}`);
    });

    //Envia codi per validar
    socket.on('validarCodigo', ({codigo}) => {
        const video = videos.find(v => v.codigo === codigo);
        if (!video) return socket.emit('validacion', { ok: false, mensaje: 'Video no encontrado' });

        if (video.codigo === codigo) {
            video.permitido = true;
            io.to('PC').emit('permisoVideo', { id: video.id, nombre_archivo: video.nombre_archivo });
            socket.emit('validacion', { ok: true, mensaje: 'Codi correcte' });
            console.log(`Codi correcte per vídeo ${video.nombre_archivo}`);
        } else {
            socket.emit('validacion', { ok: false, mensaje: 'Codi incorrecte' });
            console.log(`Codi incorrecte intentat per vídeo ${video.nombre_archivo}`);
        }
    });

    // Llista vídeos disponibles (per A2)
    socket.on('llistaVideos', () => {
        const lista = videos.map(video => ({
            nombre_archivo: video.nombre_archivo,
            rol: video.rol
        }));
        socket.emit('videos', lista);
    });

    socket.on('disconnect', () => {
        console.log('Client desconnectat:', socket.id);
    });
});

app.post('/login', async (req, res) => {
    const { usuari, contrasenya } = req.body;

    if (!usuari || !contrasenya) {
        return res.status(400).json({ error: 'Falten credencials' });
    }

    try {
        const [rows] = await pool.query(
            'SELECT USUARI, ROL, HASH, SALT FROM usuaris WHERE USUARI = ?',
            [usuari]
        );

        if (rows.length === 0) {
            return res.status(401).json({ error: 'Usuari incorrecte' });
        }

        const { USUARI, ROL, HASH, SALT } = rows[0];


        const passwordCorrecte = verificarPassword(
            contrasenya,
            SALT,
            HASH
        );

        if (!passwordCorrecte) {
            return res.status(401).json({ error: 'Contrasenya incorrecta' });
        }

        const JWT_SECRET = 'streamvi_super_secret';

        const token = jwt.sign(
            {
                usuari: USUARI,
                rol: ROL
            },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        console.log(`Login correcte | Usuari: ${USUARI} | Rol: ${ROL}`);

        res.json({
            message: 'Login correcte',
            token,
            rol: ROL
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al fer login' });
    }
});


function generarCodigo() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let codigo = '';
    for (let i = 0; i < 4; i++) {
        codigo += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return codigo;
}

function verificarToken(req, res, next) {
    let token = req.headers.authorization?.split(' ')[1];
    if (!token && req.query.token) token = req.query.token;

    if (!token) {
        return res.status(401).json({ error: 'Token requerit' });
    }

    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Token invalid o caducat' });
    }
}

