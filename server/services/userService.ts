import { userRepository } from '../repositories/userRepository';
import { UserProfile, UserRole } from '../types';

export class UserService {
  async getProfile(uid: string): Promise<UserProfile | null> {
    return userRepository.findByUid(uid);
  }

  async getProfileByEmail(email: string): Promise<UserProfile | null> {
    return userRepository.findByEmail(email);
  }

  async createProfile(uid: string, data: { fullName: string; email: string; area: string; phone: string; profileImage?: string; emailVerified?: boolean; role?: UserRole; businessName?: string }): Promise<UserProfile> {
    const existing = await userRepository.findByUid(uid);
    if (existing) {
      throw new Error('User profile already exists');
    }

    const assignedRole = data.role || 'citizen';

    const newProfile: Partial<UserProfile> = {
      uid,
      fullName: data.fullName,
      email: data.email.toLowerCase().trim(),
      role: assignedRole,
      area: data.area,
      phone: data.phone,
      profileImage: data.profileImage || '',
      emailVerified: data.emailVerified ?? false,
      status: 'active',
      points: 10, // Welcoming points!
      badges: ['Eco Novice'],
      scanCount: 0,
      reportCount: 0,
      ...(assignedRole === 'collector' ? { businessName: data.businessName || '' } : {})
    };

    await userRepository.create(uid, newProfile);
    const created = await userRepository.findByUid(uid);
    if (!created) {
      throw new Error('Failed to retrieve newly created user profile');
    }
    return created;
  }

  async updateProfile(uid: string, data: { fullName?: string; phone?: string; area?: string; profileImage?: string; role?: UserRole; businessName?: string }): Promise<UserProfile> {
    const profile = await userRepository.findByUid(uid);
    if (!profile) {
      throw new Error('User profile not found');
    }

    const updates: Partial<UserProfile> = {};
    if (data.fullName !== undefined) updates.fullName = data.fullName;
    if (data.phone !== undefined) updates.phone = data.phone;
    if (data.area !== undefined) updates.area = data.area;
    if (data.profileImage !== undefined) updates.profileImage = data.profileImage;
    if (data.role !== undefined) updates.role = data.role;
    if (data.businessName !== undefined) updates.businessName = data.businessName;

    await userRepository.update(uid, updates);
    const updated = await userRepository.findByUid(uid);
    if (!updated) {
      throw new Error('Failed to retrieve updated profile');
    }
    return updated;
  }

  async updateRoleAndStatusByAdmin(targetUid: string, role: UserRole, status?: 'active' | 'disabled'): Promise<UserProfile> {
    const profile = await userRepository.findByUid(targetUid);
    if (!profile) {
      throw new Error('Target user profile not found');
    }

    const updates: Partial<UserProfile> = { role };
    if (status !== undefined) {
      updates.status = status;
    }

    await userRepository.update(targetUid, updates);
    const updated = await userRepository.findByUid(targetUid);
    if (!updated) {
      throw new Error('Failed to retrieve updated profile after admin role change');
    }
    return updated;
  }

  async getAllProfiles(): Promise<UserProfile[]> {
    return userRepository.findAll();
  }
}

export const userService = new UserService();
