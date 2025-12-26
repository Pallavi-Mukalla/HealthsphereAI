# HealthSphere AI - Project Documentation

## Overview

HealthSphere AI is an intelligent health assistant application that helps users analyze symptoms, predict diseases, determine urgency levels, and recommend appropriate doctors. The system uses a combination of Machine Learning models and Google's Gemini AI to provide accurate medical guidance.

## Technology Stack

### Frontend
- **React 18** - Modern UI framework
- **Axios** - HTTP client for API calls
- **CSS3** - Dark theme styling with gradients

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
- **Voice Input**: Spoken descriptions (Web Speech API)
- **Image Input**: Photos of visible symptoms

### 2. Symptom Extraction
- Text is processed to extract medical symptoms
- Keywords are matched against medical symptom database
- Gemini AI assists in extracting additional symptoms if needed
- Key symptoms are identified based on priority

### 3. Disease Prediction

**Primary Method - ML Model:**
- Symptoms are converted to feature vectors
- Trained Random Forest model predicts disease
- Model uses data from `symptomtodiseasemapping` collection

**Fallback - Gemini AI:**
- If ML model returns null or unavailable
- Gemini analyzes symptoms and predicts disease
- Used for image-based analysis

**Conflict Resolution:**
- If ML model and Gemini predict different diseases
- Gemini performs comparative analysis
- Selects the most accurate prediction based on symptoms

### 4. Urgency Determination

**Two-Step Process:**

1. **Check Saved History:**
   - Query `SymptomHistory` collection
   - Match symptoms and disease
   - Retrieve previously determined urgency

2. **Confirm with Gemini:**
   - Ask follow-up questions via Gemini
   - Analyze symptom severity
   - Determine urgency level (low/medium/high/critical)
   - Save to database for future use

### 5. Doctor Recommendation

**Primary Method - Database:**
- Query `doctorslist` collection in MongoDB
- Filter by disease specialty
- Sort by proximity to user location
- Select top 3 doctors

**Fallback - Gemini:**
- If insufficient doctors in database
- Gemini recommends doctors based on disease and location
- Returns structured doctor information

### 6. Results Display
All information is displayed in the chatbot interface:
- Extracted symptoms
- Predicted disease
- Urgency level
- Recommended doctors (top 3)
- Summary of analysis

## Database Schema

### Collections

#### 1. symptomtodiseasemapping
Stores symptom to disease mappings for ML training.

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

#### 3. SymptomHistory (Created by application)
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
- `POST /api/symptoms/extract-voice` - Extract symptoms from voice
- `POST /api/symptoms/extract-image` - Extract symptoms from image

### Disease
- `POST /api/disease/predict` - Predict disease from symptoms
- `POST /api/disease/urgency` - Determine urgency level

### Doctors
- `POST /api/doctors/recommend` - Get doctor recommendations

### Chat
- `POST /api/chat/message` - Send chat message to Gemini

### Health
- `GET /api/health` - Server health check

## Key Features

### 1. Multimodal Input Support
- Text, voice, and image inputs
- Unified processing pipeline
- Context-aware responses

### 2. Intelligent Disease Prediction
- ML model for primary prediction
- Gemini AI for fallback and verification
- Conflict resolution between predictions

### 3. Smart Urgency Detection
- Historical data lookup
- AI-powered follow-up questions
- Persistent storage for future use

### 4. Proximity-Based Doctor Recommendation
- Location-aware recommendations
- Database-first approach
- AI fallback when needed

### 5. Dark Theme UI
- Modern, clean interface
- Responsive design
- Smooth animations

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

## Performance Optimization

1. **Caching**: Symptom history for urgency lookup
2. **Batch Processing**: Multiple symptom extraction
3. **Async Operations**: Non-blocking API calls
4. **Database Indexing**: Indexed queries on SymptomHistory
5. **Model Caching**: Load ML model once at startup

## Future Enhancements

1. **User Authentication**: User accounts and profiles
2. **Appointment Booking**: Direct doctor appointment scheduling
3. **Medical Records**: Store user medical history
4. **Multi-language Support**: Internationalization
5. **Mobile App**: React Native version
6. **Advanced ML**: Deep learning models
7. **Real-time Chat**: WebSocket support
8. **Analytics Dashboard**: Usage statistics

## Limitations

1. **Not a Replacement**: Not a substitute for professional medical advice
2. **Accuracy**: ML model accuracy depends on training data quality
3. **Voice Recognition**: Requires browser support and permissions
4. **Image Analysis**: Limited to visible symptoms
5. **Location Services**: Requires user location for proximity

## Disclaimer

**Important**: This application is for informational purposes only and does not provide medical diagnosis, treatment, or advice. Always consult qualified healthcare professionals for medical concerns. The system should not be used for emergency medical situations.

## License

[Specify your license here]

## Contributors

[List contributors here]

## Support

For issues, questions, or contributions, please refer to the repository's issue tracker.

