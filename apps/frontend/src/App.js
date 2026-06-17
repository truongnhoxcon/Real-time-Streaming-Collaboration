import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { ChatProvider } from './context/ChatContext.js';
import LandingPage from './pages/LandingPage.js';
import MainAppPage from './pages/MainAppPage.js';
import LoginPage from './pages/LoginPage.js';

function AppContent() {
  const [route, setRoute] = useState(window.location.hash);
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(window.location.hash);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Protect #app route and redirect if already authenticated
  useEffect(() => {
    if (!loading) {
      if (route === '#app' && !isAuthenticated) {
        window.location.hash = '#login';
      } else if ((route === '#login' || route === '#register') && isAuthenticated) {
        window.location.hash = '#app';
      }
    }
  }, [route, isAuthenticated, loading]);

  if (loading) {
    return (
      <div className="min-h-screen w-screen bg-[#1E1F22] flex items-center justify-center text-white font-sans select-none">
        <div className="flex flex-col items-center gap-4">
          <span className="w-10 h-10 border-4 border-[#5865F2]/20 border-t-[#5865F2] rounded-full animate-spin"></span>
          <span className="text-sm font-bold text-gray-400">Restoring session...</span>
        </div>
      </div>
    );
  }

  if (route === '#app') {
    return <MainAppPage />;
  }

  if (route === '#login' || route === '#register') {
    return <LoginPage />;
  }

  return <LandingPage />;
}

function App() {
  return (
    <AuthProvider>
      <ChatProvider>
        <AppContent />
      </ChatProvider>
    </AuthProvider>
  );
}

export default App;

