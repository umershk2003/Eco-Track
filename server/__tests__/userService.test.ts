// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserService } from '../services/userService';
import { userRepository } from '../repositories/userRepository';

vi.mock('../repositories/userRepository', () => ({
  userRepository: {
    findByUid: vi.fn(),
    findByEmail: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

describe('UserService', () => {
  const service = new UserService();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getProfile', () => {
    it('should return profile if found', async () => {
      const mockProfile = { uid: '123', fullName: 'Wasif Ghori', email: 'wasif@example.com' };
      vi.mocked(userRepository.findByUid).mockResolvedValue(mockProfile as any);

      const result = await service.getProfile('123');
      expect(result).toEqual(mockProfile);
      expect(userRepository.findByUid).toHaveBeenCalledWith('123');
    });

    it('should return null if profile not found', async () => {
      vi.mocked(userRepository.findByUid).mockResolvedValue(null);

      const result = await service.getProfile('unknown');
      expect(result).toBeNull();
    });
  });

  describe('getProfileByEmail', () => {
    it('should return profile when searching by email', async () => {
      const mockProfile = { uid: '123', email: 'wasif@example.com' };
      vi.mocked(userRepository.findByEmail).mockResolvedValue(mockProfile as any);

      const result = await service.getProfileByEmail('wasif@example.com');
      expect(result).toEqual(mockProfile);
      expect(userRepository.findByEmail).toHaveBeenCalledWith('wasif@example.com');
    });
  });

  describe('createProfile', () => {
    it('should throw error if profile already exists', async () => {
      vi.mocked(userRepository.findByUid).mockResolvedValue({ uid: '123' } as any);

      await expect(
        service.createProfile('123', { fullName: 'Name', email: 'e@e.com', area: 'Area', phone: '123' })
      ).rejects.toThrow('User profile already exists');
    });

    it('should successfully create a citizen profile and return it', async () => {
      vi.mocked(userRepository.findByUid)
        .mockResolvedValueOnce(null) // for check
        .mockResolvedValueOnce({ uid: '123', fullName: 'New User', role: 'citizen' } as any); // for after create retrieval

      const result = await service.createProfile('123', {
        fullName: 'New User',
        email: 'new@example.com',
        area: 'Qasimabad',
        phone: '03001234567',
      });

      expect(result.fullName).toBe('New User');
      expect(result.role).toBe('citizen');
      expect(userRepository.create).toHaveBeenCalled();
    });
  });

  describe('updateProfile', () => {
    it('should throw if user to update does not exist', async () => {
      vi.mocked(userRepository.findByUid).mockResolvedValue(null);

      await expect(
        service.updateProfile('123', { fullName: 'New Name' })
      ).rejects.toThrow('User profile not found');
    });

    it('should successfully update valid profile fields', async () => {
      const mockOld = { uid: '123', fullName: 'Old' };
      const mockNew = { uid: '123', fullName: 'New' };
      vi.mocked(userRepository.findByUid)
        .mockResolvedValueOnce(mockOld as any)
        .mockResolvedValueOnce(mockNew as any);

      const result = await service.updateProfile('123', { fullName: 'New' });
      expect(result.fullName).toBe('New');
      expect(userRepository.update).toHaveBeenCalledWith('123', { fullName: 'New' });
    });
  });

  describe('updateRoleAndStatusByAdmin', () => {
    it('should throw if target user does not exist', async () => {
      vi.mocked(userRepository.findByUid).mockResolvedValue(null);

      await expect(
        service.updateRoleAndStatusByAdmin('123', 'admin')
      ).rejects.toThrow('Target user profile not found');
    });

    it('should update role and status successfully', async () => {
      const mockOld = { uid: '123', role: 'citizen', status: 'active' };
      const mockNew = { uid: '123', role: 'admin', status: 'disabled' };
      vi.mocked(userRepository.findByUid)
        .mockResolvedValueOnce(mockOld as any)
        .mockResolvedValueOnce(mockNew as any);

      const result = await service.updateRoleAndStatusByAdmin('123', 'admin', 'disabled');
      expect(result.role).toBe('admin');
      expect(result.status).toBe('disabled');
      expect(userRepository.update).toHaveBeenCalledWith('123', { role: 'admin', status: 'disabled' });
    });
  });
});
