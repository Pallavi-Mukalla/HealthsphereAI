const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
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
const symptomRoutes = require('./routes/symptoms');
const diseaseRoutes = require('./routes/disease');
const doctorRoutes = require('./routes/doctors');
const chatRoutes = require('./routes/chat');

app.use('/api/symptoms', symptomRoutes);
app.use('/api/disease', diseaseRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/chat', chatRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'HealthSphere AI Server is running' });
});

app.listen(PORT, () => {
  console.log(`✓ Server running on port ${PORT}`);
});

