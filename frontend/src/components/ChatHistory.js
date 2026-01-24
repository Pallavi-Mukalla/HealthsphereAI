import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { getTranslation } from '../utils/translations';
import './ChatHistory.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const ChatHistory = ({ onClose }) => {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, diagnosis, chat
  const userLanguage = user?.language || 'en';
  const t = (key) => getTranslation(key, userLanguage);

  useEffect(() => {
    fetchHistory();
  }, [filter]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const params = filter !== 'all' ? { type: filter } : {};
      const res = await axios.get(`${API_BASE_URL}/api/history`, { params });
      setHistory(res.data.history || []);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(userLanguage === 'hi' ? 'hi-IN' : userLanguage === 'te' ? 'te-IN' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatResponse = (response) => {
    if (typeof response === 'string') return response;
    if (response.finalDisease) {
      return `${response.finalDisease} - ${response.urgencySentence || ''}`;
    }
    return JSON.stringify(response);
  };

  const restoreConversation = (item) => {
    // Build conversation messages from history item - Complete flow
    const conversationMessages = [];
    
    // Step 1: Add user input
    conversationMessages.push({
      type: 'user',
      text: item.input,
      timestamp: new Date(item.createdAt)
    });

    // Add bot response based on type
    if (item.type === 'diagnosis') {
      const response = item.response;
      
      // Step 2: Show initial disease (if different from final)
      if (response.initialDisease && response.initialDisease !== response.finalDisease) {
        conversationMessages.push({
          type: 'bot',
          text: `${t('initialDiagnosis')}: ${response.initialDisease}`,
          timestamp: new Date(item.createdAt)
        });
      }
      
      // Step 3: Show follow-up questions and answers interleaved
      const followUpQuestions = response.followUpQuestions || [];
      const followUpAnswers = response.followUpAnswers || [];
      
      if (followUpQuestions.length > 0) {
        followUpQuestions.forEach((q, idx) => {
          // Bot asks question
          conversationMessages.push({
            type: 'bot',
            text: q,
            timestamp: new Date(item.createdAt)
          });
          // User answers (if available)
          if (followUpAnswers[idx]) {
            conversationMessages.push({
              type: 'user',
              text: followUpAnswers[idx],
              timestamp: new Date(item.createdAt)
            });
          }
        });
      }
      
      // Step 4: Show disease change notification (if applicable)
      if (response.diseaseChanged && response.changeReason) {
        conversationMessages.push({
          type: 'bot',
          text: `⚠️ ${t('diagnosisUpdated')}: ${response.changeReason}`,
          timestamp: new Date(item.createdAt)
        });
      }
      
      // Step 5: Show final disease & explanation
      if (response.explanation) {
        conversationMessages.push({
          type: 'bot',
          text: response.explanation,
          timestamp: new Date(item.createdAt)
        });
      } else if (response.finalDisease) {
        conversationMessages.push({
          type: 'bot',
          text: `${t('finalDiagnosis')}: ${response.finalDisease}`,
          timestamp: new Date(item.createdAt)
        });
      }
      
      // Step 6: Show urgency
      if (response.urgencySentence) {
        conversationMessages.push({
          type: 'bot',
          text: `⚠️ ${t('urgencyLevel')}:\n${response.urgencySentence}`,
          timestamp: new Date(item.createdAt)
        });
      }
      
      // Step 7: Show doctor recommendations
      if (response.recommendedDoctors && response.recommendedDoctors.length > 0) {
        conversationMessages.push({
          type: 'bot',
          text: `🏥 ${t('recommendedDoctors')}:`,
          timestamp: new Date(item.createdAt)
        });
        response.recommendedDoctors.forEach((doctor, idx) => {
          let doctorInfo = `\n${idx + 1}. ${doctor.name}`;
          doctorInfo += `\n   ${t('specialty')}: ${doctor.specialty}`;
          doctorInfo += `\n   ${t('hospitalClinic')}: ${doctor.hospital || t('notSpecified')}`;
          if (doctor.location) {
            const address = [doctor.location.address, doctor.location.city, doctor.location.state]
              .filter(Boolean).join(', ');
            if (address) {
              doctorInfo += `\n   ${t('location')}: ${address}`;
            }
          }
          if (doctor.distance !== null && doctor.distance !== undefined) {
            doctorInfo += `\n   ${t('distance')}: ${doctor.distance.toFixed(1)} km`;
          }
          conversationMessages.push({
            type: 'bot',
            text: doctorInfo,
            timestamp: new Date(item.createdAt)
          });
        });
      }
    } else if (item.type === 'chat') {
      // For chat type, response is a string
      conversationMessages.push({
        type: 'bot',
        text: typeof item.response === 'string' ? item.response : JSON.stringify(item.response),
        timestamp: new Date(item.createdAt)
      });
    }

    // Dispatch event to restore conversation in Chatbot
    window.dispatchEvent(new CustomEvent('restoreConversation', {
      detail: { conversationMessages }
    }));

    // Close history modal
    onClose();
  };

  return (
    <div className="chat-history-overlay" onClick={onClose}>
      <div className="chat-history-modal" onClick={(e) => e.stopPropagation()}>
        <div className="chat-history-header">
          <h2>{t('history')}</h2>
          <button className="chat-history-close" onClick={onClose}>×</button>
        </div>

        <div className="chat-history-filters">
          <button
            className={filter === 'all' ? 'active' : ''}
            onClick={() => setFilter('all')}
          >
            {t('history')}
          </button>
          <button
            className={filter === 'diagnosis' ? 'active' : ''}
            onClick={() => setFilter('diagnosis')}
          >
            {t('diagnosisHistory')}
          </button>
          <button
            className={filter === 'chat' ? 'active' : ''}
            onClick={() => setFilter('chat')}
          >
            {t('chatHistory')}
          </button>
        </div>

        <div className="chat-history-content">
          {loading ? (
            <div className="chat-history-loading">{t('loading')}</div>
          ) : history.length === 0 ? (
            <div className="chat-history-empty">{t('noHistory')}</div>
          ) : (
            <div className="chat-history-list">
              {history.map((item) => (
                <div 
                  key={item._id} 
                  className="chat-history-item"
                  onClick={() => restoreConversation(item)}
                  style={{ cursor: 'pointer' }}
                  title={t('clickToView')}
                >
                  <div className="chat-history-item-header">
                    <span className="chat-history-type">{item.type}</span>
                    <span className="chat-history-date">{formatDate(item.createdAt)}</span>
                  </div>
                  <div className="chat-history-input">
                    <strong>{t('question')}:</strong> {item.input}
                  </div>
                  <div className="chat-history-response">
                    <strong>{t('response')}:</strong> {formatResponse(item.response)}
                  </div>
                  {item.disease && (
                    <div className="chat-history-disease">
                      <strong>{t('disease')}:</strong> {item.disease}
                    </div>
                  )}
                  <div className="chat-history-restore-hint">
                    {t('clickToViewFull')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatHistory;
