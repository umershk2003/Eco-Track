export type UserRole = 'citizen' | 'collector' | 'admin' | 'super_admin';

export interface UserProfile {
  uid: string;
  fullName: string;
  email: string;
  role: UserRole;
  area: string;
  phone: string;
  profileImage: string;
  createdAt: any;
  updatedAt: any;
  emailVerified: boolean;
  status: 'active' | 'disabled';
  points: number;
  badges: string[];
  scanCount: number;
  reportCount: number;
  city?: string;
  businessName?: string;
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
  upvotedBy?: string[];
}

export interface CollectionSchedule {
  scheduleId: string;
  areaName: string;
  city: string;
  wasteType: 'organic' | 'recyclable' | 'general' | 'mixed';
  collectorId: string;
  daysOfWeek: string[];
  timeWindow: string;
  active: boolean;
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
