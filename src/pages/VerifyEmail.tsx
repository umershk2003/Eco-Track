import React, { useState } from 'react';
import { sendEmailVerification } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { Mail, CheckCircle, AlertCircle, RefreshCw, LogOut } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function VerifyEmail() {
  const { logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleResend = async () => {
    setError(null);
    setLoading(true);
    try {
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
        setSent(true);
      } else {
        throw new Error('No active user session detected. Please log in again.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Failed to send verification email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-natural-bg p-4 font-sans text-stone-850">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 border border-gray-100 text-center">
        <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-5 animate-pulse">
          <Mail size={32} />
        </div>

        <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-2">Verify Your Email</h2>
        <p className="text-xs text-gray-500 leading-relaxed mb-6 max-w-sm mx-auto">
          We have registered your account but need to verify your email address. 
          Please check your inbox at <strong>{auth.currentUser?.email}</strong> and click the link to activate your profile.
        </p>

        {sent && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start gap-2.5 text-left text-xs text-emerald-800">
            <CheckCircle className="text-emerald-600 shrink-0 mt-0.5" size={16} />
            <p>Verification link resent successfully! Please check your inbox and junk/spam folders.</p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-2.5 text-left text-xs text-rose-800">
            <AlertCircle className="text-rose-600 shrink-0 mt-0.5" size={16} />
            <p>{error}</p>
          </div>
        )}

        <div className="space-y-3">
          <button
            type="button"
            disabled={loading}
            onClick={handleResend}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition flex items-center justify-center gap-2 shadow shadow-emerald-600/10"
          >
            {loading ? (
              <RefreshCw className="animate-spin" size={16} />
            ) : (
              'Resend Verification Email'
            )}
          </button>

          <button
            type="button"
            onClick={async () => {
              // Wait for refresh
              if (auth.currentUser) {
                await auth.currentUser.reload();
                window.location.reload();
              }
            }}
            className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition"
          >
            I've Verified My Email
          </button>

          <button
            type="button"
            onClick={logout}
            className="w-full py-3 text-xs text-gray-500 hover:text-gray-800 transition flex items-center justify-center gap-1.5"
          >
            <LogOut size={14} />
            Sign Out and Use Different Account
          </button>
        </div>
      </div>
    </div>
  );
}
