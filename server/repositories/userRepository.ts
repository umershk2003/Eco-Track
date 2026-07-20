import { adminDb } from '../config/firebase';
import { FieldValue } from 'firebase-admin/firestore';
import { UserProfile, UserRole } from '../types';
import { Logger } from '../utils/logger';

export class UserRepository {
  private collection = adminDb.collection('users');
  private memoryDb = new Map<string, any>();
  private useMemoryFallback = false;

  private isPermissionDenied(error: any): boolean {
    const msg = error?.message || '';
    return (
      msg.includes('PERMISSION_DENIED') ||
      msg.includes('permission') ||
      msg.includes('7') ||
      error?.code === 7
    );
  }

  async findByUid(uid: string): Promise<UserProfile | null> {
    if (this.useMemoryFallback) {
      return this.memoryDb.get(uid) || null;
    }
    try {
      const docRef = this.collection.doc(uid);
      const docSnap = await docRef.get();
      if (!docSnap.exists) {
        return null;
      }
      return docSnap.data() as UserProfile;
    } catch (error: any) {
      if (this.isPermissionDenied(error)) {
        Logger.warn('Firestore', `Firestore read permission denied for UID: ${uid}. Falling back to in-memory storage.`);
        this.useMemoryFallback = true;
        return this.memoryDb.get(uid) || null;
      }
      throw error;
    }
  }

  async findAll(): Promise<UserProfile[]> {
    if (this.useMemoryFallback) {
      return Array.from(this.memoryDb.values());
    }
    try {
      const snap = await this.collection.get();
      return snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
    } catch (error: any) {
      if (this.isPermissionDenied(error)) {
        this.useMemoryFallback = true;
        return Array.from(this.memoryDb.values());
      }
      throw error;
    }
  }

  async findByEmail(email: string): Promise<UserProfile | null> {
    const normalizedEmail = email.toLowerCase().trim();
    if (this.useMemoryFallback) {
      for (const profile of this.memoryDb.values()) {
        if (profile.email?.toLowerCase().trim() === normalizedEmail) {
          return profile;
        }
      }
      return null;
    }
    try {
      const querySnap = await this.collection.where('email', '==', normalizedEmail).get();
      if (querySnap.empty) {
        return null;
      }
      const docSnap = querySnap.docs[0];
      return { uid: docSnap.id, ...docSnap.data() } as UserProfile;
    } catch (error: any) {
      if (this.isPermissionDenied(error)) {
        Logger.warn('Firestore', `Firestore query permission denied for email: ${email}. Falling back to in-memory storage.`);
        this.useMemoryFallback = true;
        for (const profile of this.memoryDb.values()) {
          if (profile.email?.toLowerCase().trim() === normalizedEmail) {
            return profile;
          }
        }
        return null;
      }
      throw error;
    }
  }

  async create(uid: string, profile: Partial<UserProfile>): Promise<void> {
    const newProfile = {
      uid,
      ...profile,
      points: profile.points ?? 0,
      badges: profile.badges ?? [],
      scanCount: profile.scanCount ?? 0,
      reportCount: profile.reportCount ?? 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: (profile as any).status ?? 'active'
    };

    if (this.useMemoryFallback) {
      this.memoryDb.set(uid, newProfile);
      return;
    }

    try {
      await this.collection.doc(uid).set({
        ...profile,
        points: profile.points ?? 0,
        badges: profile.badges ?? [],
        scanCount: profile.scanCount ?? 0,
        reportCount: profile.reportCount ?? 0,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        status: (profile as any).status ?? 'active'
      });
    } catch (error: any) {
      if (this.isPermissionDenied(error)) {
        Logger.warn('Firestore', `Firestore write permission denied for UID: ${uid}. Storing in memory fallback.`);
        this.useMemoryFallback = true;
        this.memoryDb.set(uid, newProfile);
        return;
      }
      throw error;
    }
  }

  async update(uid: string, profile: Partial<UserProfile>): Promise<void> {
    if (this.useMemoryFallback) {
      const existing = this.memoryDb.get(uid) || {};
      this.memoryDb.set(uid, {
        ...existing,
        ...profile,
        updatedAt: new Date()
      });
      return;
    }

    try {
      await this.collection.doc(uid).update({
        ...profile,
        updatedAt: FieldValue.serverTimestamp()
      });
    } catch (error: any) {
      if (this.isPermissionDenied(error)) {
        Logger.warn('Firestore', `Firestore update permission denied for UID: ${uid}. Updating in memory fallback.`);
        this.useMemoryFallback = true;
        const existing = this.memoryDb.get(uid) || {};
        this.memoryDb.set(uid, {
          ...existing,
          ...profile,
          updatedAt: new Date()
        });
        return;
      }
      throw error;
    }
  }
}

export const userRepository = new UserRepository();
