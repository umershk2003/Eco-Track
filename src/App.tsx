import React, { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import AuthOnboarding from './components/AuthOnboarding';
import CitizenView from './components/CitizenView';
import CollectorView from './components/CollectorView';
import AdminView from './components/AdminView';
import ChatbotBubble from './components/ChatbotBubble';
import VerifyEmail from './pages/VerifyEmail';
import { Leaf } from 'lucide-react';

export default function App() {
  const { user, profile, loading, logout, updateUserProfileState } = useAuth();
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('ecotrack_dark_mode') === 'true';
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('ecotrack_dark_mode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('ecotrack_dark_mode', 'false');
    }
  }, [darkMode]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-natural-dark text-white font-sans">
        <div className="bg-natural-medium/30 p-5 rounded-[24px] mb-4 border border-natural-light/20 animate-bounce">
          <Leaf size={40} className="text-natural-light" />
        </div>
        <h2 className="text-xl font-bold tracking-tight">EcoTrack</h2>
        <p className="text-xs text-natural-light mt-1 opacity-90">Bootstrapping Hyderabad Pilot Demo...</p>
        <div className="mt-6 w-40 h-1 bg-natural-medium rounded-full overflow-hidden">
          <div className="h-full bg-natural-light animate-pulse w-2/3 rounded-full" />
        </div>
      </div>
    );
  }

  // Render Login / Registration screen if unauthenticated
  if (!user || !profile) {
    return <AuthOnboarding onAuthSuccess={updateUserProfileState} />;
  }

  // Force email verification if using native Firebase Auth and email is unverified
  const isEmailUnverified = user && !user.isFallback && !user.emailVerified;
  if (isEmailUnverified) {
    return <VerifyEmail />;
  }

  const handleSignOut = async () => {
    await logout();
  };

  const handleProfileUpdate = (updatedProfile: any) => {
    updateUserProfileState(updatedProfile);
  };

  // Route to the corresponding role-based dashboard
  return (
    <>
      {profile.role === 'admin' || profile.role === 'super_admin' ? (
        <AdminView 
          profile={profile} 
          onSignOut={handleSignOut} 
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode(!darkMode)}
        />
      ) : profile.role === 'collector' ? (
        <CollectorView 
          profile={profile} 
          onSignOut={handleSignOut} 
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode(!darkMode)}
        />
      ) : (
        <CitizenView 
          profile={profile} 
          onProfileUpdate={handleProfileUpdate} 
          onSignOut={handleSignOut} 
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode(!darkMode)}
        />
      )}

      {/* Floating Chatbot on all citizen screen layouts */}
      {profile.role === 'citizen' && (
        <ChatbotBubble userId={profile.uid} language={profile.language || 'en'} />
      )}
    </>
  );
}
