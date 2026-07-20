import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  fallback?: React.ReactNode;
}

export default function RoleGuard({ children, allowedRoles, fallback }: RoleGuardProps) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-natural-bg">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
        <h2 className="text-xl font-extrabold text-stone-900 mb-2">Authentication Required</h2>
        <p className="text-xs text-gray-500 max-w-xs mb-4">Please log in to your account to view this page.</p>
        <button 
          onClick={() => window.location.reload()}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition shadow"
        >
          Go to Sign-In
        </button>
      </div>
    );
  }

  const isAuthorized = allowedRoles.includes(profile.role);
  if (!isAuthorized) {
    if (fallback) return <>{fallback}</>;
    
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-rose-50/50 p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 text-xl font-bold mb-4">
          ⚠️
        </div>
        <h2 className="text-lg font-extrabold text-stone-950 mb-2">Access Unauthorized</h2>
        <p className="text-xs text-stone-600 max-w-sm mb-6 leading-relaxed">
          Your current account role <strong>({profile.role})</strong> is not authorized to access this section. 
          Please contact municipal administrators if you believe this is an error.
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="bg-stone-800 hover:bg-stone-900 text-white text-xs font-bold py-2 px-4 rounded-xl transition"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
