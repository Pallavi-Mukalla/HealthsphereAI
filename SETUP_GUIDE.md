# HealthSphere AI - Setup Guide for Collaborators

This guide will help you set up and run the HealthSphere AI project from GitHub.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
- **Python** (v3.8 or higher) - [Download](https://www.python.org/)
- **MongoDB Atlas Account** - [Sign up](https://www.mongodb.com/cloud/atlas)
- **Google Gemini API Key** - [Get API Key](https://makersuite.google.com/app/apikey)
- **Git** - [Download](https://git-scm.com/)

## Step 1: Clone the Repository

```bash
git clone <repository-url>
cd HealthspherAI
```

## Step 2: Backend Setup (Node.js/Express)

### 2.1 Install Dependencies

```bash
cd backend
npm install
```

### 2.2 Configure Environment Variables

Create a `.env` file in the `backend` directory:

```env
MONGODB_CONNECTION_STRING=mongodb+srv://username:password@cluster.mongodb.net/healthsphere?retryWrites=true&w=majority
GEMINI_API_KEY=your_gemini_api_key_here
PORT=5000
```

**Important:**
- Replace `MONGODB_CONNECTION_STRING` with your MongoDB Atlas connection string
- Replace `GEMINI_API_KEY` with your Google Gemini API key
- Get MongoDB connection string from: MongoDB Atlas Dashboard → Database → Connect → Connect your application
- Get Gemini API key from: [Google AI Studio](https://makersuite.google.com/app/apikey)

### 2.3 Create Uploads Directory

```bash
mkdir uploads
touch uploads/.gitkeep
```

### 2.4 Start the Backend Server

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The server will run on `http://localhost:5000`

## Step 3: ML Service Setup (Python)

### 3.1 Create Virtual Environment

**Windows:**
```bash
cd ml_service
python -m venv venv
venv\Scripts\activate
```

**Linux/Mac:**
```bash
cd ml_service
python3 -m venv venv
source venv/bin/activate
```

### 3.2 Install Dependencies

```bash
pip install -r requirements.txt
```

### 3.3 Configure Environment Variables (Optional)

Create a `.env` file in the `ml_service` directory if you want to train the model:

```env
MONGODB_CONNECTION_STRING=mongodb+srv://username:password@cluster.mongodb.net/healthsphere?retryWrites=true&w=majority
```

### 3.4 Train the ML Model (Optional)

If you want to train/retrain the model using data from MongoDB:

```bash
python train_model.py
```

This will:
- Load data from `symptomtodiseasemapping` collection in MongoDB
- Train a Random Forest classifier
- Save the model to `ml_service/models/disease_model.pkl`

**Note:** If training data is not available, the system will use MongoDB mapping and Gemini API as fallbacks.

## Step 4: Frontend Setup (React)

### 4.1 Install Dependencies

Open a new terminal window:

```bash
cd frontend
npm install
```

### 4.2 Configure API URL (Optional)

Create a `.env` file in the `frontend` directory if you need to change the API URL:

```env
REACT_APP_API_URL=http://localhost:5000
```

### 4.3 Start the Frontend

```bash
npm start
```

The frontend will run on `http://localhost:3000` and automatically open in your browser.

## Step 5: Verify MongoDB Collections

Ensure your MongoDB Atlas database has the following collections:

1. **symptomtodiseasemapping** - Contains symptom to disease mappings
   - Schema: `{ symptoms: [String], disease: String }`

2. **doctorslist** - Contains doctor information
   - Schema: `{ name: String, specialty: String, specialties: [String], location: { lat: Number, lng: Number, address: String }, rating: Number }`

You can verify this in MongoDB Atlas Dashboard → Database → Browse Collections.

**Note:** The application will also create a `symptomhistories` collection automatically to store user symptom history.

## Step 6: Test the Application

1. Open `http://localhost:3000` in your browser
2. You should see the HealthSphere AI chatbot interface
3. Try entering symptoms like: "I have a headache and fever"
4. The system will:
   - Extract symptoms
   - Predict disease (using ML model → MongoDB → Gemini)
   - Ask follow-up questions to determine urgency
   - Recommend top 3 doctors
   - Display results in the chat

## Troubleshooting

### Backend Issues

**Error: "Cannot connect to MongoDB"**
- Check your `MONGODB_CONNECTION_STRING` in `backend/.env`
- Verify IP address is whitelisted in MongoDB Atlas (Network Access)
- Check username and password are correct

**Error: "GEMINI_API_KEY is not set"**
- Verify `GEMINI_API_KEY` is set in `backend/.env`
- Check the API key is valid

**Error: "Port 5000 already in use"**
- Change `PORT` in `backend/.env` to another port (e.g., 5001)
- Update `REACT_APP_API_URL` in `frontend/.env` accordingly

**Error: "Python not found" (ML Service)**
- Ensure Python is installed and in your PATH
- The backend will fallback to MongoDB mapping and Gemini if ML service is unavailable

### ML Service Issues

**Error: "Python not found"**
- Ensure Python is installed and in your PATH
- Use `python3` instead of `python` on Linux/Mac

**Error: "Model file not found"**
- Run `python train_model.py` to create the model
- Or the system will use MongoDB mapping and Gemini API as fallbacks

### Frontend Issues

**Error: "Cannot connect to API"**
- Ensure backend server is running on port 5000
- Check `REACT_APP_API_URL` in `frontend/.env`
- Check CORS settings in `backend/server.js`

**Error: "Voice recognition not working"**
- Voice recognition requires HTTPS in production
- Use Chrome or Edge browser for best support
- Grant microphone permissions when prompted

**Error: "Location access denied"**
- The app will work without location, but doctor recommendations won't be sorted by proximity
- Grant location permissions when prompted

## Project Structure

```
HealthspherAI/
├── backend/                # Node.js/Express backend
│   ├── routes/             # API routes
│   │   ├── chat.js         # Chat endpoints
│   │   ├── disease.js      # Disease prediction & urgency
│   │   ├── doctors.js       # Doctor recommendations
│   │   └── symptoms.js     # Symptom extraction
│   ├── models/             # MongoDB models
│   │   ├── Doctor.js
│   │   ├── SymptomDiseaseMapping.js
│   │   └── SymptomHistory.js
│   ├── services/           # Business logic
│   │   ├── diseasePredictor.js  # ML + MongoDB + Gemini integration
│   │   ├── geminiService.js     # Gemini API integration
│   │   ├── symptomExtractor.js  # Symptom extraction
│   │   ├── imageProcessor.js    # Image analysis
│   │   └── voiceProcessor.js    # Voice processing (placeholder)
│   ├── uploads/            # Uploaded files
│   ├── server.js           # Main server file
│   └── .env                # Environment variables
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   │   └── Chatbot.js  # Main chatbot component
│   │   ├── App.js          # Main app component
│   │   └── index.js        # Entry point
│   └── .env                # Frontend env vars
├── ml_service/             # Python ML service
│   ├── models/             # Trained ML models
│   ├── disease_predictor.py  # ML prediction script
│   └── train_model.py     # Model training script
├── SETUP_GUIDE.md          # This file
├── PROJECT_DOCUMENTATION.md # Project documentation
└── README.md               # Main README
```

## Development Workflow

1. **Start Backend:** `cd backend && npm run dev`
2. **Start Frontend:** `cd frontend && npm start` (in new terminal)
3. **Make changes** to code
4. **Test** in browser at `http://localhost:3000`
5. **Check logs** in terminal for errors

## Production Deployment

### Backend
- Set `NODE_ENV=production` in environment
- Use process manager like PM2: `pm2 start server.js`
- Configure reverse proxy (nginx) if needed

### Frontend
- Build: `cd frontend && npm run build`
- Serve build folder with a web server
- Configure environment variables for production API URL

### ML Service
- Ensure Python virtual environment is activated
- Model files should be in `ml_service/models/`
- Consider containerizing with Docker

## Additional Resources

- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [Google Gemini API Docs](https://ai.google.dev/docs)
- [Express.js Documentation](https://expressjs.com/)
- [React Documentation](https://react.dev/)

## Getting Help

If you encounter issues:
1. Check the troubleshooting section above
2. Review error messages in terminal/console
3. Verify all environment variables are set correctly
4. Ensure all dependencies are installed
5. Check MongoDB Atlas connection and collections

## Next Steps

After setup:
1. Train the ML model with your data (optional)
2. Populate MongoDB collections with real data
3. Customize the UI/UX as needed
4. Add user authentication if required
5. Deploy to production

Happy coding! 🚀
