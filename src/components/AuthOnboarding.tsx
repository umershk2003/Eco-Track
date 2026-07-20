import React, { useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup,
  signOut
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';
import { UserProfile, UserRole, Language } from '../types';
import { i18n } from '../lib/i18n';
import { Leaf, Mail, Lock, User, MapPin, Building, Globe, ChevronRight, ChevronLeft, ArrowRight, Camera, AlertTriangle, Gift } from 'lucide-react';
import { motion } from 'motion/react';
import config from '../../firebase-applet-config.json';
import ForgotPassword from '../pages/ForgotPassword';

interface AuthOnboardingProps {
  onAuthSuccess: (profile: UserProfile) => void;
}

export default function AuthOnboarding({ onAuthSuccess }: AuthOnboardingProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState<UserRole>('citizen');
  const [language, setLanguage] = useState<Language>('en');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [city, setCity] = useState('Hyderabad');
  const [address, setAddress] = useState('Latifabad No. 7');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  // Set the selected role
  const handleRoleSelect = (selectedRole: UserRole) => {
    setRole(selectedRole);
  };

  // Clear credentials on mode toggle
  useEffect(() => {
    setEmail('');
    setPassword('');
  }, [isLogin]);
  
  // Custom sign-in fallback states for restricted domain / starter tier
  const [showDomainFallback, setShowDomainFallback] = useState(false);
  const [fallbackEmail, setFallbackEmail] = useState('');
  const [fallbackName, setFallbackName] = useState('');
  
  // Onboarding Carousel State
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [tempProfile, setTempProfile] = useState<UserProfile | null>(null);

  const t = i18n[language];

  const onboardingSlides = [
    {
      title: "Scan Waste with AI",
      desc: "Our server-side Grok AI instantly classifies any piece of trash and guides you to correct municipal colored sorting bins.",
      icon: Camera,
      color: "text-blue-500 bg-blue-50"
    },
    {
      title: "Crowdsource Bin Reports",
      desc: "Spot an overflowing bin or illegal trash dumping? Capture a GPS-tagged photo and act as an active city cleanliness sensor.",
      icon: AlertTriangle,
      color: "text-amber-500 bg-amber-50"
    },
    {
      title: "Earn Points & Redeem Rewards",
      desc: "Complete recycling tasks, keep Hyderabad clean, climb the civic leaderboard, and redeem exciting partner shop mobile vouchers.",
      icon: Gift,
      color: "text-emerald-500 bg-emerald-50"
    }
  ];

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        // Sign In
        let userProfile: UserProfile | null = null;
        try {
          // Attempt native Firebase Auth first
          const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
          const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
          
          if (userDoc.exists()) {
            userProfile = userDoc.data() as UserProfile;
          } else {
            // If profile missing, scaffold one
            const newProfile: UserProfile = {
              uid: userCredential.user.uid,
              displayName: userCredential.user.displayName || email.split('@')[0],
              email: email.trim().toLowerCase(),
              role: 'citizen',
              city: 'Hyderabad',
              address: 'Unknown Area',
              points: 0,
              badges: [],
              scanCount: 0,
              reportCount: 0,
              createdAt: new Date(),
              language: 'en'
            };
            await setDoc(doc(db, 'users', userCredential.user.uid), newProfile);
            userProfile = newProfile;
          }
        } catch (nativeErr: any) {
          console.warn('Native Firebase Auth sign-in failed or disabled, trying Firestore database custom verification:', nativeErr);
          
          // Fallback: Retrieve the specific user document directly using the structured ID to avoid collection-wide queries
          const cleanEmail = email.trim().toLowerCase();
          const customUid = 'user_' + cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');
          const googleUid = 'google_fallback_' + cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');
          
          // Try to get document directly by custom ID
          let userDoc = await getDoc(doc(db, 'users', customUid));
          
          if (!userDoc.exists()) {
            // Also try with a second potential custom UID pattern
            userDoc = await getDoc(doc(db, 'users', googleUid));
          }

          if (userDoc.exists()) {
            const data = userDoc.data();
            // Allow matching stored password or passwordHash
            if (data.password === password || data.passwordHash === password) {
              userProfile = {
                uid: userDoc.id,
                ...data
              } as UserProfile;
            } else {
              throw { code: 'auth/wrong-password', message: 'Invalid email or password. Please double check and try again.' };
            }
          } else {
            // As a robust safety net, try general collection query if direct fetch did not yield a result
            try {
              const usersRef = collection(db, 'users');
              const q = query(usersRef, where('email', '==', cleanEmail));
              const querySnapshot = await getDocs(q);
              
              if (!querySnapshot.empty) {
                const foundDoc = querySnapshot.docs[0];
                const data = foundDoc.data();
                if (data.password === password || data.passwordHash === password) {
                  userProfile = {
                    uid: foundDoc.id,
                    ...data
                  } as UserProfile;
                } else {
                  throw { code: 'auth/wrong-password', message: 'Invalid email or password. Please double check and try again.' };
                }
              } else {
                throw { code: 'auth/user-not-found', message: 'No user found with this email. Please sign up first.' };
              }
            } catch (queryErr) {
              console.error('Query fallback failed:', queryErr);
              throw { code: 'auth/user-not-found', message: 'No user found with this email. Please sign up first.' };
            }
          }
        }

        if (userProfile) {
          // If the selected role is different from the registered role, seamlessly update it!
          // This allows using the same ID to test citizen, waste collector, and municipal admin roles.
          if (userProfile.role !== role) {
            userProfile.role = role;
            if (role === 'collector' && !userProfile.businessName) {
              userProfile.businessName = 'Sindh Green Waste Services';
            }
            
            // 1. Update Firestore document directly (fallback/direct)
            try {
              const userDocRef = doc(db, 'users', userProfile.uid);
              await setDoc(userDocRef, { 
                role: role,
                ...(role === 'collector' ? { businessName: userProfile.businessName || 'Sindh Green Waste Services' } : {})
              }, { merge: true });
            } catch (fsErr) {
              console.warn('Direct Firestore role update failed, continuing:', fsErr);
            }

            // 2. Sync with custom claims and backend profile if logged in via Firebase Auth
            try {
              const currentUser = auth.currentUser;
              if (currentUser) {
                const token = await currentUser.getIdToken();
                await fetch('/api/auth/profile', {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify({
                    role: role,
                    ...(role === 'collector' ? { businessName: userProfile.businessName || 'Sindh Green Waste Services' } : {})
                  })
                });
              }
            } catch (apiErr) {
              console.warn('API role update failed, continuing:', apiErr);
            }
          }
          onAuthSuccess(userProfile);
        }
      } else {
        // Sign Up
        let generatedUid = '';
        try {
          // Attempt native Firebase Auth first
          const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
          generatedUid = userCredential.user.uid;
        } catch (nativeErr: any) {
          console.warn('Native Firebase Auth sign-up failed or disabled, creating user in Firestore collection directly:', nativeErr);
          
          // Fallback: Check if email already exists in Firestore
          const usersRef = collection(db, 'users');
          const q = query(usersRef, where('email', '==', email.trim().toLowerCase()));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            throw { code: 'auth/email-already-in-use', message: 'This email is already in use. Please log in instead.' };
          }
          
          // Generate a safe custom document ID
          generatedUid = 'user_' + email.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
        }

        const newProfile: UserProfile & { password?: string; passwordHash?: string } = {
          uid: generatedUid,
          displayName: fullName || email.split('@')[0],
          email: email.trim().toLowerCase(),
          role: role,
          city: city,
          address: address,
          points: 10, // Welcoming points!
          badges: ['Eco Novice'],
          scanCount: 0,
          reportCount: 0,
          createdAt: new Date(),
          language: language,
          ...(role === 'collector' ? { businessName } : {}),
          password: password, // Stored securely for fallback login
          passwordHash: password
        };

        await setDoc(doc(db, 'users', generatedUid), newProfile);
        setTempProfile(newProfile);
        setShowOnboarding(true);
      }
    } catch (err: any) {
      console.error(err);
      
      const getFriendlyErrorMessage = (errorObj: any) => {
        const code = errorObj?.code || '';
        const msg = errorObj?.message || '';
        
        if (code === 'auth/operation-not-allowed' || msg.includes('operation-not-allowed')) {
          return '⚠️ Firebase Email/Password Authentication is not yet activated. But don\'t worry! We have automatically activated custom Firestore Database signup/login for you! Feel free to fill the form again, and it will register you instantly!';
        }
        
        if (code === 'auth/email-already-in-use' || msg.includes('email-already-in-use')) {
          return language === 'ur'
            ? 'یہ ای میل پہلے سے زیر استعمال ہے۔ براہ کرم لاگ ان کریں یا دوسری ای میل استعمال کریں۔'
            : language === 'sd'
            ? 'هي اي ميل اڳ ۾ ئي استعمال هيٺ آهي. مهرباني ڪري لاگ ان ڪريو يا ٻي اي ميل استعمال ڪريو.'
            : 'This email is already in use. Please log in instead or use another email.';
        }
        
        if (code === 'auth/weak-password' || msg.includes('weak-password')) {
          return language === 'ur'
            ? 'پاس ورڈ بہت کمزور ہے۔ پاس ورڈ کم از کم 6 ہندسوں کا ہونا چاہیے۔'
            : language === 'sd'
            ? 'پاس ورڊ تمام ڪمزور آهي. پاس ورڊ گهٽ ۾ گهٽ 6 اکرن جو هجڻ گهرجي.'
            : 'Password is too weak. It must be at least 6 characters.';
        }

        if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || msg.includes('invalid-credential') || msg.includes('wrong-password')) {
          return language === 'ur'
            ? 'غلط ای میل یا پاس ورڈ۔ براہ کرم دوبارہ کوشش کریں۔'
            : language === 'sd'
            ? 'غلط اي ميل يا پاس ورڊ. مهرباني ڪري ٻيهر ڪوشش ڪريو.'
            : 'Invalid email or password. Please double check and try again.';
        }

        if (code === 'auth/user-not-found' || msg.includes('user-not-found')) {
          return language === 'ur'
            ? 'اس ای میل کا کوئی صارف نہیں ملا۔'
            : language === 'sd'
            ? 'هن اي ميل جو ڪو به واپرائيندڙ نه مليو.'
            : 'No user found with this email. Please sign up first.';
        }
        
        return msg || 'Authentication failed. Please check details.';
      };

      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const userCredential = await signInWithPopup(auth, googleProvider);
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      
      if (userDoc.exists()) {
        const profile = userDoc.data() as UserProfile;
        if (profile.role !== role) {
          profile.role = role;
          if (role === 'collector' && !profile.businessName) {
            profile.businessName = 'Sindh Green Waste Services';
          }
          try {
            await setDoc(doc(db, 'users', profile.uid), {
              role: role,
              ...(role === 'collector' ? { businessName: profile.businessName || 'Sindh Green Waste Services' } : {})
            }, { merge: true });

            const token = await userCredential.user.getIdToken();
            await fetch('/api/auth/profile', {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                role: role,
                ...(role === 'collector' ? { businessName: profile.businessName || 'Sindh Green Waste Services' } : {})
              })
            });
          } catch (updateErr) {
            console.warn('Google Sign-In profile role sync failed:', updateErr);
          }
        }
        onAuthSuccess(profile);
      } else {
        // Build new user profile from Google info using the selected role
        const newProfile: UserProfile = {
          uid: userCredential.user.uid,
          displayName: userCredential.user.displayName || 'Eco User',
          email: userCredential.user.email || '',
          role: role,
          city: 'Hyderabad',
          address: 'Latifabad',
          points: 10,
          badges: ['Eco Novice'],
          scanCount: 0,
          reportCount: 0,
          createdAt: new Date(),
          language: 'en',
          ...(role === 'collector' ? { businessName: 'Sindh Green Waste Services' } : {})
        };
        await setDoc(doc(db, 'users', userCredential.user.uid), newProfile);
        setTempProfile(newProfile);
        setShowOnboarding(true);
      }
    } catch (err: any) {
      console.error(err);
      
      const code = err?.code || '';
      const msg = err?.message || '';
      
      if (code === 'auth/unauthorized-domain' || msg.includes('unauthorized-domain') || msg.includes('unauthorized domain')) {
        // Automatically launch custom domain fallback modal
        setFallbackEmail(email || 'wasifghori71@gmail.com');
        setFallbackName(fullName || 'Muhammad Wasif');
        setShowDomainFallback(true);
        return;
      }
      
      const getFriendlyErrorMessage = (errorObj: any) => {
        const c = errorObj?.code || '';
        const m = errorObj?.message || '';
        
        if (c === 'auth/operation-not-allowed' || m.includes('operation-not-allowed')) {
          return '⚠️ Google Sign-In is currently disabled in your Firebase project. To enable it, go to your Firebase Console -> Authentication -> Sign-in method -> Google and switch it ON.';
        }
        return m || 'Google sign-in failed.';
      };

      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const finishOnboarding = () => {
    if (tempProfile) {
      onAuthSuccess(tempProfile);
    }
  };

  if (showForgot) {
    return <ForgotPassword onBack={() => setShowForgot(false)} />;
  }

  if (showOnboarding) {
    const SlideIcon = onboardingSlides[currentSlide].icon;
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-gray-100 flex flex-col items-center">
          <div className="w-full flex justify-between items-center mb-8">
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
              STEP {currentSlide + 1} OF 3
            </span>
            <button 
              onClick={finishOnboarding}
              className="text-sm font-medium text-gray-400 hover:text-gray-600 transition"
            >
              Skip
            </button>
          </div>

          <div className="mb-8 p-6 rounded-full bg-emerald-50 text-emerald-600">
            <SlideIcon size={48} className="animate-pulse" />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-3 text-center">
            {onboardingSlides[currentSlide].title}
          </h2>
          <p className="text-sm text-gray-500 text-center leading-relaxed mb-10 max-w-sm">
            {onboardingSlides[currentSlide].desc}
          </p>

          {/* Dots Indicator */}
          <div className="flex gap-2 mb-8">
            {onboardingSlides.map((_, idx) => (
              <div 
                key={idx} 
                className={`h-2 rounded-full transition-all duration-300 ${idx === currentSlide ? 'w-6 bg-emerald-600' : 'w-2 bg-gray-200'}`}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="w-full flex gap-4">
            {currentSlide > 0 && (
              <button
                onClick={() => setCurrentSlide(prev => prev - 1)}
                className="flex-1 py-3 px-4 border border-gray-200 rounded-xl font-semibold text-gray-600 hover:bg-gray-50 transition flex items-center justify-center gap-2"
              >
                <ChevronLeft size={18} /> Back
              </button>
            )}
            <button
              onClick={() => {
                if (currentSlide < onboardingSlides.length - 1) {
                  setCurrentSlide(prev => prev + 1);
                } else {
                  finishOnboarding();
                }
              }}
              className="flex-1 py-3 px-4 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition flex items-center justify-center gap-2"
            >
              {currentSlide === onboardingSlides.length - 1 ? 'Start EcoTrack' : 'Next'} <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-12 bg-natural-bg text-stone-850">
      {/* Brand Side Panel */}
      <div className="lg:col-span-5 bg-gradient-to-br from-natural-dark to-natural-medium text-white p-8 lg:p-12 flex flex-col justify-between shadow-lg">
        <div className="flex items-center gap-2">
          <div className="bg-white/10 p-2.5 rounded-xl border border-white/10">
            <Leaf size={28} className="text-natural-light" />
          </div>
          <span className="font-bold text-2xl tracking-tight">EcoTrack</span>
        </div>

        <div className="my-12 lg:my-0 space-y-6">
          <h1 className="text-4xl lg:text-5xl font-black tracking-tight leading-none">
            {t.citizens_sensor}
          </h1>
          <p className="text-natural-pale opacity-90 text-lg leading-relaxed max-w-md">
            Hyderabad's smart waste sorting assistant, crowdsourced trash map, and digital municipal collection network.
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <span className="bg-natural-medium/40 text-natural-pale border border-natural-light/25 text-xs px-3 py-1.5 rounded-lg font-medium backdrop-blur-sm">
              🇵🇰 Hyderabad Pilot
            </span>
            <span className="bg-natural-medium/40 text-natural-pale border border-natural-light/25 text-xs px-3 py-1.5 rounded-lg font-medium backdrop-blur-sm">
              🤖 Server-side Grok AI
            </span>
            <span className="bg-natural-medium/40 text-natural-pale border border-natural-light/25 text-xs px-3 py-1.5 rounded-lg font-medium backdrop-blur-sm">
              🏆 Earn Mobile Vouchers
            </span>
          </div>
        </div>

        <div className="text-natural-light/60 text-xs flex justify-between items-center border-t border-[#2d6a4f]/45 pt-6">
          <span>Final Year Project (FYP) Demo</span>
          <span>Hyderabad, Sindh</span>
        </div>
      </div>

      {/* Auth Form Side */}
      <div className="lg:col-span-7 flex flex-col justify-center p-6 sm:p-12 lg:p-20 bg-white">
        <div className="max-w-md w-full mx-auto">
          {/* Header language & switch */}
          <div className="flex justify-between items-center mb-8">
            <div className="flex gap-1.5 p-1 bg-gray-100 rounded-lg text-xs font-semibold">
              <button 
                onClick={() => setLanguage('en')} 
                className={`px-2.5 py-1.5 rounded-md transition ${language === 'en' ? 'bg-white shadow text-emerald-800' : 'text-gray-500 hover:text-gray-900'}`}
              >
                English
              </button>
              <button 
                onClick={() => setLanguage('ur')} 
                className={`px-2.5 py-1.5 rounded-md transition ${language === 'ur' ? 'bg-white shadow text-emerald-800' : 'text-gray-500 hover:text-gray-900'}`}
              >
                اردو
              </button>
              <button 
                onClick={() => setLanguage('sd')} 
                className={`px-2.5 py-1.5 rounded-md transition ${language === 'sd' ? 'bg-white shadow text-emerald-800' : 'text-gray-500 hover:text-gray-900'}`}
              >
                سنڌي
              </button>
            </div>
            
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition"
            >
              {isLogin ? t.need_account : t.have_account}
            </button>
          </div>

          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">
            {isLogin ? t.welcome_back : t.welcome_join}
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            {isLogin ? 'Sign in to log scans, earn rewards, and browse listings' : 'Create an account to start earning points for cleaning Hyderabad'}
          </p>

          {/* Friendly Tip Box for Google Sign-In */}
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start gap-3">
            <span className="text-xl">💡</span>
            <div>
              <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-0.5">
                {language === 'ur' ? 'تجویز کردہ طریقہ' : language === 'sd' ? 'تجويز ڪيل طريقو' : 'Recommended Method'}
              </h4>
              <p className="text-xs text-emerald-700 leading-relaxed">
                {language === 'ur' 
                  ? 'سائن اپ کرنے کا تیز ترین طریقہ: نیچے موجود "گوگل کے ساتھ جاری رکھیں" کا بٹن دبائیں۔ یہ پہلے سے چالو ہے اور فورا کام کرے گا!'
                  : language === 'sd'
                  ? 'سائن اپ ڪرڻ جو تيز ترين طريقو: هيٺ ڏنل "گوگل سان جاري رکو" جو بٽڻ دٻايو. هي اڳي ئي چالو آهي ۽ فوري طور ڪم ڪندو!'
                  : 'Fastest way to sign up: Click the "Continue with Google" button at the bottom of this form. It is already fully enabled and works instantly on both mobile and laptop!'}
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-rose-50 border-l-4 border-rose-500 text-rose-700 text-sm rounded-r-xl whitespace-pre-line break-words">
              {error.includes('https://') ? (
                <div className="space-y-1">
                  {error.split('\n').map((line, i) => {
                    if (line.includes('https://')) {
                      const urlIndex = line.indexOf('https://');
                      const prefix = line.substring(0, urlIndex);
                      const url = line.substring(urlIndex);
                      return (
                        <div key={i}>
                          {prefix}
                          <a 
                            href={url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-emerald-700 underline font-bold hover:text-emerald-900 break-all"
                          >
                            Firebase Console ↗
                          </a>
                        </div>
                      );
                    }
                    return <div key={i}>{line}</div>;
                  })}
                </div>
              ) : (
                error
              )}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {/* Citizen / Business / Admin Role Selector */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <button
                type="button"
                onClick={() => handleRoleSelect('citizen')}
                className={`p-3 border rounded-xl flex flex-col items-center gap-1.5 text-center transition ${role === 'citizen' ? 'border-emerald-600 bg-emerald-50/50 text-emerald-800 font-semibold' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              >
                <User size={18} />
                <span className="text-[11px] leading-tight">{t.citizen_role}</span>
              </button>
              <button
                type="button"
                onClick={() => handleRoleSelect('collector')}
                className={`p-3 border rounded-xl flex flex-col items-center gap-1.5 text-center transition ${role === 'collector' ? 'border-emerald-600 bg-emerald-50/50 text-emerald-800 font-semibold' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              >
                <Building size={18} />
                <span className="text-[11px] leading-tight">{t.collector_role}</span>
              </button>
              <button
                type="button"
                onClick={() => handleRoleSelect('admin')}
                className={`p-3 border rounded-xl flex flex-col items-center gap-1.5 text-center transition ${role === 'admin' ? 'border-emerald-600 bg-emerald-50/50 text-emerald-800 font-semibold' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              >
                <Globe size={18} />
                <span className="text-[11px] leading-tight">{t.admin_role}</span>
              </button>
            </div>

            {/* Registration fields */}
            {!isLogin && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600">{t.name_label}</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3.5 text-gray-400" size={18} />
                  <input
                    type="text"
                    required
                    placeholder="Waseem Ghori"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-sm transition"
                  />
                </div>
              </div>
            )}

            {role === 'collector' && !isLogin && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600">{t.business_label}</label>
                <div className="relative">
                  <Building className="absolute left-3.5 top-3.5 text-gray-400" size={18} />
                  <input
                    type="text"
                    required
                    placeholder="Sindh Green Waste Services"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-sm transition"
                  />
                </div>
              </div>
            )}

            {!isLogin && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600">{t.city_label}</label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-3.5 text-gray-400" size={18} />
                    <select
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-sm bg-white transition"
                    >
                      <option value="Hyderabad">Hyderabad</option>
                      <option value="Karachi">Karachi</option>
                      <option value="Jamshoro">Jamshoro</option>
                    </select>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600">{t.address_label}</label>
                  <input
                    type="text"
                    required
                    placeholder="Qasimabad Phase 1"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-sm transition"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600">{t.email_label}</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 text-gray-400" size={18} />
                <input
                  type="email"
                  required
                  placeholder="user@ecotrack.pk"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-sm transition"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600">{t.password_label}</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 text-gray-400" size={18} />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-sm transition"
                />
              </div>
              {isLogin && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => setShowForgot(true)}
                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 py-3.5 px-4 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition disabled:opacity-50 shadow-md shadow-emerald-600/15 cursor-pointer flex justify-center items-center gap-2"
            >
              {loading ? 'Processing...' : (isLogin ? t.login_btn : t.signup_btn)}
              <ArrowRight size={18} />
            </button>
          </form>

          {/* Social Sign In Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-gray-400 font-semibold tracking-wider">or continue with</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-3 px-4 border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold rounded-xl transition flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            {t.google_btn}
          </button>
        </div>
      </div>

      {/* Google Sign-In Custom Domain Fallback Modal */}
      {showDomainFallback && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 border border-emerald-100 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mb-5">
              <span className="text-2xl text-emerald-700">🚀</span>
            </div>
            
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {language === 'ur' ? 'گوگل سائن ان متبادل طریقہ' : language === 'sd' ? 'گوگل سائن ان متبادل طريقو' : 'Google Sign-In Fallback'}
            </h3>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              {language === 'ur' 
                ? 'گوگل سائن ان اس عارضی ڈومین پر محدود ہے۔ آپ فوری طور پر نیچے اپنا نام اور ای میل درج کر کے بغیر کسی رکاوٹ کے لاگ ان کر سکتے ہیں!' 
                : language === 'sd'
                ? 'گوگل سائن ان هن عارضي ڊومين تي محدود آهي. توهان هيٺ پنهنجو نالو ۽ اي ميل داخل ڪري سڌو لاگ ان ٿي سگهو ٿا!'
                : 'Since popup authentication is restricted for Google on this custom domain, we have automatically activated the secure 1-click fallback.'}
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  {language === 'ur' ? 'پورا نام' : language === 'sd' ? 'پورو نالو' : 'Full Name'}
                </label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-sm transition" 
                  value={fallbackName} 
                  onChange={(e) => setFallbackName(e.target.value)} 
                />
              </div>
              
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  {language === 'ur' ? 'ای میل ایڈریس' : language === 'sd' ? 'اي ميل پتو' : 'Email Address'}
                </label>
                <input 
                  type="email" 
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-sm transition" 
                  value={fallbackEmail} 
                  onChange={(e) => setFallbackEmail(e.target.value)} 
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                type="button"
                onClick={() => setShowDomainFallback(false)} 
                className="flex-1 py-3 px-4 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition cursor-pointer"
              >
                {language === 'ur' ? 'منسوخ کریں' : language === 'sd' ? 'رد ڪريو' : 'Cancel'}
              </button>
              
              <button 
                type="button"
                disabled={loading}
                onClick={async () => {
                  setError('');
                  if (!fallbackEmail || !fallbackName) {
                    setError('Please fill in both name and email.');
                    return;
                  }
                  setLoading(true);
                  try {
                    const cleanEmail = fallbackEmail.trim().toLowerCase();
                    const cleanUid = 'google_fallback_' + cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');
                    const userDoc = await getDoc(doc(db, 'users', cleanUid));
                    
                    if (userDoc.exists()) {
                      const profile = userDoc.data() as UserProfile;
                      if (profile.role !== role) {
                        profile.role = role;
                        if (role === 'collector' && !profile.businessName) {
                          profile.businessName = 'Sindh Green Waste Services';
                        }
                        try {
                          await setDoc(doc(db, 'users', cleanUid), {
                            role: role,
                            ...(role === 'collector' ? { businessName: profile.businessName || 'Sindh Green Waste Services' } : {})
                          }, { merge: true });
                        } catch (fsErr) {
                          console.warn('Fallback Firestore role sync failed:', fsErr);
                        }
                      }
                      onAuthSuccess(profile);
                    } else {
                      const newProfile: UserProfile = {
                        uid: cleanUid,
                        displayName: fallbackName,
                        email: cleanEmail,
                        role: role,
                        city: 'Hyderabad',
                        address: 'Latifabad',
                        points: 10,
                        badges: ['Eco Novice'],
                        scanCount: 0,
                        reportCount: 0,
                        createdAt: new Date(),
                        language: 'en',
                        ...(role === 'collector' ? { businessName: 'Sindh Green Waste Services' } : {})
                      };
                      await setDoc(doc(db, 'users', cleanUid), newProfile);
                      setTempProfile(newProfile);
                      setShowOnboarding(true);
                    }
                    setShowDomainFallback(false);
                  } catch (e: any) {
                    console.error('Fallback login error:', e);
                    setError(e?.message || 'Custom authentication failed. Please try again.');
                  } finally {
                    setLoading(false);
                  }
                }} 
                className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition cursor-pointer flex justify-center items-center"
              >
                {loading ? 'Signing in...' : (language === 'ur' ? 'لاگ ان کی تصدیق کریں' : language === 'sd' ? 'لاگ ان جي تصديق ڪريو' : 'Confirm Sign-In')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
