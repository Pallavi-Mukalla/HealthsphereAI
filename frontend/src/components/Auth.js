import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getTranslation, getLanguageName } from '../utils/translations';
import './Auth.css';

const Auth = ({ onClose }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [language, setLanguage] = useState('en');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login, signup } = useAuth();
  const userLanguage = useAuth().user?.language || 'en';
  const t = (key) => getTranslation(key, userLanguage);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (isLogin) {
      const result = await login(email, password);
      if (result.success) {
        onClose();
      } else {
        setError(result.error);
      }
    } else {
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        setLoading(false);
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        setLoading(false);
        return;
      }
      const result = await signup(name, email, password, language);
      if (result.success) {
        onClose();
      } else {
        setError(result.error);
      }
    }
    setLoading(false);
  };

  return (
    <div className="auth-overlay">
      <div className="auth-modal">
        <button className="auth-close" onClick={onClose}>×</button>
        <h2>{isLogin ? t('login') : t('signup')}</h2>
        
        {error && <div className="auth-error">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <>
              <div className="auth-field">
                <label>{t('name')}</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="auth-field">
                <label>{t('language')}</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  required
                >
                  <option value="en">{getLanguageName('en')}</option>
                  <option value="hi">{getLanguageName('hi')}</option>
                  <option value="te">{getLanguageName('te')}</option>
                </select>
              </div>
            </>
          )}
          
          <div className="auth-field">
            <label>{t('email')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className="auth-field">
            <label>{t('password')}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          {!isLogin && (
            <div className="auth-field">
              <label>{t('confirmPassword')}</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          )}
          
          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? t('loading') : (isLogin ? t('login') : t('signup'))}
          </button>
        </form>
        
        <div className="auth-switch">
          {isLogin ? (
            <>
              {t('dontHaveAccount')}{' '}
              <button onClick={() => setIsLogin(false)}>{t('signup')}</button>
            </>
          ) : (
            <>
              {t('alreadyHaveAccount')}{' '}
              <button onClick={() => setIsLogin(true)}>{t('login')}</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
