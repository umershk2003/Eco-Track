import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { ArrowLeft, Mail, ChevronLeft, Send, CheckCircle } from 'lucide-react';
import { i18n } from '../lib/i18n';

interface ForgotPasswordProps {
  onBack: () => void;
}

export default function ForgotPassword({ onBack }: ForgotPasswordProps) {
  const { resetPassword, language } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const t = i18n[language || 'en'] as any;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await resetPassword(email);
      setSuccess(true);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Failed to send password reset email. Check if the address is correct.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-natural-bg text-stone-850 p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
        <button 
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-800 transition mb-6 cursor-pointer"
        >
          <ChevronLeft size={16} />
          {t.back_to_login || 'Back to Login'}
        </button>

        {success ? (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={36} />
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">Reset Link Sent</h2>
            <p className="text-sm text-gray-500 mb-8 max-w-xs mx-auto">
              We have sent a secure password reset link to <strong>{email}</strong>. Please check your inbox and spam folder.
            </p>
            <button
              onClick={onBack}
              className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition"
            >
              Return to Sign-In
            </button>
          </div>
        ) : (
          <div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">Forgot Password?</h2>
            <p className="text-xs text-gray-500 mb-6 leading-relaxed">
              No problem! Enter your registered email address below and we will send you a secure link to reset your account password.
            </p>

            {error && (
              <div className="mb-4 p-3.5 bg-rose-50 border-l-4 border-rose-500 text-rose-700 text-xs rounded-r-lg">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 text-gray-400" size={18} />
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-sm transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition disabled:opacity-50 cursor-pointer flex justify-center items-center gap-2 mt-4 shadow-md shadow-emerald-600/10"
              >
                {loading ? 'Sending link...' : 'Send Reset Instructions'}
                <Send size={16} />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
