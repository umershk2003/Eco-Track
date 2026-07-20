import { z } from 'zod';

export const registerSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must be less than 100 characters'),
  email: z.string().email('Invalid email address'),
  area: z.string().min(2, 'Area must be at least 2 characters').max(200, 'Area must be less than 200 characters'),
  phone: z.string().min(8, 'Phone number must be at least 8 digits').max(20, 'Phone number must be less than 20 digits'),
  profileImage: z.string().optional(),
  role: z.enum(['citizen', 'collector', 'admin', 'super_admin']).optional(),
  businessName: z.string().optional()
});

export const updateProfileSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must be less than 100 characters').optional(),
  phone: z.string().min(8, 'Phone number must be at least 8 digits').max(20, 'Phone number must be less than 20 digits').optional(),
  area: z.string().min(2, 'Area must be at least 2 characters').max(200, 'Area must be less than 200 characters').optional(),
  profileImage: z.string().optional(),
  role: z.enum(['citizen', 'collector', 'admin', 'super_admin']).optional(),
  businessName: z.string().optional()
});

export const updateRoleSchema = z.object({
  role: z.enum(['citizen', 'collector', 'admin', 'super_admin']),
  status: z.enum(['active', 'disabled']).optional()
});
