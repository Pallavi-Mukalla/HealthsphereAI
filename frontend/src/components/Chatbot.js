import React, { useState, useRef, useEffect } from 'react';
import './Chatbot.css';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const Chatbot = () => {
  const [messages, setMessages] = useState([
    {
      type: 'bot',
      text: "Hello! I'm HealthSphere AI, your intelligent health assistant. I can help you analyze symptoms through text, voice, or images. How can I assist you today?",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [inputMode, setInputMode] = useState('text'); // text, voice, image
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Initialize Web Speech API for voice input
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      
      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsRecording(false);
      };
      
      recognitionRef.current.onerror = () => {
        setIsRecording(false);
      };
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const addMessage = (text, type = 'bot') => {
    setMessages(prev => [...prev, {
      type,
      text,
      timestamp: new Date()
    }]);
  };

  const handleTextSubmit = async (text) => {
    if (!text.trim()) return;

    addMessage(text, 'user');
    setInput('');
    setIsProcessing(true);

    try {
      // Step 1: Extract symptoms
      const symptomRes = await axios.post(`${API_BASE_URL}/api/symptoms/extract-text`, {
        text
      });

      const { symptoms, keySymptoms } = symptomRes.data;
      addMessage(`I've identified ${symptoms.length} symptom(s): ${symptoms.join(', ')}`);

      // Step 2: Predict disease
      const diseaseRes = await axios.post(`${API_BASE_URL}/api/disease/predict`, {
        symptoms,
        keySymptoms
      });

      const { disease, source } = diseaseRes.data;
      addMessage(`Based on your symptoms, the predicted condition is: **${disease}** (${source})`);

      // Step 3: Determine urgency
      const urgencyRes = await axios.post(`${API_BASE_URL}/api/disease/urgency`, {
        symptoms,
        disease,
        userId: 'user_' + Date.now() // In production, use actual user ID
      });

      const { urgency } = urgencyRes.data;
      addMessage(`Urgency Level: **${urgency.toUpperCase()}**`);

      // Step 4: Get doctor recommendations
      const doctorRes = await axios.post(`${API_BASE_URL}/api/doctors/recommend`, {
        disease,
        urgency,
        userLocation: null // In production, get from user
      });

      const { doctors } = doctorRes.data;
      if (doctors && doctors.length > 0) {
        let doctorMsg = `**Recommended Doctors:**\n\n`;
        doctors.forEach((doc, idx) => {
          doctorMsg += `${idx + 1}. **${doc.name}** - ${doc.specialty}\n`;
          if (doc.rating) doctorMsg += `   Rating: ${doc.rating}⭐\n`;
          if (doc.location) doctorMsg += `   Location: ${doc.location}\n`;
          doctorMsg += `\n`;
        });
        addMessage(doctorMsg);
      }

      // Step 5: Summary
      const summary = `**Summary:**\n\n**Symptoms:** ${symptoms.join(', ')}\n**Disease:** ${disease}\n**Urgency:** ${urgency.toUpperCase()}\n**Doctors Recommended:** ${doctors?.length || 0}`;
      addMessage(summary);

    } catch (error) {
      console.error('Error processing request:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Unknown error';
      addMessage(`I apologize, but I encountered an error: ${errorMessage}. Please try again or check the console for details.`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImageUpload = async (file) => {
    setIsProcessing(true);
    addMessage(`Analyzing image...`, 'user');

    try {
      const formData = new FormData();
      formData.append('image', file);

      const res = await axios.post(`${API_BASE_URL}/api/symptoms/extract-image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const { analysis, disease, symptoms } = res.data;
      addMessage(`Image analysis: ${analysis}`);
      addMessage(`Identified symptoms: ${symptoms.join(', ')}`);
      addMessage(`Predicted condition: **${disease}**`);

      // Continue with urgency and doctor recommendation
      const urgencyRes = await axios.post(`${API_BASE_URL}/api/disease/urgency`, {
        symptoms,
        disease,
        imageAnalysis: analysis
      });

      const { urgency } = urgencyRes.data;
      addMessage(`Urgency Level: **${urgency.toUpperCase()}**`);

      const doctorRes = await axios.post(`${API_BASE_URL}/api/doctors/recommend`, {
        disease,
        urgency
      });

      const { doctors } = doctorRes.data;
      if (doctors && doctors.length > 0) {
        let doctorMsg = `**Recommended Doctors:**\n\n`;
        doctors.forEach((doc, idx) => {
          doctorMsg += `${idx + 1}. **${doc.name}** - ${doc.specialty}\n`;
          if (doc.rating) doctorMsg += `   Rating: ${doc.rating}⭐\n`;
          doctorMsg += `\n`;
        });
        addMessage(doctorMsg);
      }

    } catch (error) {
      console.error('Error processing image:', error);
      addMessage('Error processing image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVoiceStart = () => {
    if (recognitionRef.current) {
      recognitionRef.current.start();
      setIsRecording(true);
    } else {
      addMessage('Voice recognition is not supported in your browser.');
    }
  };

  const handleVoiceStop = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim() && !isProcessing) {
      handleTextSubmit(input);
    }
  };

  return (
    <div className="chatbot-container">
      <div className="chatbot-messages" ref={messagesEndRef}>
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.type}`}>
            <div className="message-content">
              {msg.text.split('\n').map((line, i) => (
                <React.Fragment key={i}>
                  {line.startsWith('**') && line.endsWith('**') ? (
                    <strong>{line.slice(2, -2)}</strong>
                  ) : (
                    line
                  )}
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
          <button
            className={`mode-btn ${inputMode === 'text' ? 'active' : ''}`}
            onClick={() => setInputMode('text')}
            title="Text Input"
          >
            📝
          </button>
          <button
            className={`mode-btn ${inputMode === 'voice' ? 'active' : ''}`}
            onClick={() => setInputMode('voice')}
            title="Voice Input"
          >
            🎤
          </button>
          <button
            className={`mode-btn ${inputMode === 'image' ? 'active' : ''}`}
            onClick={() => {
              setInputMode('image');
              fileInputRef.current?.click();
            }}
            title="Image Input"
          >
            📷
          </button>
        </div>

        {inputMode === 'text' && (
          <form onSubmit={handleSubmit} className="chatbot-input-form">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe your symptoms..."
              disabled={isProcessing}
              className="chatbot-input"
            />
            <button type="submit" disabled={isProcessing || !input.trim()} className="send-btn">
              Send
            </button>
          </form>
        )}

        {inputMode === 'voice' && (
          <div className="voice-controls">
            <button
              onClick={isRecording ? handleVoiceStop : handleVoiceStart}
              className={`voice-btn ${isRecording ? 'recording' : ''}`}
              disabled={isProcessing}
            >
              {isRecording ? '⏹️ Stop' : '🎤 Start Recording'}
            </button>
            {input && (
              <button
                onClick={() => handleTextSubmit(input)}
                className="send-btn"
                disabled={isProcessing}
              >
                Send
              </button>
            )}
          </div>
        )}

        {inputMode === 'image' && (
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => {
              if (e.target.files[0]) {
                handleImageUpload(e.target.files[0]);
              }
            }}
            style={{ display: 'none' }}
          />
        )}
      </div>
    </div>
  );
};

export default Chatbot;

