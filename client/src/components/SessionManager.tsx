import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAuthenticated, isSessionExpiringSoon, authAPI, getSessionInfo } from '../services/api';

interface SessionManagerProps {
  children: React.ReactNode;
}

export const SessionManager: React.FC<SessionManagerProps> = ({ children }) => {
  const [showWarning, setShowWarning] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const navigate = useNavigate();

  useEffect(() => {
    const checkSession = () => {
      if (!isAuthenticated()) {
        navigate('/login', { replace: true });
        return;
      }

      if (isSessionExpiringSoon()) {
        const session = getSessionInfo();
        if (session) {
          const expiresAt = new Date(session.expiresAt);
          const now = new Date();
          const minutesLeft = Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60));
          
          setTimeLeft(minutesLeft);
          setShowWarning(true);
        }
      } else {
        setShowWarning(false);
      }
    };

    // Check immediately
    checkSession();

    // Check every minute
    const interval = setInterval(checkSession, 60000);

    return () => clearInterval(interval);
  }, []);

  const handleExtendSession = async () => {
    try {
      await authAPI.refreshToken();
      setShowWarning(false);
    } catch (error) {
      console.error('Failed to refresh token:', error);
      authAPI.logout();
    }
  };

  return (
    <>
      {showWarning && (
        <div className="session-warning">
          <div className="warning-content">
            <span>Session expires in {timeLeft} minutes</span>
            <button onClick={handleExtendSession}>Extend Session</button>
            <button onClick={authAPI.logout}>Logout</button>
          </div>
        </div>
      )}
      {children}
    </>
  );
};