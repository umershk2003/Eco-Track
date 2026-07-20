import React, { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot,
  increment,
  Timestamp,
  arrayUnion,
  getDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  UserProfile, 
  WasteScan, 
  BinReport, 
  CollectionSchedule, 
  MarketplaceListing, 
  Reward, 
  Redemption, 
  Quiz,
  WasteCategory,
  BinColor
} from '../types';
import { i18n } from '../lib/i18n';
import { 
  Camera, 
  AlertTriangle, 
  MapPin, 
  Calendar, 
  ShoppingBag, 
  GraduationCap, 
  User, 
  Award, 
  ChevronRight, 
  Share2, 
  ThumbsUp, 
  Clock, 
  Plus, 
  Phone, 
  CheckCircle,
  HelpCircle,
  Sparkles,
  Search,
  Filter,
  Check,
  Zap,
  Info,
  Leaf,
  X,
  Sun,
  Moon,
  Bell,
  BellOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ProfileSettings from './ProfileSettings';
import RecyclingTipOfTheDay from './RecyclingTipOfTheDay';

interface CitizenViewProps {
  profile: UserProfile;
  onProfileUpdate: (newProfile: UserProfile) => void;
  onSignOut: () => void;
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export default function CitizenView({ 
  profile, 
  onProfileUpdate, 
  onSignOut,
  darkMode = false,
  onToggleDarkMode
}: CitizenViewProps) {
  const [activeTab, setActiveTab] = useState<'scan' | 'report' | 'schedule' | 'market' | 'edu' | 'profile'>('scan');
  const [showEditProfile, setShowEditProfile] = useState(false);
  const t = i18n[profile.language || 'en'];

  // Global Scans & Reports
  const [scans, setScans] = useState<WasteScan[]>([]);
  const [reports, setReports] = useState<BinReport[]>([]);
  const [schedules, setSchedules] = useState<CollectionSchedule[]>([]);
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [pointsNotification, setPointsNotification] = useState<string | null>(null);

  // Service Worker and Notification States
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [alertsSubscribed, setAlertsSubscribed] = useState<boolean>(() => {
    return localStorage.getItem('ecotrack_alerts_subscribed') === 'true';
  });
  const [notificationError, setNotificationError] = useState<string | null>(null);

  // Register Service Worker on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }

    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => {
          console.log('[EcoTrack] Service Worker registered successfully:', reg);
          setSwRegistration(reg);
        })
        .catch((err) => {
          console.error('[EcoTrack] Service Worker registration failed:', err);
          setNotificationError('Service Worker registration failed');
        });
    }
  }, []);

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      setNotificationError(t.notifications_not_supported);
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      if (permission === 'granted') {
        localStorage.setItem('ecotrack_alerts_subscribed', 'true');
        setAlertsSubscribed(true);
        setNotificationError(null);
        
        // Show an introductory notification directly
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'TRIGGER_NOTIFICATION',
            title: 'EcoTrack Notifications Active! 🔔',
            body: `You will now receive notifications for waste pickups in ${profile.address}.`,
            url: window.location.origin
          });
        } else if (swRegistration) {
          swRegistration.active?.postMessage({
            type: 'TRIGGER_NOTIFICATION',
            title: 'EcoTrack Notifications Active! 🔔',
            body: `You will now receive notifications for waste pickups in ${profile.address}.`,
            url: window.location.origin
          });
        }
      } else if (permission === 'denied') {
        setNotificationError(t.notification_permission_denied);
      }
    } catch (err) {
      console.error('Error requesting notification permission:', err);
      setNotificationError('Failed to request permission');
    }
  };

  const triggerSimulatedPickupAlert = () => {
    if (!nextPickup) {
      const genericTitle = 'Upcoming Waste Collection Alert 🚛';
      const genericBody = `The waste pickup vehicle is scheduled to arrive in ${profile.address || 'your registered area'} shortly. Keep your bin ready!`;
      
      const msgData = {
        type: 'TRIGGER_NOTIFICATION',
        title: genericTitle,
        body: genericBody,
        url: window.location.origin
      };

      if (navigator.serviceWorker.controller && notificationPermission === 'granted') {
        navigator.serviceWorker.controller.postMessage(msgData);
      } else if (swRegistration && swRegistration.active && notificationPermission === 'granted') {
        swRegistration.active.postMessage(msgData);
      } else {
        alert(`${genericTitle}\n\n${genericBody}\n\n(Tip: Enable notifications to receive this as a real push alert!)`);
      }
      return;
    }

    const title = `Waste Pickup Alert: ${nextPickup.wasteType.toUpperCase()} 🚛`;
    const body = `Scheduled for ${nextPickup.daysOfWeek.join(', ')} at ${nextPickup.timeWindow} in ${profile.address}.`;
    const msgData = {
      type: 'TRIGGER_NOTIFICATION',
      title,
      body,
      url: window.location.origin
    };

    if (navigator.serviceWorker.controller && notificationPermission === 'granted') {
      navigator.serviceWorker.controller.postMessage(msgData);
    } else if (swRegistration && swRegistration.active && notificationPermission === 'granted') {
      swRegistration.active.postMessage(msgData);
    } else {
      alert(`${title}\n\n${body}\n\n(Tip: Enable notifications to receive this as a real push alert!)`);
    }
  };

  // Camera Modal States
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraTarget, setCameraTarget] = useState<'scan' | 'report' | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceIndex, setSelectedDeviceIndex] = useState(0);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  // Auto-bind camera stream to video tag
  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream, cameraActive]);

  const startCamera = async (deviceIndex: number = 0) => {
    setCameraActive(true);
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Webcam access is not supported by your browser. Please upload a photo instead.");
      }
      
      // Stop existing stream first
      if (cameraStream) {
        cameraStream.getTracks().forEach(t => t.stop());
      }
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInps = devices.filter(d => d.kind === 'videoinput');
      setVideoDevices(videoInps);
      
      let constraints: MediaStreamConstraints = { video: { facingMode: 'environment' } };
      if (videoInps.length > 0) {
        const selectedDevice = videoInps[deviceIndex % videoInps.length];
        constraints = { video: { deviceId: { exact: selectedDevice.deviceId } } };
        setSelectedDeviceIndex(deviceIndex % videoInps.length);
      }
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setCameraStream(stream);
    } catch (err: any) {
      console.error("Camera access failed, trying fallback:", err);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setCameraStream(stream);
      } catch (innerErr: any) {
        setCameraError("Camera access was blocked or is unavailable. Please check browser permissions, ensure other apps are not using the camera, and that the iframe has camera permissions enabled. Alternatively, use 'Upload Photo' to select an image from your device.");
      }
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setCameraActive(false);
    setCameraTarget(null);
  };

  const switchCamera = () => {
    if (videoDevices.length <= 1) return;
    const nextIdx = (selectedDeviceIndex + 1) % videoDevices.length;
    startCamera(nextIdx);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const base64Data = canvas.toDataURL('image/jpeg', 0.85);
      
      if (cameraTarget === 'scan') {
        setScanResult(null);
        setScanImage(base64Data);
        analyzeWaste(base64Data);
      } else if (cameraTarget === 'report') {
        setReportImage(base64Data);
      }
    }
    stopCamera();
  };

  // Load Real-time Data
  useEffect(() => {
    // 1. Scans (My scans)
    const qScans = query(
      collection(db, 'scans'),
      where('userId', '==', profile.uid),
      limit(50)
    );
    const unsubScans = onSnapshot(qScans, (snap) => {
      const list: WasteScan[] = [];
      snap.forEach(d => list.push({ scanId: d.id, ...d.data() } as WasteScan));
      
      // Sort in-memory safely handling both Date, string, and Firestore Timestamps
      list.sort((a, b) => {
        const getMs = (val: any) => {
          if (!val) return 0;
          if (typeof val.toDate === 'function') return val.toDate().getTime();
          if (val.seconds) return val.seconds * 1000 + (val.nanoseconds ? val.nanoseconds / 1000000 : 0);
          return new Date(val).getTime();
        };
        return getMs(b.createdAt) - getMs(a.createdAt);
      });
      
      setScans(list.slice(0, 10));
    });

    // 2. Reports (All bin reports for Hyderabad area map)
    const qReports = query(
      collection(db, 'binReports'),
      orderBy('reportedAt', 'desc')
    );
    const unsubReports = onSnapshot(qReports, (snap) => {
      const list: BinReport[] = [];
      snap.forEach(d => list.push({ reportId: d.id, ...d.data() } as BinReport));
      setReports(list);
    });

    // 3. Marketplace Listings
    const qListings = query(
      collection(db, 'marketplaceListings'),
      orderBy('createdAt', 'desc')
    );
    const unsubListings = onSnapshot(qListings, (snap) => {
      const list: MarketplaceListing[] = [];
      snap.forEach(d => list.push({ listingId: d.id, ...d.data() } as MarketplaceListing));
      setListings(list);
    });

    // 4. Rewards Catalog
    const qRewards = query(collection(db, 'rewards'), limit(20));
    const unsubRewards = onSnapshot(qRewards, (snap) => {
      const list: Reward[] = [];
      snap.forEach(d => list.push({ rewardId: d.id, ...d.data() } as Reward));
      setRewards(list);
    });

    // 5. My Redemptions
    const qRedemp = query(
      collection(db, 'redemptions'),
      where('userId', '==', profile.uid)
    );
    const unsubRedemp = onSnapshot(qRedemp, (snap) => {
      const list: Redemption[] = [];
      snap.forEach(d => list.push({ redemptionId: d.id, ...d.data() } as Redemption));
      
      // Sort in-memory safely handling both Date, string, and Firestore Timestamps
      list.sort((a, b) => {
        const getMs = (val: any) => {
          if (!val) return 0;
          if (typeof val.toDate === 'function') return val.toDate().getTime();
          if (val.seconds) return val.seconds * 1000 + (val.nanoseconds ? val.nanoseconds / 1000000 : 0);
          return new Date(val).getTime();
        };
        return getMs(b.redeemedAt) - getMs(a.redeemedAt);
      });
      
      setRedemptions(list);
    });

    // 6. Schedules for my city / area
    const qSchedules = query(
      collection(db, 'collectionSchedules'),
      where('city', '==', profile.city || 'Hyderabad'),
      where('active', '==', true)
    );
    const unsubSchedules = onSnapshot(qSchedules, (snap) => {
      const list: CollectionSchedule[] = [];
      snap.forEach(d => list.push({ scheduleId: d.id, ...d.data() } as CollectionSchedule));
      setSchedules(list);
    });

    return () => {
      unsubScans();
      unsubReports();
      unsubListings();
      unsubRewards();
      unsubRedemp();
      unsubSchedules();
    };
  }, [profile.uid, profile.city]);

  // Seed Default Rewards & Schedules if they don't exist
  useEffect(() => {
    const seedInitialData = async () => {
      try {
        const rewardSnap = await getDocs(collection(db, 'rewards'));
        if (rewardSnap.empty) {
          const defaultRewards = [
            {
              title: "Rs. 200 Mobile Load (Zong/Jazz/Telenor)",
              description: "Get a digital scratch code valid for all Pakistani telecommunication networks.",
              pointsCost: 150,
              partner: "Pak Telecom Co.",
              stock: 99,
              imageUrl: "https://images.unsplash.com/photo-1562408590-e32931084e23?w=300&q=80"
            },
            {
              title: "15% Discount Voucher - Green Grocers",
              description: "Valid on organic items, compost products, and plants at Green Grocers Hyderabad.",
              pointsCost: 100,
              partner: "Green Grocers",
              stock: 50,
              imageUrl: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&q=80"
            },
            {
              title: "Rs. 500 Food Discount Voucher - Hyderabad Cafe",
              description: "Save on eco-friendly paper packaging dine-ins in Latifabad.",
              pointsCost: 350,
              partner: "Hyderabad Cafe",
              stock: 25,
              imageUrl: "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=300&q=80"
            }
          ];
          for (const rew of defaultRewards) {
            await addDoc(collection(db, 'rewards'), rew);
          }
        }

        const scheduleSnap = await getDocs(collection(db, 'collectionSchedules'));
        if (scheduleSnap.empty) {
          const defaultSchedules = [
            {
              areaName: "Latifabad No. 7",
              city: "Hyderabad",
              wasteType: "organic",
              collectorId: "admin",
              daysOfWeek: ["Monday", "Thursday"],
              timeWindow: "7:00 AM - 9:00 AM",
              active: true
            },
            {
              areaName: "Latifabad No. 7",
              city: "Hyderabad",
              wasteType: "recyclable",
              collectorId: "admin",
              daysOfWeek: ["Tuesday", "Saturday"],
              timeWindow: "8:00 AM - 10:00 AM",
              active: true
            },
            {
              areaName: "Qasimabad Phase 1",
              city: "Hyderabad",
              wasteType: "organic",
              collectorId: "admin",
              daysOfWeek: ["Monday", "Wednesday"],
              timeWindow: "7:30 AM - 9:30 AM",
              active: true
            },
            {
              areaName: "Qasimabad Phase 1",
              city: "Hyderabad",
              wasteType: "recyclable",
              collectorId: "admin",
              daysOfWeek: ["Friday"],
              timeWindow: "9:00 AM - 11:30 AM",
              active: true
            }
          ];
          for (const sched of defaultSchedules) {
            await addDoc(collection(db, 'collectionSchedules'), sched);
          }
        }
      } catch (e) {
        console.error('Seeding error:', e);
      }
    };
    seedInitialData();
  }, []);

  const triggerPointsNotification = (msg: string) => {
    setPointsNotification(msg);
    setTimeout(() => setPointsNotification(null), 3000);
  };

  // Profile update helpers
  const handleLanguageChange = async (lang: 'en' | 'ur' | 'sd') => {
    const userRef = doc(db, 'users', profile.uid);
    await updateDoc(userRef, { language: lang });
    onProfileUpdate({ ...profile, language: lang });
  };

  const handleUpdateAddress = async (addr: string) => {
    const userRef = doc(db, 'users', profile.uid);
    await updateDoc(userRef, { address: addr });
    onProfileUpdate({ ...profile, address: addr });
  };

  // Award points & updates
  const awardPoints = async (amount: number, reason: string) => {
    const userRef = doc(db, 'users', profile.uid);
    const newPoints = (profile.points || 0) + amount;
    
    // Check next badges tier
    const badges = [...(profile.badges || [])];
    if (newPoints >= 100 && !badges.includes('Bronze Recycler')) {
      badges.push('Bronze Recycler');
    }
    if (newPoints >= 500 && !badges.includes('Silver Recycler')) {
      badges.push('Silver Recycler');
    }
    if (newPoints >= 1500 && !badges.includes('Gold Eco-Champion')) {
      badges.push('Gold Eco-Champion');
    }

    const updates: any = {
      points: increment(amount),
      badges
    };

    await updateDoc(userRef, updates);
    onProfileUpdate({
      ...profile,
      points: newPoints,
      badges
    });

    triggerPointsNotification(`+${amount} Points: ${reason}`);
  };

  // ==========================================
  // TAB 1: SCAN WASTE (GEMINI VISION)
  // ==========================================
  const [scanImage, setScanImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [scanResult, setScanResult] = useState<any | null>(null);

  const compressImage = (base64Str: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width || 500;
        let height = img.height || 500;
        const MAX_WIDTH = 500;
        
        if (width > MAX_WIDTH) {
          height = Math.round(height * (MAX_WIDTH / width));
          width = MAX_WIDTH;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
    });
  };

  const handleImageCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanResult(null);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const rawBase64 = reader.result as string;
      const compressed = await compressImage(rawBase64);
      setScanImage(compressed);
      
      // Auto analyze once loaded
      analyzeWaste(compressed);
    };
    reader.readAsDataURL(file);
  };

  const analyzeWaste = async (base64Img: string) => {
    setAnalyzing(true);
    try {
      const res = await fetch('/api/classify-waste', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Img,
          mimeType: 'image/jpeg'
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.explanation || errorData.error || 'Server classification failed');
      }

      const data = await res.json();
      setScanResult(data);

      // Streak check + save scan transaction
      const todayStr = new Date().toISOString().split('T')[0];
      let pointsToAward = 10;
      let streakBonus = 0;

      // Calculate streak
      const lastScan = profile.lastScanDate;
      let newStreak = profile.streakCount || 0;
      
      if (lastScan) {
        const lastDate = new Date(lastScan);
        const diffTime = Math.abs(new Date(todayStr).getTime() - lastDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          newStreak += 1;
          if (newStreak === 7) {
            streakBonus = 20;
            pointsToAward += streakBonus;
            newStreak = 0; // reset streak after 7 days
          }
        } else if (diffDays > 1) {
          newStreak = 1; // broken, start fresh
        }
      } else {
        newStreak = 1; // first scan
      }

      // Save scan doc
      const scanDoc: Omit<WasteScan, 'scanId'> = {
        userId: profile.uid,
        imageUrl: base64Img,
        predictedCategory: data.category as WasteCategory,
        binColor: data.binColor || 'Black Bin',
        confidence: data.confidence || 0.9,
        aiExplanation: data.explanation || '',
        pointsAwarded: pointsToAward,
        createdAt: Timestamp.now()
      };

      await addDoc(collection(db, 'scans'), scanDoc);
      
      // Update streak profile keys
      const userRef = doc(db, 'users', profile.uid);
      await updateDoc(userRef, {
        scanCount: increment(1),
        lastScanDate: todayStr,
        streakCount: newStreak
      });

      // Award points
      await awardPoints(pointsToAward, streakBonus > 0 ? "7-Day Scanning Streak Bonus!" : "AI Waste Classification");

    } catch (err: any) {
      console.error(err);
      setScanResult({
        category: 'landfill',
        binColor: 'Black Bin',
        confidence: 0.5,
        explanation: err.message || 'Could not connect to AI. Please ensure you are online and try again.'
      });
    } finally {
      setAnalyzing(false);
    }
  };

  // ==========================================
  // TAB 2: REPORT OVERFLOWING BIN
  // ==========================================
  const [reportImage, setReportImage] = useState<string | null>(null);
  const [reportSeverity, setReportSeverity] = useState<'full' | 'overflowing' | 'damaged' | 'illegal-dumping'>('overflowing');
  const [reportNotes, setReportNotes] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);

  const handleReportImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const rawBase64 = reader.result as string;
      const compressed = await compressImage(rawBase64);
      setReportImage(compressed);
    };
    reader.readAsDataURL(file);
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportImage) return;

    setSubmittingReport(true);
    setGpsLoading(true);

    let resolved = false;

    // Helper for graceful fallback coordinates (Hyderabad coordinates: Lat 25.396, Lng 68.3578)
    const triggerFallback = async (reason: string) => {
      if (resolved) return;
      resolved = true;
      console.warn(`Geolocation fallback triggered: ${reason}. Seeding Hyderabad coordinates.`);
      const lat = 25.3960 + (Math.random() - 0.5) * 0.05;
      const lng = 68.3578 + (Math.random() - 0.5) * 0.05;
      await createBinReport(lat, lng);
    };

    // Robust 1.5-second timeout safeguard to prevent hanging indefinitely in iframes or restricted environments
    const safetyTimeout = setTimeout(() => {
      triggerFallback('Timeout (1.5s exceeded)');
    }, 1500);

    try {
      if (!navigator || !navigator.geolocation) {
        clearTimeout(safetyTimeout);
        await triggerFallback('Geolocation API not supported or available');
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          clearTimeout(safetyTimeout);
          if (resolved) return;
          resolved = true;
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          await createBinReport(lat, lng);
        },
        async (err) => {
          clearTimeout(safetyTimeout);
          if (resolved) return;
          resolved = true;
          await triggerFallback(`Error code ${err.code}: ${err.message}`);
        },
        { timeout: 1500, enableHighAccuracy: false, maximumAge: 60000 }
      );
    } catch (err: any) {
      clearTimeout(safetyTimeout);
      await triggerFallback(`Exception caught: ${err.message || err}`);
    }
  };

  const createBinReport = async (lat: number, lng: number) => {
    try {
      // Find matching duplicates near 500m (roughly 0.005 lat/lng difference)
      const nearbyDup = reports.find(rep => 
        rep.status !== 'collected' &&
        Math.abs(rep.latitude - lat) < 0.005 &&
        Math.abs(rep.longitude - lng) < 0.005
      );

      let pointsToAward = 15;
      let isDuplicate = false;

      if (nearbyDup) {
        isDuplicate = true;
        pointsToAward = 2; // duplicate report spam prevention
      }

      const newReport: Omit<BinReport, 'reportId'> = {
        userId: profile.uid,
        imageUrl: reportImage || '',
        latitude: lat,
        longitude: lng,
        address: `${profile.address || 'Sindh Area'}, ${profile.city || 'Hyderabad'}`,
        status: 'reported',
        severity: reportSeverity,
        reportedAt: Timestamp.now(),
        resolvedAt: null,
        upvotes: 0,
        pointsAwarded: pointsToAward,
        reporterName: profile.displayName || 'Citizen',
        upvotedBy: []
      };

      await addDoc(collection(db, 'binReports'), newReport);

      const userRef = doc(db, 'users', profile.uid);
      await updateDoc(userRef, { reportCount: increment(1) });

      await awardPoints(pointsToAward, isDuplicate ? "Added tائید/Upvote to Nearby Issue" : "Verified Bin Overflow Report");
      
      setReportSubmitted(true);
      setReportImage(null);
      setReportNotes('');
    } catch (e) {
      console.error(e);
    } finally {
      setSubmittingReport(false);
      setGpsLoading(false);
    }
  };

  const upvoteReport = async (reportId: string, upvotedBy: string[] = []) => {
    if (upvotedBy.includes(profile.uid)) return; // Already upvoted

    const reportRef = doc(db, 'binReports', reportId);
    await updateDoc(reportRef, {
      upvotes: increment(1),
      upvotedBy: arrayUnion(profile.uid)
    });

    await awardPoints(2, "Upvoted City Bin Report");
  };

  // ==========================================
  // TAB 3: BIN MAP & GPS TRACKER
  // ==========================================
  const [mapFilter, setMapFilter] = useState<'all' | 'full' | 'overflowing' | 'damaged' | 'illegal-dumping'>('all');

  const getPinColor = (reportedAt: any) => {
    if (!reportedAt) return 'bg-yellow-500';
    const timestamp = reportedAt.toDate ? reportedAt.toDate().getTime() : new Date(reportedAt).getTime();
    const ageHrs = (Date.now() - timestamp) / (1000 * 60 * 60);
    if (ageHrs < 1) return 'bg-rose-600 border-rose-300 animate-pulse';
    if (ageHrs < 24) return 'bg-amber-500 border-amber-200';
    return 'bg-yellow-500 border-yellow-200';
  };

  // ==========================================
  // TAB 4: PICKUP SCHEDULES
  // ==========================================
  const matchedSchedules = schedules.filter(s => s.areaName === profile.address);
  const nextPickup = matchedSchedules[0];

  // ==========================================
  // TAB 5: WASTE MARKETPLACE
  // ==========================================
  const [showPostMarket, setShowPostMarket] = useState(false);
  const [mWasteType, setMWasteType] = useState('cardboard');
  const [mQuantity, setMQuantity] = useState('');
  const [mPhone, setMPhone] = useState('');
  const [mDesc, setMDesc] = useState('');
  const [mImage, setMImage] = useState<string | null>(null);
  const [revealedPhones, setRevealedPhones] = useState<string[]>([]); // Listing IDs

  const handleMImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const rawBase64 = reader.result as string;
      const compressed = await compressImage(rawBase64);
      setMImage(compressed);
    };
    reader.readAsDataURL(file);
  };

  const handlePostListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mQuantity || !mPhone || !mDesc) return;

    const newListing: Omit<MarketplaceListing, 'listingId'> = {
      posterId: profile.uid,
      posterName: profile.displayName || 'Seller',
      posterType: profile.role === 'collector' ? 'collector' : 'generator',
      wasteType: mWasteType,
      quantityEstimate: mQuantity,
      description: mDesc,
      imageUrl: mImage || 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=300&q=80',
      location: {
        latitude: 25.396,
        longitude: 68.3578,
        address: `${profile.address}, ${profile.city}`
      },
      status: 'open',
      createdAt: Timestamp.now(),
      contactPhone: mPhone
    };

    await addDoc(collection(db, 'marketplaceListings'), newListing);
    setShowPostMarket(false);
    setMQuantity('');
    setMPhone('');
    setMDesc('');
    setMImage(null);

    await awardPoints(5, "Posted Waste Marketplace Listing");
  };

  const claimListing = async (listingId: string) => {
    const ref = doc(db, 'marketplaceListings', listingId);
    await updateDoc(ref, { status: 'claimed' });
  };

  // ==========================================
  // TAB 6: EDUCATIONAL HUB & QUIZZES
  // ==========================================
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);

  const eduLessons = [
    {
      id: "segregation",
      title: "Waste Segregation 101",
      desc: "Segregating waste at source is the most vital step in keeping Hyderabad green. Discover the colored bins.",
      text: "Colored Bin Segregation System:\n1. Blue Bins (Recyclables): Paper, plastic bottles, metal cans, glass jars. Keep clean and dry.\n2. Green Bins (Organic): Food scraps, fruit peels, egg shells, plants, kitchen tea leaves. Converts to local organic compost.\n3. Black Bins (Landfill): Diapers, sanitary waste, soiled packages, multi-layered wrappers.\n4. Red Bins (Special Handling): Hazardous items like phone batteries, unused medicines, pest sprays.",
      quiz: {
        quizId: "segregation_quiz",
        title: "Segregation Mini Quiz",
        pointsPerCorrect: 5,
        questions: [
          {
            questionText: "Which bin colored container belongs to organic food scraps?",
            options: ["Blue Bin", "Green Bin", "Red Bin", "Black Bin"],
            correctIndex: 1
          },
          {
            questionText: "What must you do before throwing plastic containers in the Blue Bin?",
            options: ["Burn them", "Wash and dry them", "Shred to micro pieces", "Throw directly with food inside"],
            correctIndex: 1
          },
          {
            questionText: "Where do household lithium batteries go?",
            options: ["Green Bin", "Blue Bin", "Black Bin", "Red Bin (special handling)"],
            correctIndex: 3
          }
        ]
      }
    },
    {
      id: "composting",
      title: "Household Composting",
      desc: "Up to 50% of municipal trash in Sindh is organic kitchen waste. Learn to make free garden compost.",
      text: "How to compost in Hyderabad weather:\n1. Find a bin or garden pit. Drill aeration holes.\n2. Add 'Browns' (carbon): dried autumn leaves, egg trays, shredded cardboard.\n3. Add 'Greens' (nitrogen): fruit skin, vegetable scraps, leftover rice, tea bags.\n4. Moisture & Air: Moisten slightly. Turn the compost pile once a week to add oxygen.\n5. Wait 6-8 weeks until it turns rich, dark, earthy-smelling soil amendment.",
      quiz: {
        quizId: "compost_quiz",
        title: "Composting Basics",
        pointsPerCorrect: 5,
        questions: [
          {
            questionText: "What are 'Brown' compost ingredients high in?",
            options: ["Nitrogen", "Oxygen", "Carbon", "Calcium"],
            correctIndex: 2
          },
          {
            questionText: "How often should you turn your household compost bin?",
            options: ["Never", "Once a day", "Once a week", "Every hour"],
            correctIndex: 2
          },
          {
            questionText: "Which item should NOT be put in home compost?",
            options: ["Egg shells", "Plastic bottles", "Vegetable scraps", "Cardboard shreds"],
            correctIndex: 1
          }
        ]
      }
    }
  ];

  const submitQuiz = async () => {
    if (!activeQuiz) return;
    let score = 0;
    activeQuiz.questions.forEach((q, idx) => {
      if (quizAnswers[idx] === q.correctIndex) {
        score += 1;
      }
    });

    const earnedPoints = score * activeQuiz.pointsPerCorrect;
    setQuizScore(score);
    setQuizSubmitted(true);

    if (earnedPoints > 0) {
      await awardPoints(earnedPoints, `Completed ${activeQuiz.title}`);
    }
  };

  // ==========================================
  // REWARDS REDEMPTION
  // ==========================================
  const redeemRewardItem = async (reward: Reward) => {
    if ((profile.points || 0) < reward.pointsCost) return;

    // Deduct points
    const userRef = doc(db, 'users', profile.uid);
    const newPoints = (profile.points || 0) - reward.pointsCost;
    await updateDoc(userRef, { points: newPoints });

    // Save redemption
    const code = 'EC-' + Math.random().toString(36).substr(2, 6).toUpperCase();
    const newRedemp: Omit<Redemption, 'redemptionId'> = {
      userId: profile.uid,
      rewardId: reward.rewardId,
      rewardTitle: reward.title,
      pointsSpent: reward.pointsCost,
      status: 'fulfilled',
      redeemedAt: Timestamp.now(),
      voucherCode: code
    };

    await addDoc(collection(db, 'redemptions'), newRedemp);
    onProfileUpdate({ ...profile, points: newPoints });
    triggerPointsNotification(`Redeemed ${reward.title}!`);
  };

  return (
    <div className="min-h-screen bg-natural-bg flex flex-col font-sans pb-24 text-stone-800">
      {/* Dynamic Floating Point Alerts */}
      <AnimatePresence>
        {pointsNotification && (
          <motion.div 
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 16, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-natural-dark text-white px-6 py-3.5 rounded-[24px] shadow-xl border border-natural-light/20 flex items-center gap-2.5 font-semibold text-sm"
          >
            <Sparkles size={18} className="text-natural-straw animate-spin" />
            {pointsNotification}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Panel */}
      <header className="bg-natural-dark text-white shadow-md sticky top-0 z-30">
        <div className="max-w-md mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Leaf className="text-natural-light" size={24} />
            <div>
              <span className="font-extrabold text-lg tracking-tight block">EcoTrack</span>
              <span className="text-[10px] block text-natural-light/80 -mt-1 font-semibold">{t.tagline}</span>
            </div>
          </div>

          {/* Point Chip / Profile Selector */}
          <div className="flex items-center gap-2">
            <div className="bg-natural-medium border border-natural-light/15 rounded-full px-3.5 py-1.5 flex items-center gap-1.5 shadow-inner">
              <Award size={16} className="text-natural-straw" />
              <span className="font-extrabold text-sm">{profile.points || 0} <span className="text-[10px] text-natural-light font-bold">{t.points.toUpperCase()}</span></span>
            </div>

            {onToggleDarkMode && (
              <button
                onClick={onToggleDarkMode}
                title="Toggle High Contrast Night Mode"
                className="bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-lg p-1.5 transition-all cursor-pointer flex items-center justify-center shrink-0"
              >
                {darkMode ? (
                  <Sun size={14} className="text-amber-300" />
                ) : (
                  <Moon size={14} className="text-blue-200" />
                )}
              </button>
            )}

            <div className="flex gap-1 bg-white/5 border border-white/10 rounded-lg p-0.5 text-[10px]">
              <button 
                onClick={() => handleLanguageChange('en')} 
                className={`px-1.5 py-1 rounded transition-colors ${profile.language === 'en' ? 'bg-natural-medium text-white' : 'text-natural-light'}`}
              >
                EN
              </button>
              <button 
                onClick={() => handleLanguageChange('ur')} 
                className={`px-1.5 py-1 rounded transition-colors ${profile.language === 'ur' ? 'bg-natural-medium text-white' : 'text-natural-light'}`}
              >
                اردو
              </button>
              <button 
                onClick={() => handleLanguageChange('sd')} 
                className={`px-1.5 py-1 rounded transition-colors ${profile.language === 'sd' ? 'bg-natural-medium text-white' : 'text-natural-light'}`}
              >
                سنڌي
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Responsive Layout Wrapper (Max Mobile-Friendly Width) */}
      <main className="max-w-md w-full mx-auto px-4 py-6 flex-1">
        
        {/* TAB 1: SCAN WASTE */}
        {activeTab === 'scan' && (
          <div className="space-y-6">
            <RecyclingTipOfTheDay language={profile.language || 'en'} />

            <div className="bg-gradient-to-br from-natural-dark to-natural-medium text-white rounded-3xl p-6 shadow-xl border border-natural-light/10 relative overflow-hidden">
              <div className="relative z-10">
                <h2 className="text-xl font-bold tracking-tight mb-2 flex items-center gap-2 text-white">
                  <Camera size={20} className="text-natural-light" />
                  {t.scan_title}
                </h2>
                <p className="text-xs text-natural-pale opacity-90 leading-relaxed mb-6">
                  {t.scan_desc}
                </p>

                {/* Scan Action Boxes */}
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    type="button"
                    onClick={() => {
                      setCameraTarget('scan');
                      startCamera(0);
                    }}
                    className="bg-natural-medium hover:bg-natural-dark transition-all rounded-2xl p-4 flex flex-col items-center justify-center gap-2 text-center cursor-pointer shadow border border-natural-light/10 text-white"
                  >
                    <Camera size={26} className="text-natural-light" />
                    <span className="text-xs font-bold">{t.capture_photo}</span>
                  </button>

                  <label className="bg-white/10 hover:bg-white/15 transition-all rounded-2xl p-4 flex flex-col items-center justify-center gap-2 text-center cursor-pointer border border-white/10">
                    <Plus size={26} className="text-white" />
                    <span className="text-xs font-bold">{t.upload_file}</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageCapture}
                      className="hidden" 
                    />
                  </label>
                </div>
              </div>
              
              {/* Background Glow */}
              <div className="absolute right-0 bottom-0 w-32 h-32 bg-natural-light/10 rounded-full blur-3xl"></div>
            </div>

            {/* Streak reminder widget */}
            {profile.streakCount ? (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
                    <Zap size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-amber-800">7-Day Scanning Streak</h4>
                    <p className="text-[10px] text-amber-600 font-semibold">{profile.streakCount} days active. Keep scanning for a +20 bonus!</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  {[...Array(7)].map((_, i) => (
                    <div 
                      key={i} 
                      className={`w-1.5 h-3.5 rounded-full ${i < (profile.streakCount || 0) ? 'bg-amber-500' : 'bg-gray-200'}`}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            {/* Analysis State Loader */}
            {analyzing && (
              <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-8 flex flex-col items-center text-center">
                <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <h4 className="font-bold text-sm text-gray-800 mb-1">{t.analyzing}</h4>
                <p className="text-[11px] text-gray-500 max-w-xs">Our backend is executing standard Grok multimodal computer vision models client-free.</p>
              </div>
            )}

            {/* Scan Response results Card */}
            {scanResult && !analyzing && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5 overflow-hidden relative"
              >
                <div className="flex justify-between items-start mb-4">
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/50 px-2.5 py-1 rounded-full uppercase">
                    {t.scan_result}
                  </span>
                  <span className="text-xs font-bold text-gray-400">
                    Confidence: {Math.round(scanResult.confidence * 100)}%
                  </span>
                </div>

                <div className="flex gap-4 items-center">
                  {/* Bin destination indicator */}
                  <div className={`p-4 rounded-2xl shrink-0 ${
                    scanResult.binColor.includes('Green') ? 'bg-emerald-50 text-emerald-600' :
                    scanResult.binColor.includes('Blue') ? 'bg-blue-50 text-blue-600' :
                    scanResult.binColor.includes('Red') ? 'bg-rose-50 text-rose-600' : 'bg-gray-100 text-gray-600'
                  }`}>
                    <div className="h-10 w-10 flex items-center justify-center font-extrabold text-sm border-2 rounded-full border-current">
                      {scanResult.binColor.split(' ')[0][0]}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-black text-gray-900 text-base">{scanResult.category.replace('recyclable-', 'Recyclable ').toUpperCase()}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {t.bin_destination} <span className="font-bold underline">{scanResult.binColor}</span>
                    </p>
                  </div>
                </div>

                <div className="mt-5 border-t border-gray-100 pt-4">
                  <h4 className="text-xs font-bold text-gray-800 mb-1 flex items-center gap-1.5">
                    <Info size={14} className="text-emerald-600" />
                    {t.explanation}
                  </h4>
                  <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-100">
                    {scanResult.explanation}
                  </p>
                </div>

                <div className="mt-4 bg-emerald-50 text-emerald-800 text-xs font-bold p-3 rounded-xl flex items-center justify-between">
                  <span>Reward Points Credited</span>
                  <span className="flex items-center gap-1"><Award size={14} /> +10 {t.points}</span>
                </div>
              </motion.div>
            )}

            {/* Scan History list */}
            <div>
              <h3 className="font-bold text-gray-900 mb-3 text-sm flex items-center justify-between">
                <span>{t.recent_scans}</span>
                <span className="text-xs text-gray-400 font-semibold">{scans.length} scanned</span>
              </h3>
              
              {scans.length === 0 ? (
                <div className="bg-white rounded-2xl p-6 border border-gray-100 text-center text-gray-500 text-xs">
                  {t.no_scans}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {scans.map((sc) => (
                    <div key={sc.scanId} className="bg-white rounded-xl border border-gray-100 p-3 flex gap-3 items-center">
                      <img 
                        src={sc.imageUrl} 
                        alt="Scanned item" 
                        referrerPolicy="no-referrer"
                        className="h-12 w-12 rounded-lg object-cover bg-gray-100 shrink-0" 
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-bold uppercase">
                          {sc.predictedCategory}
                        </span>
                        <h4 className="text-xs font-extrabold text-gray-900 mt-1 truncate">{sc.binColor}</h4>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold text-emerald-600">+{sc.pointsAwarded} pts</span>
                        <span className="text-[9px] block text-gray-400 mt-0.5">
                          {sc.createdAt?.toDate ? sc.createdAt.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Just now'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: REPORT OVERFLOWING BIN */}
        {activeTab === 'report' && (
          <div className="space-y-6">
            {!reportSubmitted ? (
              <form onSubmit={handleReportSubmit} className="space-y-4">
                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
                  <h2 className="text-base font-black text-gray-900">{t.report_title}</h2>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    {t.report_desc}
                  </p>

                  {/* Camera Upload Report */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-600 block">Capture Evidence</label>
                    {reportImage ? (
                      <div className="relative rounded-xl overflow-hidden border border-gray-200">
                        <img 
                          src={reportImage} 
                          alt="Overflowing bin preview" 
                          referrerPolicy="no-referrer"
                          className="w-full h-44 object-cover" 
                        />
                        <button 
                          type="button" 
                          onClick={() => setReportImage(null)}
                          className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1.5 hover:bg-black/80 transition"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setCameraTarget('report');
                            startCamera(0);
                          }}
                          className="h-32 border border-gray-200 hover:bg-gray-50 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition text-stone-700 bg-white"
                        >
                          <Camera size={26} className="text-emerald-600" />
                          <span className="text-xs font-bold">{t.capture_photo}</span>
                        </button>

                        <label className="h-32 border border-gray-200 hover:bg-gray-50 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition text-stone-700 bg-white">
                          <Plus size={26} className="text-emerald-600" />
                          <span className="text-xs font-bold">{t.upload_file}</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleReportImage}
                            className="hidden" 
                          />
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Severity level selection */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-600 block">{t.select_severity}</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { val: 'full', label: t.severity_full },
                        { val: 'overflowing', label: t.severity_overflowing },
                        { val: 'damaged', label: t.severity_damaged },
                        { val: 'illegal-dumping', label: t.severity_dumping }
                      ].map((sev) => (
                        <button
                          key={sev.val}
                          type="button"
                          onClick={() => setReportSeverity(sev.val as any)}
                          className={`py-2.5 px-3 border rounded-xl text-xs font-bold text-center transition ${
                            reportSeverity === sev.val ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          {sev.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Optional notes */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-600 block">{t.additional_notes}</label>
                    <textarea
                      rows={2}
                      value={reportNotes}
                      onChange={(e) => setReportNotes(e.target.value)}
                      placeholder="e.g. Near the bypass road side commercial shops..."
                      className="w-full border border-gray-200 rounded-xl p-3 text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                    />
                  </div>

                  <div className="text-[10px] text-gray-400 flex items-center gap-1">
                    <MapPin size={12} className="text-emerald-600 shrink-0" />
                    <span>{t.gps_captured}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!reportImage || submittingReport}
                  className="w-full py-3.5 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer shadow shadow-rose-600/15"
                >
                  {submittingReport ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      {t.submitting}
                    </>
                  ) : (
                    <>
                      <AlertTriangle size={18} />
                      {t.submit_report} (+15 Points)
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center space-y-4 shadow-sm">
                <div className="mx-auto w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center">
                  <CheckCircle size={32} />
                </div>
                <h3 className="font-extrabold text-gray-900 text-lg">Report Submitted!</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  {t.report_success}
                </p>
                <button
                  onClick={() => setReportSubmitted(false)}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition"
                >
                  Report Another
                </button>
              </div>
            )}

            {/* Nearby Open Reports list */}
            <div className="space-y-3">
              <h3 className="font-bold text-gray-900 text-sm">{t.reported_pins}</h3>
              
              {reports.filter(r => r.status !== 'collected').length === 0 ? (
                <div className="bg-white rounded-2xl p-6 border border-gray-100 text-center text-xs text-gray-400">
                  No active reports in Hyderabad. Safe clean city!
                </div>
              ) : (
                <div className="space-y-3">
                  {reports.filter(r => r.status !== 'collected').map((rep) => (
                    <div key={rep.reportId} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm space-y-3">
                      <div className="flex gap-3">
                        <img 
                          src={rep.imageUrl} 
                          alt="Overflowing bin" 
                          referrerPolicy="no-referrer"
                          className="h-16 w-16 rounded-lg object-cover bg-gray-50 shrink-0" 
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 px-2 py-0.5 rounded">
                              {rep.severity}
                            </span>
                            <span className="text-[9px] bg-amber-50 text-amber-800 px-2 py-0.5 rounded font-bold uppercase">
                              {rep.status}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-gray-900 mt-1.5 truncate flex items-center gap-1">
                            <MapPin size={12} className="text-rose-500 shrink-0" />
                            {rep.address}
                          </p>
                          <span className="text-[10px] text-gray-400 block mt-1">
                            {t.reported_by}: {rep.reporterName || 'Citizen'}
                          </span>
                        </div>
                      </div>

                      {/* Upvoting */}
                      <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                        <span className="text-xs font-bold text-gray-500">
                          {rep.upvotes || 0} {t.upvotes}
                        </span>
                        
                        <button
                          type="button"
                          disabled={(rep.upvotedBy || []).includes(profile.uid)}
                          onClick={() => upvoteReport(rep.reportId, rep.upvotedBy)}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition flex items-center gap-1.5 cursor-pointer ${
                            (rep.upvotedBy || []).includes(profile.uid) 
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                              : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                          }`}
                        >
                          <ThumbsUp size={12} />
                          {(rep.upvotedBy || []).includes(profile.uid) ? 'Tained Completed' : t.upvote_btn}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: SCHEDULE */}
        {activeTab === 'schedule' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h2 className="text-base font-black text-gray-900 mb-1">{t.schedule_title}</h2>
              <p className="text-xs text-gray-500 leading-relaxed mb-4">
                {t.schedule_desc}
              </p>

              <div className="bg-emerald-50 border border-emerald-100 p-3.5 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2">
                <MapPin size={16} />
                <span>{t.area_schedule_for}: {profile.address}, {profile.city}</span>
              </div>
            </div>

            {/* Next pickup Banner widget */}
            {nextPickup && (
              <div className="bg-gradient-to-r from-emerald-600 to-emerald-800 text-white p-5 rounded-2xl shadow shadow-emerald-700/10 space-y-3">
                <div className="flex items-center gap-2 text-emerald-300">
                  <Clock size={16} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">{t.pickup_reminder}</span>
                </div>
                <h3 className="font-extrabold text-base leading-snug">
                  {nextPickup.wasteType.toUpperCase()} {t.pickup_reminder_desc}
                </h3>
                <div className="flex justify-between items-center bg-white/10 p-3 rounded-xl border border-white/5 text-xs">
                  <span>Days: <span className="font-extrabold">{nextPickup.daysOfWeek.join(', ')}</span></span>
                  <span>Time: <span className="font-extrabold">{nextPickup.timeWindow}</span></span>
                </div>
              </div>
            )}

            {/* Waste Pickup Alerts & Notifications Settings Card */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-xl shrink-0 ${
                  notificationPermission === 'granted' && alertsSubscribed
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-rose-50 text-rose-500'
                }`}>
                  {notificationPermission === 'granted' && alertsSubscribed ? (
                    <Bell size={20} className="animate-pulse" />
                  ) : (
                    <BellOff size={20} />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-gray-900">{t.alerts_section_title}</h3>
                  <p className="text-[11px] text-gray-400 font-medium leading-normal mt-0.5">
                    {t.alerts_section_desc}
                  </p>
                </div>
              </div>

              {notificationError && (
                <div className="bg-rose-50 border border-rose-100 p-3 rounded-xl text-[11px] font-bold text-rose-700 flex items-center gap-2">
                  <AlertTriangle size={14} className="shrink-0" />
                  <span>{notificationError}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                {notificationPermission !== 'granted' || !alertsSubscribed ? (
                  <button
                    onClick={requestNotificationPermission}
                    className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-xs py-3 px-4 rounded-xl transition duration-150 shadow-sm shadow-emerald-600/10 cursor-pointer"
                  >
                    <Bell size={14} />
                    {t.enable_notifications_btn}
                  </button>
                ) : (
                  <div className="flex-1 flex items-center gap-2 bg-emerald-50 border border-emerald-100 px-4 py-3 rounded-xl">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                    <span className="text-[11px] font-bold text-emerald-800">
                      {t.notifications_enabled_status}
                    </span>
                  </div>
                )}

                <button
                  onClick={triggerSimulatedPickupAlert}
                  className="flex-1 flex items-center justify-center gap-2 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 text-gray-700 border border-gray-200 font-bold text-xs py-3 px-4 rounded-xl transition duration-150 cursor-pointer"
                >
                  <Zap size={14} className="text-amber-500" />
                  {t.simulate_notification_btn}
                </button>
              </div>

              {/* Status explanation */}
              <div className="text-[10px] text-gray-400 font-semibold flex items-center gap-1.5 pt-1.5 border-t border-gray-100">
                <Info size={12} className="text-gray-400" />
                <span>
                  {notificationPermission === 'granted' 
                    ? 'Active service worker registered at /sw.js' 
                    : 'A service worker registration will run in the background once notifications are allowed.'}
                </span>
              </div>
            </div>

            {/* Calendar list */}
            <div className="space-y-3">
              <h3 className="font-bold text-gray-900 text-sm">Weekly Pickup Calendar</h3>

              {matchedSchedules.length === 0 ? (
                <div className="bg-white rounded-2xl p-6 border border-gray-100 text-center text-xs text-gray-400 leading-relaxed">
                  {t.no_schedule}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {matchedSchedules.map((sch) => (
                    <div key={sch.scheduleId} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl shrink-0 ${
                          sch.wasteType === 'organic' ? 'bg-emerald-50 text-emerald-600' :
                          sch.wasteType === 'recyclable' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-600'
                        }`}>
                          <Calendar size={18} />
                        </div>
                        <div>
                          <h4 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider">
                            {sch.wasteType === 'organic' ? t.organic : sch.wasteType === 'recyclable' ? t.recyclable : t.general}
                          </h4>
                          <p className="text-[10px] text-gray-400 font-semibold mt-0.5">{sch.timeWindow}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-lg">
                          {sch.daysOfWeek.join(', ')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: WASTE MARKETPLACE */}
        {activeTab === 'market' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex justify-between items-center">
              <div>
                <h2 className="text-base font-black text-gray-900">{t.market_title}</h2>
                <p className="text-xs text-gray-500 mt-1">
                  {t.market_desc}
                </p>
              </div>
              <button
                onClick={() => setShowPostMarket(!showPostMarket)}
                className="p-2.5 bg-emerald-600 text-white rounded-full hover:bg-emerald-700 transition shadow shrink-0 cursor-pointer"
              >
                <Plus size={20} />
              </button>
            </div>

            {/* Post Marketplace form toggle modal */}
            {showPostMarket && (
              <motion.form 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                onSubmit={handlePostListing}
                className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-md space-y-3.5"
              >
                <h3 className="font-extrabold text-gray-900 text-sm">{t.post_listing}</h3>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">{t.waste_type}</label>
                    <select
                      value={mWasteType}
                      onChange={(e) => setMWasteType(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs outline-none bg-white font-semibold"
                    >
                      <option value="cardboard">Cardboard Boxes</option>
                      <option value="plastic-bottles">Plastic PET Bottles</option>
                      <option value="organic-restaurant">Restaurant Kitchen Waste</option>
                      <option value="metal-scrap">Scrap Iron/Aluminium</option>
                      <option value="e-waste">Discarded Electronics</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">{t.quantity}</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 15 kg, 2 bags"
                      value={mQuantity}
                      onChange={(e) => setMQuantity(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-emerald-500 transition font-semibold"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">{t.contact_phone}</label>
                  <input
                    type="tel"
                    required
                    placeholder="0300-1234567"
                    value={mPhone}
                    onChange={(e) => setMPhone(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-emerald-500 transition font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">{t.description_label}</label>
                  <textarea
                    rows={2}
                    required
                    value={mDesc}
                    onChange={(e) => setMDesc(e.target.value)}
                    placeholder="Dry packaging cardboard clean from rain damage..."
                    className="w-full border border-gray-200 rounded-xl p-3 text-xs outline-none focus:border-emerald-500 transition"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Attach Photo</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleMImage}
                    className="w-full text-xs"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition cursor-pointer"
                >
                  {t.post_btn} (+5 Points)
                </button>
              </motion.form>
            )}

            {/* List catalog */}
            <div className="space-y-4">
              {listings.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 border border-gray-100 text-center text-xs text-gray-400">
                  No marketplace listings uploaded yet. Be the first to list!
                </div>
              ) : (
                <div className="space-y-3">
                  {listings.map((item) => (
                    <div key={item.listingId} className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm flex flex-col">
                      <div className="flex p-4 gap-3">
                        <img 
                          src={item.imageUrl} 
                          alt="Waste Materials" 
                          referrerPolicy="no-referrer"
                          className="h-20 w-20 rounded-lg object-cover bg-gray-50 shrink-0 border border-gray-100" 
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <span className="text-[9px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded font-black uppercase">
                              {item.wasteType}
                            </span>
                            <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${
                              item.status === 'open' ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-400'
                            }`}>
                              {item.status === 'open' ? t.status_open : t.status_claimed}
                            </span>
                          </div>
                          
                          <h4 className="text-xs font-extrabold text-gray-900 mt-1.5 truncate">
                            {item.quantityEstimate}
                          </h4>
                          
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-normal">
                            {item.description}
                          </p>
                        </div>
                      </div>

                      {/* Detail footer trigger phone */}
                      <div className="bg-gray-50/50 border-t border-gray-100 px-4 py-3 flex justify-between items-center text-xs">
                        <span className="text-[10px] text-gray-400">
                          {t.posted_by}: <span className="font-bold text-gray-600">{item.posterName || 'Eco Generator'}</span>
                        </span>

                        {item.status === 'open' && (
                          <div className="flex gap-2">
                            {revealedPhones.includes(item.listingId) ? (
                              <a
                                href={`tel:${item.contactPhone}`}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1"
                              >
                                <Phone size={10} />
                                {item.contactPhone}
                              </a>
                            ) : (
                              <button
                                onClick={() => setRevealedPhones(prev => [...prev, item.listingId])}
                                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-3 py-1.5 rounded-lg text-[10px] font-bold"
                              >
                                {t.contact_poster}
                              </button>
                            )}

                            {item.posterId === profile.uid && (
                              <button
                                onClick={() => claimListing(item.listingId)}
                                className="bg-amber-50 hover:bg-amber-100 text-amber-800 px-3 py-1.5 rounded-lg text-[10px] font-bold"
                              >
                                Mark Claimed
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: LEARN & QUIZ */}
        {activeTab === 'edu' && (
          <div className="space-y-6">
            {!activeQuiz ? (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                  <h2 className="text-base font-black text-gray-900 mb-1">{t.edu_title}</h2>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    {t.edu_desc}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {eduLessons.map((les) => (
                    <div key={les.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm space-y-3">
                      <div className="flex justify-between items-start">
                        <h3 className="font-extrabold text-gray-900 text-sm">{les.title}</h3>
                        <span className="text-[10px] font-bold bg-amber-50 text-amber-800 px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0">
                          <Award size={12} /> +15 Points
                        </span>
                      </div>
                      
                      <p className="text-xs text-gray-500 leading-relaxed line-clamp-3">
                        {les.desc}
                      </p>

                      <div className="bg-gray-50 rounded-xl p-3 text-[11px] leading-relaxed text-gray-600 border border-gray-100 whitespace-pre-line">
                        {les.text}
                      </div>

                      <button
                        onClick={() => {
                          setActiveQuiz(les.quiz);
                          setQuizAnswers(new Array(les.quiz.questions.length).fill(-1));
                          setQuizSubmitted(false);
                        }}
                        className="w-full mt-2 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <GraduationCap size={16} />
                        {t.start_quiz}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-2xl border border-gray-100 p-5 shadow-lg space-y-5"
              >
                <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                  <h3 className="font-extrabold text-gray-900 text-sm">{activeQuiz.title}</h3>
                  <button 
                    onClick={() => setActiveQuiz(null)}
                    className="p-1.5 hover:bg-gray-100 text-gray-400 rounded-lg transition"
                  >
                    <X size={18} />
                  </button>
                </div>

                {activeQuiz.questions.map((quest, qIdx) => (
                  <div key={qIdx} className="space-y-2.5">
                    <h4 className="text-xs font-bold text-gray-800">
                      {qIdx + 1}. {quest.questionText}
                    </h4>

                    <div className="grid grid-cols-1 gap-2">
                      {quest.options.map((opt, oIdx) => {
                        const isSelected = quizAnswers[qIdx] === oIdx;
                        const isCorrect = oIdx === quest.correctIndex;
                        return (
                          <button
                            key={oIdx}
                            type="button"
                            disabled={quizSubmitted}
                            onClick={() => {
                              const copy = [...quizAnswers];
                              copy[qIdx] = oIdx;
                              setQuizAnswers(copy);
                            }}
                            className={`p-3 rounded-xl text-xs text-left border transition flex justify-between items-center ${
                              quizSubmitted 
                                ? isCorrect 
                                  ? 'bg-emerald-50 border-emerald-500 text-emerald-800 font-extrabold' 
                                  : isSelected 
                                    ? 'bg-rose-50 border-rose-300 text-rose-700' 
                                    : 'border-gray-100 text-gray-400'
                                : isSelected 
                                  ? 'border-emerald-600 bg-emerald-50/50 text-emerald-800 font-bold' 
                                  : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                            }`}
                          >
                            <span>{opt}</span>
                            {quizSubmitted && isCorrect && <CheckCircle size={14} className="text-emerald-600" />}
                            {quizSubmitted && isSelected && !isCorrect && <X size={14} className="text-rose-500" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {!quizSubmitted ? (
                  <button
                    onClick={submitQuiz}
                    disabled={quizAnswers.includes(-1)}
                    className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl text-xs hover:bg-emerald-700 disabled:opacity-40 transition cursor-pointer"
                  >
                    Submit Answers
                  </button>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200 text-center">
                      <h4 className="font-black text-emerald-800 text-base">{t.quiz_finished}</h4>
                      <p className="text-xs text-emerald-600 mt-1">
                        {t.quiz_score}: <span className="font-extrabold">{quizScore} / {activeQuiz.questions.length}</span>
                      </p>
                      <p className="text-[10px] text-emerald-500 font-semibold mt-1">
                        +{quizScore * activeQuiz.pointsPerCorrect} {t.points} Credited!
                      </p>
                    </div>
                    
                    <button
                      onClick={() => setActiveQuiz(null)}
                      className="w-full py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-600 font-bold text-xs rounded-xl"
                    >
                      Back to lessons
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        )}

        {/* TAB 6: PROFILE & REWARDS STORE */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-700 rounded-full flex items-center justify-center overflow-hidden shrink-0">
                    {profile.profileImage ? (
                      <img src={profile.profileImage} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <User size={28} />
                    )}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-gray-900 text-base">{profile.fullName || profile.displayName}</h3>
                    <p className="text-xs text-gray-400 font-medium">{profile.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowEditProfile(!showEditProfile)}
                  className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  {showEditProfile ? 'View Badges' : 'Edit Profile'}
                </button>
              </div>

              {showEditProfile ? (
                <ProfileSettings onClose={() => setShowEditProfile(false)} />
              ) : (
                <>
                  {/* Badges Tier progress */}
                  <div className="space-y-1.5 pt-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-gray-600">Tier Tier Badges</span>
                      <span className="font-extrabold text-emerald-700">Level {profile.badges.join(', ')}</span>
                    </div>
                    <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-600 transition-all duration-500"
                        style={{ width: `${Math.min(100, ((profile.points || 0) / 1000) * 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] text-gray-400 font-bold">
                      <span>0 pts</span>
                      <span>1000 pts (Eco Champion)</span>
                    </div>
                  </div>

                  {/* Address selector update */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">{t.address_label}</label>
                    <select
                      value={profile.address}
                      onChange={(e) => handleUpdateAddress(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs outline-none bg-white font-semibold"
                    >
                      <option value="Latifabad No. 7">Latifabad No. 7</option>
                      <option value="Qasimabad Phase 1">Qasimabad Phase 1</option>
                      <option value="Saddar Cantt">Saddar Cantt</option>
                      <option value="Unit 6 Latifabad">Unit 6 Latifabad</option>
                      <option value="Unit 10 Latifabad">Unit 10 Latifabad</option>
                    </select>
                  </div>

                  <div className="flex justify-between items-center text-xs text-gray-400 pt-3 border-t border-gray-100">
                    <span>Total Scans: <span className="font-bold text-gray-800">{profile.scanCount || 0}</span></span>
                    <span>Bin Reports: <span className="font-bold text-gray-800">{profile.reportCount || 0}</span></span>
                  </div>
                </>
              )}
            </div>

            {/* Badges Hub */}
            <div className="space-y-2.5">
              <h3 className="font-bold text-gray-900 text-sm">{t.badges_earned}</h3>
              <div className="grid grid-cols-4 gap-2.5">
                {[
                  { id: 'Eco Novice', title: 'Novice', color: 'bg-emerald-50 text-emerald-700' },
                  { id: 'Bronze Recycler', title: 'Bronze', color: 'bg-orange-50 text-orange-700' },
                  { id: 'Silver Recycler', title: 'Silver', color: 'bg-slate-100 text-slate-700' },
                  { id: 'Gold Eco-Champion', title: 'Champion', color: 'bg-amber-50 text-amber-700' }
                ].map((bad) => {
                  const hasBadge = (profile.badges || []).includes(bad.id);
                  return (
                    <div 
                      key={bad.id} 
                      className={`rounded-xl p-3 border text-center flex flex-col items-center justify-center gap-1.5 ${
                        hasBadge ? `${bad.color} border-current/20` : 'bg-gray-50 border-gray-200 text-gray-300 opacity-50'
                      }`}
                    >
                      <Award size={20} className={hasBadge ? 'animate-bounce' : ''} />
                      <span className="text-[10px] font-bold leading-tight">{bad.title}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Redeem Rewards store Catalog */}
            <div className="space-y-3">
              <h3 className="font-bold text-gray-900 text-sm">{t.rewards_store}</h3>
              
              <div className="grid grid-cols-1 gap-3">
                {rewards.map((rew) => {
                  const canRedeem = (profile.points || 0) >= rew.pointsCost;
                  return (
                    <div key={rew.rewardId} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex gap-3.5 items-center">
                      <img 
                        src={rew.imageUrl} 
                        alt={rew.title} 
                        referrerPolicy="no-referrer"
                        className="h-14 w-14 rounded-lg object-cover bg-gray-50 border border-gray-100 shrink-0" 
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-black text-gray-900">{rew.title}</h4>
                        <p className="text-[10px] text-gray-400 mt-0.5 leading-normal line-clamp-1">{rew.description}</p>
                        <span className="text-[10px] font-bold text-emerald-700 mt-1 block">
                          Cost: {rew.pointsCost} Points
                        </span>
                      </div>
                      
                      <button
                        onClick={() => redeemRewardItem(rew)}
                        disabled={!canRedeem}
                        className={`px-3 py-2 text-[10px] font-bold rounded-lg transition shrink-0 cursor-pointer ${
                          canRedeem ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        {canRedeem ? t.redeem_btn : t.insufficient_points}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* My Redemptions History */}
            {redemptions.length > 0 && (
              <div className="space-y-2.5">
                <h3 className="font-bold text-gray-900 text-sm">Vouchers Claimed</h3>
                <div className="space-y-2">
                  {redemptions.map((red) => (
                    <div key={red.redemptionId} className="bg-white rounded-xl border border-dashed border-emerald-300 p-3.5 flex justify-between items-center shadow-sm">
                      <div>
                        <h4 className="text-xs font-black text-gray-900">{red.rewardTitle}</h4>
                        <span className="text-[10px] text-gray-400">Claimed: {red.redeemedAt?.toDate ? red.redeemedAt.toDate().toLocaleDateString() : 'Just now'}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-black text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 border border-emerald-200/50 rounded-lg select-all">
                          {red.voucherCode}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={onSignOut}
              className="w-full mt-6 py-3.5 border border-rose-200 hover:bg-rose-50 text-rose-600 font-bold text-xs rounded-xl transition cursor-pointer"
            >
              {t.sign_out}
            </button>
          </div>
        )}

      </main>

      {/* Bottom responsive navigation rail */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-100 shadow-2xl py-2 z-40">
        <div className="max-w-md mx-auto px-4 grid grid-cols-6 gap-1">
          {[
            { id: 'scan', label: t.scan, icon: Camera },
            { id: 'report', label: t.report, icon: AlertTriangle },
            { id: 'schedule', label: t.schedule, icon: Calendar },
            { id: 'market', label: t.marketplace, icon: ShoppingBag },
            { id: 'edu', label: t.edu_hub, icon: GraduationCap },
            { id: 'profile', label: t.profile, icon: User }
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex flex-col items-center gap-1.5 py-1 text-[9px] font-black tracking-tight text-center transition cursor-pointer ${
                  isSelected ? 'text-natural-dark font-black scale-105' : 'text-stone-400 hover:text-stone-600'
                }`}
              >
                <div className={`p-1.5 rounded-xl transition-colors ${isSelected ? 'bg-natural-pale text-natural-dark' : 'bg-transparent'}`}>
                  <Icon size={18} />
                </div>
                <span className="truncate max-w-[56px] leading-none">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Real Live Camera Modal */}
      {cameraActive && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between p-4 md:p-6 backdrop-blur-sm text-white">
          <div className="flex justify-between items-center w-full max-w-md mx-auto">
            <div>
              <h3 className="font-extrabold text-base tracking-tight flex items-center gap-2 text-emerald-400">
                <span className="w-2.5 h-2.5 bg-rose-600 rounded-full animate-ping shrink-0" />
                Live Camera Inspection
              </h3>
              <p className="text-[10px] text-gray-400">Scan items or document report status</p>
            </div>
            <button 
              type="button"
              onClick={stopCamera}
              className="p-2 hover:bg-white/10 rounded-full transition cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center max-w-md w-full mx-auto my-4 relative">
            {cameraError ? (
              <div className="bg-red-955/40 border border-red-500/30 p-6 rounded-2xl text-center space-y-4 max-w-xs">
                <AlertTriangle className="text-rose-500 mx-auto animate-bounce" size={40} />
                <p className="text-xs text-red-200 leading-relaxed">{cameraError}</p>
                <div className="pt-2">
                  <label className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-2.5 px-4 rounded-xl cursor-pointer block transition shadow">
                    Choose Existing Photo
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = async () => {
                            const rawBase64 = reader.result as string;
                            const compressed = await compressImage(rawBase64);
                            if (cameraTarget === 'scan') {
                              setScanResult(null);
                              setScanImage(compressed);
                              analyzeWaste(compressed);
                            } else if (cameraTarget === 'report') {
                              setReportImage(compressed);
                            }
                            stopCamera();
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden" 
                    />
                  </label>
                </div>
              </div>
            ) : (
              <div className="relative w-full aspect-[4/3] max-h-[70vh] rounded-3xl overflow-hidden bg-zinc-900 border border-white/10 shadow-2xl flex items-center justify-center">
                <video 
                  ref={videoRef}
                  autoPlay 
                  playsInline 
                  muted 
                  className="w-full h-full object-cover"
                />
                
                {/* Visual Camera Guides */}
                <div className="absolute inset-4 pointer-events-none border border-white/10 rounded-2xl flex items-center justify-center">
                  <div className="w-16 h-16 border-2 border-emerald-500/20 rounded-full"></div>
                </div>
                
                {/* Camera stream indicator */}
                {!cameraStream && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-950">
                    <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs text-zinc-400">Waking up webcam...</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="w-full max-w-md mx-auto flex flex-col items-center gap-4">
            <div className="flex items-center gap-6 justify-center">
              {videoDevices.length > 1 && !cameraError && (
                <button
                  type="button"
                  onClick={switchCamera}
                  className="bg-zinc-800 hover:bg-zinc-700 text-white p-3 rounded-full transition cursor-pointer"
                  title="Switch Camera Device"
                >
                  <Share2 size={20} className="transform rotate-90" />
                </button>
              )}

              {!cameraError && (
                <button
                  type="button"
                  onClick={capturePhoto}
                  disabled={!cameraStream}
                  className="w-16 h-16 rounded-full bg-white border-4 border-zinc-300 flex items-center justify-center active:scale-95 transition cursor-pointer disabled:opacity-40"
                  title="Capture Frame"
                >
                  <div className="w-11 h-11 bg-emerald-600 rounded-full hover:bg-emerald-500 transition" />
                </button>
              )}

              <button
                type="button"
                onClick={stopCamera}
                className="bg-zinc-850 hover:bg-zinc-800 text-zinc-300 p-3 rounded-full transition cursor-pointer"
                title="Cancel"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-[10px] text-zinc-500 text-center">Ensure sufficient lighting for better AI prediction accuracy</p>
          </div>
        </div>
      )}
    </div>
  );
}
