import { useState, useCallback, useEffect } from 'react';

interface LastSessionData {
  tab: string;
  subtopicId: string;
  skillTab?: string;
  timestamp: number;
}

const STORAGE_KEY = 'teclingo_last_session';
const SESSION_EXPIRY_DAYS = 7;

function getSessionKey(userEmail: string): string {
  return `${STORAGE_KEY}_${userEmail}`;
}

export function useLastSession(userEmail: string | null) {
  const [lastSession, setLastSession] = useState<LastSessionData | null>(null);

  useEffect(() => {
    if (!userEmail) {
      setLastSession(null);
      return;
    }
    const session = getLastSession(userEmail);
    setLastSession(session);
  }, [userEmail]);

  const saveLastSession = useCallback((data: Omit<LastSessionData, 'timestamp'>) => {
    if (!userEmail) return;
    const sessionData: LastSessionData = {
      ...data,
      timestamp: Date.now()
    };
    try {
      localStorage.setItem(getSessionKey(userEmail), JSON.stringify(sessionData));
      setLastSession(sessionData);
    } catch {}
  }, [userEmail]);

  const clearLastSession = useCallback(() => {
    if (!userEmail) return;
    try {
      localStorage.removeItem(getSessionKey(userEmail));
      setLastSession(null);
    } catch {}
  }, [userEmail]);

  const hasRecentSession = (): boolean => {
    if (!lastSession) return false;
    const elapsed = Date.now() - lastSession.timestamp;
    return elapsed < SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
  };

  return {
    lastSession,
    saveLastSession,
    clearLastSession,
    hasRecentSession
  };
}

function getLastSession(userEmail: string): LastSessionData | null {
  try {
    const raw = localStorage.getItem(getSessionKey(userEmail));
    if (!raw) return null;
    const session: LastSessionData = JSON.parse(raw);
    const elapsed = Date.now() - session.timestamp;
    if (elapsed > SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000) {
      localStorage.removeItem(getSessionKey(userEmail));
      return null;
    }
    return session;
  } catch {
    return null;
  }
}
