import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getTranslation, getLanguageName } from '../utils/translations';
import './UserProfile.css';

const UserProfile = () => {
  const { user, logout, updateLanguage } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(user?.language || 'en');
  const [updating, setUpdating] = useState(false);
  const menuRef = useRef(null);

  const userLanguage = user?.language || 'en';
  const t = (key) => getTranslation(key, userLanguage);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitial = () => {
    if (user?.name) {
      return user.name.charAt(0).toUpperCase();
    }
    return 'U';
  };

  const handleLanguageChange = async () => {
    setUpdating(true);
    const result = await updateLanguage(selectedLanguage);
    if (result.success) {
      setShowLanguageModal(false);
      setShowMenu(false);
      // Language change will trigger re-render through AuthContext
      // No need to reload the page
    }
    setUpdating(false);
  };

  if (!user) return null;

  return (
    <>
      <div className="user-profile-container" ref={menuRef}>
        <button
          className="user-avatar"
          onClick={() => setShowMenu(!showMenu)}
          title={user.name}
        >
          {getInitial()}
        </button>

        {showMenu && (
          <div className="profile-menu">
            <div className="profile-menu-header">
              <div className="profile-menu-avatar">{getInitial()}</div>
              <div className="profile-menu-info">
                <div className="profile-menu-name">{user.name}</div>
                <div className="profile-menu-email">{user.email}</div>
              </div>
            </div>
            <div className="profile-menu-divider"></div>
            <button
              className="profile-menu-item"
              onClick={() => {
                setShowProfileModal(true);
                setShowMenu(false);
              }}
            >
              {t('viewProfile')}
            </button>
            <button
              className="profile-menu-item"
              onClick={() => {
                setShowLanguageModal(true);
                setShowMenu(false);
              }}
            >
              {t('changeLanguage')}
            </button>
            <div className="profile-menu-divider"></div>
            <button className="profile-menu-item logout" onClick={logout}>
              {t('logout')}
            </button>
          </div>
        )}
      </div>

      {showProfileModal && (
        <div className="profile-modal-overlay" onClick={() => setShowProfileModal(false)}>
          <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
            <button className="profile-modal-close" onClick={() => setShowProfileModal(false)}>×</button>
            <h2>{t('profile')}</h2>
            <div className="profile-info">
              <div className="profile-info-item">
                <label>{t('name')}</label>
                <div>{user.name}</div>
              </div>
              <div className="profile-info-item">
                <label>{t('email')}</label>
                <div>{user.email}</div>
              </div>
              <div className="profile-info-item">
                <label>{t('language')}</label>
                <div>{getLanguageName(user.language)}</div>
              </div>
            </div>
            <button className="profile-modal-close-btn" onClick={() => setShowProfileModal(false)}>
              {t('close')}
            </button>
          </div>
        </div>
      )}

      {showLanguageModal && (
        <div className="profile-modal-overlay" onClick={() => setShowLanguageModal(false)}>
          <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
            <button className="profile-modal-close" onClick={() => setShowLanguageModal(false)}>×</button>
            <h2>{t('changeLanguage')}</h2>
            <div className="language-selector">
              {['en', 'hi', 'te'].map((lang) => (
                <label key={lang} className="language-option">
                  <input
                    type="radio"
                    name="language"
                    value={lang}
                    checked={selectedLanguage === lang}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                  />
                  <span>{getLanguageName(lang)}</span>
                </label>
              ))}
            </div>
            <div className="profile-modal-actions">
              <button className="profile-modal-btn cancel" onClick={() => setShowLanguageModal(false)}>
                {t('cancel')}
              </button>
              <button
                className="profile-modal-btn save"
                onClick={handleLanguageChange}
                disabled={updating || selectedLanguage === user.language}
              >
                {updating ? t('loading') : t('save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UserProfile;
