import React, { useState, useRef, useEffect } from 'react';
import './Chatbot.css';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { getTranslation } from '../utils/translations';

const API_BASE_URL =
  process.env.REACT_APP_API_URL ||
  (process.env.NODE_ENV === 'development'
    ? 'http://localhost:5000'
    : 'https://healthsphereai-backend.onrender.com');

const Chatbot = () => {
  const { user } = useAuth();
  const userLanguage = user?.language || 'en';
  const t = (key) => getTranslation(key, userLanguage);
  
  const [messages, setMessages] = useState([
    {
      type: 'bot',
      text: t('welcomeMessage'),
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [inputMode, setInputMode] = useState('text'); // text, voice, image
  const [isRecording, setIsRecording] = useState(false);
  const [followUpQuestions, setFollowUpQuestions] = useState([]);
  const [followUpAnswers, setFollowUpAnswers] = useState([]);
  const [currentContext, setCurrentContext] = useState(null);
  const [userLocation, setUserLocation] = useState(null);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);

  // Update welcome message when language changes (only if it's still the initial message)
  useEffect(() => {
    setMessages(prev => {
      // Only update if it's still the initial welcome message
      if (prev.length === 1 && prev[0].type === 'bot') {
        return [{
          type: 'bot',
          text: getTranslation('welcomeMessage', userLanguage),
          timestamp: new Date()
        }];
      }
      return prev;
    });
  }, [userLanguage]);

  useEffect(() => scrollToBottom(), [messages]);

  useEffect(() => {
    // Get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => console.log('Location access denied')
      );
    }

    // Initialize voice recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.onresult = e => {
        setInput(e.results[0][0].transcript);
        setIsRecording(false);
      };
      recognitionRef.current.onerror = () => setIsRecording(false);
    }
  }, []);

  // Expose function to restore conversation from history
  useEffect(() => {
    const handleRestoreConversation = (event) => {
      const { conversationMessages } = event.detail;
      if (conversationMessages && Array.isArray(conversationMessages)) {
        setMessages(conversationMessages);
        setFollowUpQuestions([]);
        setFollowUpAnswers([]);
        setCurrentContext(null);
      }
    };

    window.addEventListener('restoreConversation', handleRestoreConversation);
    return () => window.removeEventListener('restoreConversation', handleRestoreConversation);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const addMessage = (text, type = 'bot') => {
    if (!text || typeof text !== 'string') return;
    setMessages(prev => [...prev, { type, text, timestamp: new Date() }]);
  };

  // --- Display Doctor Recommendations ---
  const displayDoctorRecommendations = (doctors) => {
    if (!doctors || doctors.length === 0) return;
  
    addMessage(`🏥 ${t('recommendedDoctors')}:`);
  
    doctors.forEach((doctor, index) => {
      // 1. Format the main text info
      let doctorInfo = `\n${index + 1}. ${doctor.name}`;
      doctorInfo += `\n   ${t('specialty')}: ${doctor.specialty}`;
      doctorInfo += `\n   ${t('hospitalClinic')}: ${doctor.hospital || t('notSpecified')}`;
      
      // Use the backend-calculated distance string (e.g., "1.2 km")
      if (doctor.distance) {
        doctorInfo += `\n   ${t('distance')}: ${doctor.distance}`;
      }
  
      const address =
  doctor.location?.address ||
  `${doctor.location?.city || ''}${doctor.location?.city && doctor.location?.state ? ', ' : ''}${doctor.location?.state || ''}`;

if (address && address.trim() !== '') {
  doctorInfo += `\n   ${t('location')}: ${address}`;
}

  
      addMessage(doctorInfo);
  
    });
  };

  // --- Handle Text / Voice Input ---
  const handleTextSubmit = async (text) => {
    if (!text.trim()) return;
    addMessage(text, 'user');
    setIsProcessing(true);
  
    try {
      const res = await axios.post(`${API_BASE_URL}/api/disease/diagnose`, { text, userLocation });
      const { finalDisease, explanation, followUpQuestions: questions = [] } = res.data;

      // Flow: Initial Disease Diagnosis -> Follow-up Questions
      // Show initial disease explanation
      if (explanation) addMessage(explanation);
      else if (finalDisease) addMessage(`${t('initialDiagnosis')}: ${finalDisease}`);

      // Handle follow-up questions (doctors and urgency will come after answers)
      if (questions.length > 0) {
        setFollowUpQuestions(questions);
        setCurrentContext({ text, initialDisease: finalDisease, symptoms: [], originalInput: text });
        addMessage(questions[0]);
      }

    } catch (err) {
      console.error(err);
      addMessage(t('errorProcessingSymptoms'));
    } finally {
      setIsProcessing(false);
    }
  };

  // --- Handle follow-up answers ---
  const handleFollowUpAnswer = async (answer) => {
    const newAnswers = [...followUpAnswers, answer];
    setFollowUpAnswers(newAnswers);
    addMessage(answer, 'user');

    if (newAnswers.length >= followUpQuestions.length) {
      setIsProcessing(true);

      try {
        const requestBody = {
          text: currentContext?.text,
          symptoms: currentContext?.symptoms || [],
          followUpAnswers: newAnswers,
          initialDisease: currentContext?.initialDisease,
          originalInput: currentContext?.originalInput || currentContext?.text,
          followUpQuestions: followUpQuestions,
          userLocation
        };

        const res = await axios.post(`${API_BASE_URL}/api/disease/diagnose`, requestBody);

        const { finalDisease, explanation, urgencySentence, diseaseChanged, changeReason, recommendedDoctors = [] } = res.data;

        // Flow: Final Disease Diagnosis -> Urgency -> Doctor Recommendations
        
        // Show disease change notification if applicable
        if (diseaseChanged && currentContext?.initialDisease) {
          addMessage(`⚠️ ${t('diagnosisUpdated')}: ${t('diseaseChangedMessage')}`);
          if (changeReason) {
            addMessage(`${t('reason')}: ${changeReason}`);
          }
        }

        // Step 1: Show final disease & explanation
        if (explanation) addMessage(explanation);
        else if (finalDisease) addMessage(`${t('finalDiagnosis')}: ${finalDisease}`);

        // Step 2: Show urgency
        if (urgencySentence) {
          addMessage(`\n⚠️ ${t('urgencyLevel')}:\n${urgencySentence}`);
        }

        // Step 3: Show doctor recommendations
        if (recommendedDoctors && recommendedDoctors.length > 0) {
          displayDoctorRecommendations(recommendedDoctors);
        }

      } catch (err) {
        console.error(err);
        addMessage(t('errorDeterminingDiagnosis'));
      } finally {
        setIsProcessing(false);
        // Clear follow-up state after final evaluation
        setFollowUpAnswers([]);
        setFollowUpQuestions([]);
        setCurrentContext(null);
      }
    } else {
      // Ask next follow-up question
      addMessage(followUpQuestions[newAnswers.length]);
    }
  };

  // --- Handle Image Upload ---
  const handleImageUpload = async (file) => {
    if (!file) return;
      addMessage(t('uploadingImage'), 'user');
    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const res = await axios.post(`${API_BASE_URL}/api/symptoms/extract-image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const symptoms = res.data?.symptoms || [];
      const disease = res.data?.disease || 'Unknown';
      const analysis = res.data?.analysis || '';

      if (analysis) addMessage(`${t('imageAnalysis')}: ${analysis}`);
      if (symptoms.length) addMessage(`${t('identifiedSymptoms')}: ${symptoms.join(', ')}`);
      addMessage(`${t('initialPredictedCondition')}: ${disease}`);

      // Call backend to get follow-ups and urgency (same flow as text input)
      const diagnosis = await axios.post(`${API_BASE_URL}/api/disease/diagnose`, { 
        symptoms, 
        userLocation 
      });
      
      const { finalDisease, explanation, followUpQuestions: questions = [], urgencySentence, recommendedDoctors = [] } = diagnosis.data;

      // Show initial disease explanation
      if (explanation) addMessage(explanation);
      else if (finalDisease) addMessage(`${t('initialDiagnosis')}: ${finalDisease}`);

      // Show urgency
      if (urgencySentence) addMessage(urgencySentence);

      // Show doctor recommendations
      if (recommendedDoctors && recommendedDoctors.length > 0) {
        displayDoctorRecommendations(recommendedDoctors);
      }

      // Handle follow-up questions (same as text input)
      if (questions.length > 0) {
        setFollowUpQuestions(questions);
        setCurrentContext({ symptoms, initialDisease: finalDisease, text: null, originalInput: `Image analysis: ${analysis}. Symptoms: ${symptoms.join(', ')}` });
        addMessage(questions[0]);
      }

    } catch (err) {
      console.error(err);
      addMessage(t('errorProcessingImage'));
    } finally {
      setIsProcessing(false);
    }
  };

  // --- Voice Controls ---
  const handleVoiceStart = () => {
    if (recognitionRef.current) {
      recognitionRef.current.start();
      setIsRecording(true);
    } else {
      addMessage('Voice recognition not supported in this browser.');
    }
  };
  const handleVoiceStop = () => {
    recognitionRef.current?.stop();
    setIsRecording(false);
  };

  // Handle generic chat questions (personalized assistant)
  const handleChatQuestion = async (question) => {
    if (!user) {
      addMessage(t('pleaseLogin'));
      return;
    }

    setIsProcessing(true);
    addMessage(question, 'user');

    try {
      const res = await axios.post(`${API_BASE_URL}/api/chat/ask`, { question });
      addMessage(res.data.answer);
    } catch (err) {
      console.error(err);
      addMessage(t('errorProcessing'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    // Check if it's a follow-up question or a general chat question
    if (followUpQuestions.length > 0) {
      handleFollowUpAnswer(input.trim());
    } else {
      handleTextSubmit(input.trim());
    }

    setInput('');
  };

  return (
    <div className="chatbot-container">
      <div className="chatbot-messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.type}`}>
            <div className="message-content">
            {String(msg.text).split('\n').map((line, i) => (
  <React.Fragment key={i}>
    {line}
    {i < msg.text.split('\n').length - 1 && <br />}
  </React.Fragment>
))}
</div>
          </div>
        ))}
        {isProcessing && (
          <div className="message bot">
            <div className="message-content typing">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chatbot-input-container">
        <div className="input-modes">
          <button className={`mode-btn ${inputMode === 'text' ? 'active' : ''}`} onClick={() => setInputMode('text')}>📝</button>
          <button className={`mode-btn ${inputMode === 'voice' ? 'active' : ''}`} onClick={() => setInputMode('voice')}>🎤</button>
          <button className={`mode-btn ${inputMode === 'image' ? 'active' : ''}`} onClick={() => { setInputMode('image'); fileInputRef.current?.click(); }}>📷</button>
        </div>

        {inputMode === 'text' && (
          <form onSubmit={handleSubmit} className="chatbot-input-form">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={followUpQuestions.length > 0 ? t('answerQuestion') : t('askQuestion')}
              disabled={isProcessing}
              className="chatbot-input"
            />
            <button type="submit" disabled={isProcessing || !input.trim()} className="send-btn">{t('send')}</button>
          </form>
        )}

        {inputMode === 'voice' && (
          <div className="voice-controls">
            <button onClick={isRecording ? handleVoiceStop : handleVoiceStart} className={`voice-btn ${isRecording ? 'recording' : ''}`} disabled={isProcessing}>
              {isRecording ? '⏹️ Stop' : '🎤 Start Recording'}
            </button>
            {input && <button onClick={handleSubmit} className="send-btn" disabled={isProcessing}>{t('send')}</button>}
          </div>
        )}

        {inputMode === 'image' && (
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={e => handleImageUpload(e.target.files[0])} />
        )}
      </div>
    </div>
  );
};

export default Chatbot;
