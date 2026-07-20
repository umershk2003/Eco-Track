import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { ShieldAlert, LogOut, RefreshCw } from 'lucide-react';

export default function Unauthorized() {
  const { logout, profile } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-natural-bg p-4 font-sans text-stone-850">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 border border-gray-100 text-center">
        <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-5 animate-pulse">
          <ShieldAlert size={32} />
        </div>

        <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-2">Access Denied</h2>
        <p className="text-xs text-gray-500 leading-relaxed mb-6 max-w-sm mx-auto">
          Your current account role is <strong>{profile?.role || 'unknown'}</strong>, which is not permitted to view this module.
          If you believe this is an error, please reach out to EcoTrack support or your regional manager.
        </p>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition flex items-center justify-center gap-2"
          >
            <RefreshCw size={16} />
            Refresh and Check Perms
          </button>

          <button
            type="button"
            onClick={logout}
            className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition flex items-center justify-center gap-2"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
