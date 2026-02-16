const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origins: [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://healthsphereai.onrender.com"
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// VERY IMPORTANT
app.options('*', cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_CONNECTION_STRING, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✓ Connected to MongoDB Atlas'))
.catch(err => console.error('✗ MongoDB connection error:', err));

// Routes
const authRoutes = require('./routes/auth');
const diseaseRoutes = require('./routes/disease');
const doctorRoutes = require('./routes/doctors');
const symptomsRoutes = require('./routes/symptoms');
const mapsRoutes = require('./routes/maps');
const chatRoutes = require('./routes/chat');
const historyRoutes = require('./routes/history');
const profileRoutes = require('./routes/profile');

app.use('/api/auth', authRoutes);
app.use('/api/disease', diseaseRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/symptoms', symptomsRoutes);
app.use('/api/maps', mapsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/profile', profileRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'HealthSphere AI Server is running' });
});

app.listen(PORT, () => {
  console.log(`✓ Server running on port ${PORT}`);
});
