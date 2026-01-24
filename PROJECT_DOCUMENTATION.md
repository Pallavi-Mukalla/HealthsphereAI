# HealthSphere AI - Project Documentation

## Overview

HealthSphere AI is an intelligent health assistant application that helps users analyze symptoms, predict diseases, determine urgency levels, and recommend appropriate doctors. The system uses a combination of Machine Learning models, MongoDB database, and Google's Gemini AI to provide accurate medical guidance.

## Technology Stack

### Frontend
- **React 18** - Modern UI framework
- **Axios** - HTTP client for API calls
- **CSS3** - Dark theme styling with gradients
- **Web Speech API** - Browser-based voice recognition

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **MongoDB** - NoSQL database (MongoDB Atlas)
- **Mongoose** - MongoDB object modeling

### ML Service
- **Python 3.8+** - ML model execution
- **scikit-learn** - Machine learning library
- **Random Forest** - Disease prediction model

### AI Services
- **Google Gemini API** - AI-powered analysis and fallback

## Architecture

```
┌─────────────┐
│   Client    │ (React Frontend)
│  (Browser)  │
└──────┬──────┘
       │ HTTP/REST
       │
┌──────▼──────────────────┐
│   Server (Node.js)      │
│  ┌──────────────────┐   │
│  │  API Routes       │   │
│  │  - /symptoms      │   │
│  │  - /disease       │   │
│  │  - /doctors       │   │
│  │  - /chat          │   │
│  └──────────────────┘   │
│  ┌──────────────────┐   │
│  │  Services         │   │
│  │  - Symptom Extract│   │
│  │  - Disease Predict│   │
│  │  - Gemini AI      │   │
│  │  - Doctor Recommend│   │
│  └──────────────────┘   │
└──────┬───────────┬───────┘
       │           │
       │           │
┌──────▼───┐  ┌───▼──────────┐
│ MongoDB  │  │ ML Service   │
│  Atlas   │  │ (Python)     │
└──────────┘  └──────────────┘
```

## Project Flow

### 1. User Input
Users can provide symptoms through three methods:
- **Text Input**: Typed symptom descriptions
- **Voice Input**: Spoken descriptions (Web Speech API - browser-based)
- **Image Input**: Photos of visible symptoms

### 2. Symptom Extraction
- Text is processed to extract medical symptoms
- Keywords are matched against MongoDB `symptomtodiseasemapping` collection
- Gemini AI assists in extracting additional symptoms if needed
- Key symptoms are identified based on priority

### 3. Disease Prediction

**Three-Tier Approach:**

1. **Primary Method - ML Model (Python):**
   - Symptoms are converted to feature vectors
   - Trained Random Forest model predicts disease
   - Model uses data from `symptomtodiseasemapping` collection
   - Executed via Python script called from Node.js backend

2. **Secondary Method - MongoDB Mapping:**
   - If ML model unavailable or returns null
   - Direct symptom-to-disease mapping from MongoDB
   - Scoring algorithm matches symptoms to diseases

3. **Fallback - Gemini AI:**
   - If both ML model and MongoDB return null
   - Gemini analyzes symptoms and predicts disease
   - Always used for image-based analysis

**Conflict Resolution:**
- If ML model and Gemini predict different diseases
- Gemini performs comparative analysis
- Selects the most accurate prediction based on symptoms
- Returns the resolved disease name

### 4. Urgency Determination

**Two-Step Process:**

1. **Check Saved History:**
   - Query `SymptomHistory` collection
   - Match symptoms and disease
   - Retrieve previously determined urgency

2. **Follow-Up Questions (if needed):**
   - Gemini generates 2-3 follow-up questions
   - Questions focus on severity, duration, impact
   - User answers are collected interactively
   - Answers are used to determine urgency

3. **Confirm with Gemini:**
   - Analyze symptoms, disease, and follow-up answers
   - Determine urgency level (low/medium/high/critical)
   - Save to database for future use

### 5. Doctor Recommendation

**Primary Method - Database:**
- Query `doctorslist` collection in MongoDB
- Filter by disease specialty (exact or regex match)
- Sort by proximity to user location (if available)
- Sort by rating if location unavailable
- Select top 3 doctors

**Fallback - Gemini:**
- If insufficient doctors in database (< 3)
- Gemini recommends doctors based on disease and location
- Returns structured doctor information
- Merged with database results to ensure exactly 3 doctors

### 6. Results Display
All information is displayed in the chatbot interface:
- Extracted symptoms
- Predicted disease (with source: ML/MongoDB/Gemini)
- Urgency level
- Recommended doctors (top 3) with details
- Summary of analysis

## Database Schema

### Collections

#### 1. symptomtodiseasemapping
Stores symptom to disease mappings for ML training and direct lookup.

```javascript
{
  symptoms: [String],      // Array of symptoms
  disease: String,         // Associated disease
  // ... other fields
}
```

#### 2. doctorslist
Stores doctor information.

```javascript
{
  name: String,
  specialty: String,
  specialties: [String],
  location: {
    lat: Number,
    lng: Number,
    address: String,
    city: String,
    state: String
  },
  rating: Number,
  experience: Number,
  qualifications: [String],
  contact: {
    phone: String,
    email: String
  }
}
```

#### 3. symptomhistories (Created by application)
Stores user symptom history for urgency prediction.

```javascript
{
  userId: String,
  symptoms: [String],
  keySymptoms: [String],
  disease: String,
  urgency: String,        // 'low' | 'medium' | 'high' | 'critical'
  location: {
    lat: Number,
    lng: Number
  },
  createdAt: Date,
  updatedAt: Date
}
```

## API Endpoints

### Symptoms
- `POST /api/symptoms/extract-text` - Extract symptoms from text
- `POST /api/symptoms/extract-voice` - Extract symptoms from voice (placeholder)
- `POST /api/symptoms/extract-image` - Extract symptoms from image

### Disease
- `POST /api/disease/predict` - Predict disease from symptoms
- `POST /api/disease/urgency` - Determine urgency level (may return follow-up questions)

### Doctors
- `POST /api/doctors/recommend` - Get doctor recommendations (top 3)

### Chat
- `POST /api/chat/message` - Send chat message to Gemini

### Health
- `GET /api/health` - Server health check

## Key Features

### 1. Multimodal Input Support
- Text, voice (browser-based), and image inputs
- Unified processing pipeline
- Context-aware responses

### 2. Intelligent Disease Prediction
- ML model for primary prediction
- MongoDB mapping as secondary
- Gemini AI for fallback and verification
- Conflict resolution between predictions

### 3. Smart Urgency Detection
- Historical data lookup
- AI-powered follow-up questions
- Interactive Q&A flow
- Persistent storage for future use

### 4. Proximity-Based Doctor Recommendation
- Location-aware recommendations (if user grants permission)
- Database-first approach
- Always returns top 3 doctors
- AI fallback when needed

### 5. Dark Theme UI
- Modern, clean interface
- Responsive design
- Smooth animations
- Chatbot-like experience

## ML Model Details

### Model Type
- **Algorithm**: Random Forest Classifier
- **Features**: Binary symptom vectors
- **Output**: Disease name

### Training Data
- Source: `symptomtodiseasemapping` collection
- Format: Symptom arrays mapped to diseases
- Training: `ml_service/train_model.py`

### Model Files
- `ml_service/models/disease_model.pkl` - Trained model
- `ml_service/models/symptom_mapping.json` - Symptom mappings

### Integration
- Python script executed via Node.js `child_process`
- Fallback to MongoDB and Gemini if model unavailable
- Error handling ensures system always works

## Gemini AI Integration

### Use Cases
1. **Symptom Extraction** - Additional symptom identification
2. **Disease Prediction** - Fallback when ML model unavailable
3. **Image Analysis** - Visual symptom recognition
4. **Conflict Resolution** - Comparing ML and AI predictions
5. **Urgency Determination** - Follow-up questions and analysis
6. **Doctor Recommendation** - When database insufficient
7. **Chatbot Responses** - Conversational interactions

### API Configuration
- Endpoint: Google Generative AI API
- Models: `gemini-pro`, `gemini-pro-vision`
- Authentication: API key from environment variable

## Security Considerations

1. **Environment Variables**: Never commit `.env` files
2. **API Keys**: Store securely, rotate regularly
3. **MongoDB**: Use connection string with credentials
4. **File Uploads**: Validate and sanitize uploaded files
5. **CORS**: Configure appropriately for production
6. **Location Data**: User location is optional and handled securely

## Performance Optimization

1. **Caching**: Symptom history for urgency lookup
2. **Batch Processing**: Multiple symptom extraction
3. **Async Operations**: Non-blocking API calls
4. **Database Indexing**: Indexed queries on SymptomHistory
5. **Model Caching**: Load ML model once at startup (if using persistent service)
6. **Fallback Chains**: Multiple fallback options ensure reliability

## User Flow Example

1. User enters: "I have a headache and fever"
2. System extracts: ["headache", "fever"]
3. ML model predicts: "flu" (or MongoDB/Gemini fallback)
4. System asks: "How long have you been experiencing these symptoms?"
5. User answers: "2 days"
6. System asks: "How severe would you rate your symptoms?"
7. User answers: "7 out of 10"
8. System determines: Urgency = "medium"
9. System recommends: Top 3 doctors (sorted by proximity/rating)
10. System displays: Complete summary

## Limitations

1. **Not a Replacement**: Not a substitute for professional medical advice
2. **Accuracy**: ML model accuracy depends on training data quality
3. **Voice Recognition**: Requires browser support and permissions
4. **Image Analysis**: Limited to visible symptoms
5. **Location Services**: Requires user permission for proximity sorting
6. **Python Dependency**: ML service requires Python (with fallbacks)

## Future Enhancements

1. **User Authentication**: User accounts and profiles
2. **Appointment Booking**: Direct doctor appointment scheduling
3. **Medical Records**: Store user medical history
4. **Multi-language Support**: Internationalization
5. **Mobile App**: React Native version
6. **Advanced ML**: Deep learning models
7. **Real-time Chat**: WebSocket support
8. **Analytics Dashboard**: Usage statistics
9. **Persistent ML Service**: Run Python service as separate microservice

## Disclaimer

**Important**: This application is for informational purposes only and does not provide medical diagnosis, treatment, or advice. Always consult qualified healthcare professionals for medical concerns. The system should not be used for emergency medical situations.

## License

[Specify your license here]

## Contributors

[List contributors here]

## Support

For issues, questions, or contributions, please refer to the repository's issue tracker.
