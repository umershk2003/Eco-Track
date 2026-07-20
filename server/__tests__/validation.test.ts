// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { registerSchema, updateProfileSchema, updateRoleSchema } from '../validators/auth';

describe('Zod Validation Schemas', () => {
  describe('registerSchema', () => {
    it('should pass with valid data', () => {
      const valid = {
        fullName: 'Zubair Khan',
        email: 'zubair@hyderabad.com',
        area: 'Latifabad No. 5',
        phone: '03123456789'
      };
      const result = registerSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should fail with invalid email', () => {
      const invalid = {
        fullName: 'Zubair Khan',
        email: 'not-an-email',
        area: 'Latifabad No. 5',
        phone: '03123456789'
      };
      const result = registerSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Invalid email');
      }
    });

    it('should fail when name is too short', () => {
      const invalid = {
        fullName: 'Z',
        email: 'zubair@hyderabad.com',
        area: 'Latifabad',
        phone: '03123456789'
      };
      const result = registerSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('updateProfileSchema', () => {
    it('should allow optional fields', () => {
      const valid = {
        fullName: 'New Name'
      };
      const result = updateProfileSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });
  });

  describe('updateRoleSchema', () => {
    it('should allow valid roles', () => {
      const valid = {
        role: 'collector',
        status: 'active'
      };
      const result = updateRoleSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject invalid roles', () => {
      const invalid = {
        role: 'super_citizen'
      };
      const result = updateRoleSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });
});
