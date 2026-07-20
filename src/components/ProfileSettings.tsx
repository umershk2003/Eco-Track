import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { User, Phone, MapPin, Image as ImageIcon, Save, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { i18n } from '../lib/i18n';

interface ProfileSettingsProps {
  onClose?: () => void;
}

export default function ProfileSettings({ onClose }: ProfileSettingsProps) {
  const { profile, user, updateUserProfileState, language } = useAuth();
  const [fullName, setFullName] = useState(profile?.fullName || profile?.displayName || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [area, setArea] = useState(profile?.area || profile?.address || '');
  const [profileImage, setProfileImage] = useState(profile?.profileImage || '');
  
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const t = i18n[language || 'en'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSaving(true);

    try {
      let token = '';
      if (user && typeof user.getIdToken === 'function') {
        token = await user.getIdToken();
      } else {
        token = `fallback_session:${profile?.uid}`;
      }

      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          fullName,
          phone,
          area,
          profileImage
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to update profile settings.');
      }

      const data = await response.json();
      updateUserProfileState(data.profile);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 border border-gray-100 dark:border-stone-800 shadow-xl max-w-lg w-full font-sans text-stone-800 dark:text-stone-100">
      <div className="mb-5">
        <h3 className="text-xl font-extrabold text-stone-900 dark:text-white">Profile Settings</h3>
        <p className="text-xs text-gray-500 dark:text-stone-400 mt-1">
          Update your public profile and contact details. Private variables (UID, Email, Role) cannot be changed.
        </p>
      </div>

      {success && (
        <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-400 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle size={16} />
          Profile updated successfully!
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/30 text-rose-800 dark:text-rose-400 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Full Name */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-500 dark:text-stone-400">Full Name</label>
          <div className="relative">
            <User className="absolute left-3.5 top-3.5 text-gray-400" size={16} />
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-stone-700 bg-transparent rounded-xl focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-1 focus:ring-emerald-500 outline-none text-xs transition"
              placeholder="e.g. Aslam Ali"
            />
          </div>
        </div>

        {/* Phone Number */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-500 dark:text-stone-400">Phone Number</label>
          <div className="relative">
            <Phone className="absolute left-3.5 top-3.5 text-gray-400" size={16} />
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-stone-700 bg-transparent rounded-xl focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-1 focus:ring-emerald-500 outline-none text-xs transition"
              placeholder="e.g. +92 300 1234567"
            />
          </div>
        </div>

        {/* Area / Address */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-500 dark:text-stone-400">Area / Address</label>
          <div className="relative">
            <MapPin className="absolute left-3.5 top-3.5 text-gray-400" size={16} />
            <input
              type="text"
              required
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-stone-700 bg-transparent rounded-xl focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-1 focus:ring-emerald-500 outline-none text-xs transition"
              placeholder="e.g. Latifabad No. 7"
            />
          </div>
        </div>

        {/* Profile Picture URL */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-500 dark:text-stone-400">Profile Image URL</label>
          <div className="relative">
            <ImageIcon className="absolute left-3.5 top-3.5 text-gray-400" size={16} />
            <input
              type="url"
              value={profileImage}
              onChange={(e) => setProfileImage(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-stone-700 bg-transparent rounded-xl focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-1 focus:ring-emerald-500 outline-none text-xs transition"
              placeholder="https://images.unsplash.com/photo-..."
            />
          </div>
          {profileImage && (
            <div className="mt-2 flex items-center gap-3">
              <img 
                src={profileImage} 
                alt="Preview" 
                className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-stone-700"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150';
                }}
              />
              <span className="text-[10px] text-gray-400 dark:text-stone-500">Live picture preview</span>
            </div>
          )}
        </div>

        {/* Immutable Fields Display */}
        <div className="p-3 bg-gray-50 dark:bg-stone-800/50 rounded-2xl space-y-1.5 border border-gray-100 dark:border-stone-800/30">
          <div className="flex justify-between text-[10px] text-gray-400 dark:text-stone-500">
            <span>Email Address:</span>
            <span className="font-mono">{profile?.email}</span>
          </div>
          <div className="flex justify-between text-[10px] text-gray-400 dark:text-stone-500">
            <span>Security Role:</span>
            <span className="font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">{profile?.role}</span>
          </div>
          <div className="flex justify-between text-[10px] text-gray-400 dark:text-stone-500">
            <span>Account Status:</span>
            <span className="font-semibold text-gray-600 dark:text-stone-400 uppercase">{profile?.status || 'active'}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end pt-2">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-800 dark:text-stone-400 dark:hover:text-stone-200 hover:bg-gray-100 dark:hover:bg-stone-800 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <RefreshCw className="animate-spin" size={14} />
            ) : (
              <Save size={14} />
            )}
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}
