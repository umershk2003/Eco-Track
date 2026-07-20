import React, { createContext, useState, useEffect, useContext } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut, 
  sendPasswordResetEmail,
  sendEmailVerification,
  signInWithPopup,
  User as FirebaseUser
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { UserProfile, Language, UserRole } from '../types';

interface AuthContextType {
  user: any | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  language: Language;
  setLanguage: (lang: Language) => void;
  login: (email: string, pass: string) => Promise<UserProfile>;
  registerUser: (email: string, pass: string, profileData: { fullName: string; area: string; phone: string; role?: UserRole; businessName?: string }) => Promise<UserProfile>;
  loginWithGoogle: () => Promise<UserProfile>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfileState: (profile: UserProfile) => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem('ecotrack_lang') as Language) || 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('ecotrack_lang', lang);
    if (profile) {
      updateUserProfileState({ ...profile, language: lang });
    }
  };

  // Helper to get authentication headers
  const getAuthToken = async (): Promise<string | null> => {
    if (auth.currentUser) {
      return auth.currentUser.getIdToken();
    }
    // Fallback token
    if (user?.isFallback) {
      return `fallback_session:${user.uid}`;
    }
    return null;
  };

  const refreshProfile = async () => {
    const token = await getAuthToken();
    if (!token) return;

    try {
      const response = await fetch('/api/auth/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setProfile(data.profile);
        if (user?.isFallback) {
          localStorage.setItem('ecotrack_fallback_profile', JSON.stringify(data.profile));
        }
      }
    } catch (err) {
      console.error('Failed to refresh user profile from server:', err);
    }
  };

  useEffect(() => {
    // 1. Check for fallback profile session first (custom local logins)
    const storedProfile = localStorage.getItem('ecotrack_fallback_profile');
    if (storedProfile) {
      try {
        const parsed = JSON.parse(storedProfile);
        setProfile(parsed);
        setUser({ uid: parsed.uid, email: parsed.email, displayName: parsed.fullName || parsed.displayName, isFallback: true });
        setLoading(false);
      } catch (e) {
        console.error('Failed to parse fallback profile:', e);
      }
    }

    // 2. Setup Firebase state listener
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        localStorage.removeItem('ecotrack_fallback_profile');
        setUser(authUser);
        try {
          const token = await authUser.getIdToken();
          const response = await fetch('/api/auth/profile', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (response.ok) {
            const data = await response.json();
            setProfile(data.profile);
          } else {
            // Profile missing on server, auto-register
            const regResponse = await fetch('/api/auth/register', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                fullName: authUser.displayName || authUser.email?.split('@')[0] || 'Eco User',
                email: authUser.email || '',
                area: 'Hyderabad Center',
                phone: '00000000000'
              })
            });

            if (regResponse.ok) {
              const regData = await regResponse.json();
              setProfile(regData.profile);
            }
          }
        } catch (err) {
          console.error('Error fetching profile from API:', err);
        }
        setLoading(false);
      } else {
        const hasFallback = localStorage.getItem('ecotrack_fallback_profile');
        if (!hasFallback) {
          setUser(null);
          setProfile(null);
          setLoading(false);
        } else {
          setLoading(false);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string): Promise<UserProfile> => {
    setError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), pass);
      const token = await userCredential.user.getIdToken();
      const response = await fetch('/api/auth/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Authentication verified, but profile was not found on the server.');
      }

      const data = await response.json();
      setProfile(data.profile);
      setUser(userCredential.user);
      return data.profile;
    } catch (err: any) {
      setError(err.message || 'Login failed.');
      throw err;
    }
  };

  const registerUser = async (
    email: string, 
    pass: string, 
    profileData: { fullName: string; area: string; phone: string; role?: UserRole; businessName?: string }
  ): Promise<UserProfile> => {
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), pass);
      const token = await userCredential.user.getIdToken();
 
      // Create backend profile in Firestore
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          fullName: profileData.fullName,
          email: email.trim().toLowerCase(),
          area: profileData.area,
          phone: profileData.phone,
          role: profileData.role,
          businessName: profileData.businessName
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to create backend profile.');
      }

      const data = await response.json();
      setProfile(data.profile);
      setUser(userCredential.user);
      return data.profile;
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
      throw err;
    }
  };

  const loginWithGoogle = async (): Promise<UserProfile> => {
    setError(null);
    try {
      const { googleProvider } = await import('../lib/firebase');
      const userCredential = await signInWithPopup(auth, googleProvider);
      const token = await userCredential.user.getIdToken();

      const response = await fetch('/api/auth/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data.profile);
        setUser(userCredential.user);
        return data.profile;
      } else {
        // Register brand new Google user profile
        const regResponse = await fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            fullName: userCredential.user.displayName || 'Eco User',
            email: userCredential.user.email || '',
            area: 'Hyderabad Center',
            phone: '00000000000'
          })
        });

        if (!regResponse.ok) {
          throw new Error('Failed to register Google profile on server.');
        }

        const regData = await regResponse.json();
        setProfile(regData.profile);
        setUser(userCredential.user);
        return regData.profile;
      }
    } catch (err: any) {
      setError(err.message || 'Google Sign-In failed.');
      throw err;
    }
  };

  const logout = async (): Promise<void> => {
    localStorage.removeItem('ecotrack_fallback_profile');
    await signOut(auth);
    setUser(null);
    setProfile(null);
  };

  const resetPassword = async (email: string): Promise<void> => {
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (err: any) {
      setError(err.message || 'Password reset request failed.');
      throw err;
    }
  };

  const updateUserProfileState = (updatedProfile: UserProfile) => {
    setProfile(updatedProfile);
    if (updatedProfile.uid.startsWith('google_fallback_') || updatedProfile.uid.startsWith('user_') || !auth.currentUser) {
      localStorage.setItem('ecotrack_fallback_profile', JSON.stringify(updatedProfile));
      setUser({
        uid: updatedProfile.uid,
        email: updatedProfile.email,
        displayName: updatedProfile.fullName || updatedProfile.displayName || updatedProfile.email.split('@')[0],
        isFallback: true
      });
    } else if (auth.currentUser) {
      setUser(auth.currentUser);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      error,
      language,
      setLanguage,
      login,
      registerUser,
      loginWithGoogle,
      logout,
      resetPassword,
      updateUserProfileState,
      refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
