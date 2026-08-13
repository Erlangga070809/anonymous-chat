const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const socketIo = require('socket.io');
const path = require('path');
const config = require('./config');
const { pool } = require('./utils/db');
const { initializeSocket } = require('./utils/socketHandler');

const app = express();
const server = http.createServer(app);

const io = socketIo(server, {
    cors: {
        origin: process.env.NODE_ENV === 'production' ? ['https://your-domain.vercel.app'] : ['http://localhost:3000'],
        methods: ['GET', 'POST'],
        credentials: true
    }
});

app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));

app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? ['https://your-domain.vercel.app'] : ['http://localhost:3000'],
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(express.static('frontend'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const matchRoutes = require('./routes/match.routes');
const chatRoutes = require('./routes/chat.routes');
const uploadRoutes = require('./routes/upload.routes');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/match', matchRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/upload', uploadRoutes);

initializeSocket(io);

app.get('/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ status: 'healthy', timestamp: new Date().toISOString() });
    } catch (error) {
        res.status(500).json({ status: 'unhealthy', error: error.message });
    }
});

app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = { app, server, io };
