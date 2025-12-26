import React, { useState } from 'react';
import './App.css';
import Chatbot from './components/Chatbot';

function App() {
  return (
    <div className="App">
      <div className="app-container">
        <header className="app-header">
          <h1>🏥 HealthSphere AI</h1>
          <p>Your Intelligent Health Assistant</p>
        </header>
        <Chatbot />
      </div>
    </div>
  );
}

export default App;

