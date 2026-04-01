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

## Step 3: Frontend Setup (React)

### 3.1 Install Dependencies

Open a new terminal window:

```bash
cd frontend
npm install
```

### 3.2 Configure API URL (Optional)

Create a `.env` file in the `frontend` directory if you need to change the API URL:

```env
REACT_APP_API_URL=http://localhost:5000
```

### 3.3 Start the Frontend

```bash
npm start
```

The frontend will run on `http://localhost:3000` and automatically open in your browser.

## Step 4: Test the Application

1. Open `http://localhost:3000` in your browser
2. You should see the HealthSphere AI chatbot interface
3. Try entering symptoms like: "I have a headache and fever"
4. The system will:
   - Extract symptoms
   - Predict disease (using ML model → MongoDB → Gemini)
   - Ask follow-up questions to determine urgency
   - Recommend top 3 doctors
   - Display results in the chat


## Development Workflow

1. **Start Backend:** `cd backend && npm run dev`
2. **Start Frontend:** `cd frontend && npm start` (in new terminal)
3. **Make changes** to code
4. **Test** in browser at `http://localhost:3000`
5. **Check logs** in terminal for errors

