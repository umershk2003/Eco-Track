export type UserRole = 'citizen' | 'collector' | 'admin' | 'super_admin';
export type WasteCategory = 'recyclable-paper' | 'recyclable-plastic' | 'recyclable-glass' | 'recyclable-metal' | 'organic' | 'e-waste' | 'landfill' | 'hazardous';
export type BinColor = 'Blue Bin' | 'Green Bin' | 'Black Bin' | 'Red Bin (special handling)';
export type Language = 'en' | 'ur' | 'sd';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  role: UserRole;
  city: string;
  address: string;
  points: number;
  badges: string[];
  scanCount: number;
  reportCount: number;
  createdAt: any; // Firestore Timestamp
  language: Language;
  businessName?: string;
  lastScanDate?: string; // YYYY-MM-DD
  streakCount?: number;
  profileImage?: string;
  fullName?: string;
  phoneNumber?: string;
  phone?: string;
  area?: string;
  status?: string;
}

export interface WasteScan {
  scanId: string;
  userId: string;
  imageUrl: string;
  predictedCategory: WasteCategory;
  binColor: string;
  confidence: number;
  aiExplanation: string;
  pointsAwarded: number;
  createdAt: any;
}

export interface BinReport {
  reportId: string;
  userId: string;
  imageUrl: string;
  latitude: number;
  longitude: number;
  address: string;
  status: 'reported' | 'acknowledged' | 'collected' | 'invalid';
  severity: 'full' | 'overflowing' | 'damaged' | 'illegal-dumping';
  reportedAt: any;
  resolvedAt: any | null;
  upvotes: number;
  pointsAwarded: number;
  reporterName?: string;
  upvotedBy?: string[]; // Array of userIds who upvoted
}

export interface CollectionSchedule {
  scheduleId: string;
  areaName: string;
  city: string;
  wasteType: 'organic' | 'recyclable' | 'general' | 'mixed';
  collectorId: string;
  daysOfWeek: string[];
  timeWindow: string; // e.g. "7:00 AM - 9:00 AM"
  active: boolean;
}

export interface MarketplaceListing {
  listingId: string;
  posterId: string;
  posterName?: string;
  posterType: 'generator' | 'collector';
  wasteType: string;
  quantityEstimate: string;
  description: string;
  imageUrl: string;
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  status: 'open' | 'claimed' | 'closed';
  createdAt: any;
  contactPhone: string;
}

export interface Reward {
  rewardId: string;
  title: string;
  description: string;
  pointsCost: number;
  partner: string;
  stock: number;
  imageUrl: string;
}

export interface Redemption {
  redemptionId: string;
  userId: string;
  rewardId: string;
  rewardTitle: string;
  pointsSpent: number;
  status: 'pending' | 'fulfilled';
  redeemedAt: any;
  voucherCode: string;
}

export interface QuizQuestion {
  questionText: string;
  options: string[];
  correctIndex: number;
}

export interface Quiz {
  quizId: string;
  title: string;
  questions: QuizQuestion[];
  pointsPerCorrect: number;
}

export interface QuizAttempt {
  attemptId: string;
  userId: string;
  quizId: string;
  score: number;
  completedAt: any;
}

export interface ChatMessage {
  messageId: string;
  userId: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: any;
}
