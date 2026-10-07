const express = require('express'); // Forced restart

const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db.js');
const authRoutes = require('./routes/authRoutes.js');
const postRoutes = require('./routes/postRoutes.js');
const userRoutes = require('./routes/userRoutes.js');

const chatRoutes = require('./routes/chatRoutes.js');

dotenv.config();

connectDB();

const app = express();
const server = http.createServer(app);

// Helper for socket.io
const io = new Server(server, {
    cors: {
        origin: '*', // In production, restrict this
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
    },
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Socket.IO connection
io.on('connection', (socket) => {
    console.log(`User Connected: ${socket.id}`);

    // User room for private messages
    socket.on('setup', (userData) => {
        socket.join(userData._id);
        socket.emit('connected');
    });

    socket.on('join_chat', (room) => {
        socket.join(room);
    });

    // Typing indicators could go here

    socket.on('disconnect', () => {
        console.log('User Disconnected', socket.id);
    });
});

// Pass io to request
app.use((req, res, next) => {
    req.io = io;
    next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/stories', require('./routes/storyRoutes.js'));
app.use('/api/ai', require('./routes/aiRoutes.js'));

app.get('/', (req, res) => {
    res.send('Instagram Clone API is running...');
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => console.log(`Server started on port ${PORT}`));
