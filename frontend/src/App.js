import React, { useState } from 'react';
import './App.css';
import Chatbot from './components/Chatbot';
import Auth from './components/Auth';
import UserProfile from './components/UserProfile';
import ChatHistory from './components/ChatHistory';
import PersonalizedChat from './components/PersonalizedChat';
import { useAuth } from './context/AuthContext';
import { getTranslation } from './utils/translations';

function App() {
  const { user, loading } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
  const userLanguage = user?.language || 'en';
  const t = (key) => getTranslation(key, userLanguage);

  if (loading) {
    return (
      <div className="App">
        <div className="app-loading">{t('loading')}</div>
      </div>
    );
  }

  return (
    <div className="App">
      <div className="app-container">
        <header className="app-header">
          <div className="app-header-left">
            <h1>{t('appName')}</h1>
            <p>{t('appTagline')}</p>
          </div>
          <div className="app-header-right">
            {user ? (
              <>
                <button className="history-btn" onClick={() => setShowHistory(true)}>
                  {t('history')}
                </button>
                <UserProfile />
              </>
            ) : (
              <button className="login-btn" onClick={() => setShowAuth(true)}>
                {t('login')}
              </button>
            )}
          </div>
        </header>
        <Chatbot />
      </div>
      
      {showAuth && <Auth onClose={() => setShowAuth(false)} />}
      {showHistory && user && <ChatHistory onClose={() => setShowHistory(false)} />}
      
      {/* Personalized Chat Assistant - Right Corner */}
      <PersonalizedChat />
    </div>
  );
}

export default App;

