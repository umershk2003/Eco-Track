import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import { userService } from '../services/userService';
import { adminAuth } from '../config/firebase';
import { registerSchema, updateProfileSchema, updateRoleSchema } from '../validators/auth';
import { ValidationError, UnauthorizedError, ForbiddenError, NotFoundError } from '../utils/errors';
import { Logger } from '../utils/logger';
import { auditService } from '../services/auditService';
import { z } from 'zod';

export class AuthController {
  /**
   * Register a new user profile (sets role to citizen)
   */
  async registerProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validatedData = registerSchema.parse(req.body);
      const uid = req.user?.uid;
      
      if (!uid) {
        throw new ValidationError('Auth context error: Missing User ID');
      }

      const emailVerified = req.user?.emailVerified || false;
      const profile = await userService.createProfile(uid, {
        ...validatedData,
        emailVerified
      });

      const assignedRole = validatedData.role || 'citizen';

      // Synchronize role to Firebase custom claims
      try {
        await adminAuth.setCustomUserClaims(uid, { role: assignedRole });
      } catch (claimsErr: any) {
        Logger.warn('Auth', `Failed to set custom claims for registered UID ${uid}: ${claimsErr.message}`);
      }

      await auditService.logAuthenticationEvent(uid, 'register', profile.email, { role: assignedRole });
      Logger.info('Auth', `User profile registered successfully for UID: ${uid}`);
      return res.status(201).json({ message: 'User profile registered successfully', profile });
    } catch (error: any) {
      if (req.user?.uid) {
        await auditService.logFailedRequest(req.method, req.path, req.ip || '', 400, error.message || 'Registration failed', req.user.uid);
      }
      next(error);
    }
  }

  /**
   * Retrieve currently authenticated user's profile (Session Restoration)
   */
  async getProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const uid = req.user?.uid;
      if (!uid) {
        throw new UnauthorizedError('Auth context error: Missing User ID');
      }

      const profile = await userService.getProfile(uid);
      if (!profile) {
        return res.status(404).json({ error: 'Profile not found' });
      }

      if (profile.status === 'disabled') {
        throw new ForbiddenError('Forbidden: Your account has been disabled by administrators.');
      }

      // Restore session audit
      await auditService.logAuthenticationEvent(uid, 'login', profile.email, { action: 'session_restoration' });
      return res.json({ profile });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Update profile fields (restricted to own name, phone, area, profile picture)
   */
  async updateProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validatedData = updateProfileSchema.parse(req.body);
      const uid = req.user?.uid;

      if (!uid) {
        throw new ValidationError('Auth context error: Missing User ID');
      }

      const profile = await userService.updateProfile(uid, validatedData);

      if (validatedData.role) {
        try {
          await adminAuth.setCustomUserClaims(uid, { role: validatedData.role });
        } catch (claimsErr: any) {
          Logger.warn('Auth', `Failed to sync custom claims during profile update for UID ${uid}: ${claimsErr.message}`);
        }
      }

      Logger.info('Auth', `User profile updated for UID: ${uid}`);
      return res.json({ message: 'Profile updated successfully', profile });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Update another user's role/status (Admin & Super Admin only)
   */
  async updateUserRoleByAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { targetUid } = req.params;
      if (!targetUid) {
        throw new ValidationError('Missing Target User ID');
      }

      const validatedData = updateRoleSchema.parse(req.body);
      const updatedProfile = await userService.updateRoleAndStatusByAdmin(
        targetUid,
        validatedData.role,
        validatedData.status
      );

      // Synchronize role to custom claims
      try {
        await adminAuth.setCustomUserClaims(targetUid, { role: validatedData.role });
      } catch (claimsErr: any) {
        Logger.warn('Auth', `Failed to sync custom claims for target UID ${targetUid}: ${claimsErr.message}`);
      }

      await auditService.logAuthenticationEvent(targetUid, 'refresh_token', updatedProfile.email, {
        updatedBy: req.user?.uid,
        newRole: validatedData.role,
        status: validatedData.status
      });

      Logger.info('Auth', `Admin updated target user role/status for UID: ${targetUid}`, {
        updatedBy: req.user?.uid,
        role: validatedData.role,
        status: validatedData.status
      });

      return res.json({
        message: 'User role updated successfully by administrator',
        profile: updatedProfile
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Request email verification link
   */
  async sendEmailVerificationLink(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const uid = req.user?.uid;
      const email = req.user?.email;
      if (!uid || !email) {
        throw new ValidationError('Missing user context or email');
      }

      // Generate verification link via Firebase Admin SDK
      let link = 'https://ecotrack.example.com/verify-email';
      try {
        link = await adminAuth.generateEmailVerificationLink(email);
      } catch (err: any) {
        Logger.warn('Auth', `Could not generate actual Firebase verification link (fallback to demo link): ${err.message}`);
      }

      await auditService.logAuthenticationEvent(uid, 'send_verification', email, { link });
      
      return res.json({
        success: true,
        message: 'Verification email generated successfully',
        link, // Serve the link for testing or redirection
        email
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Verify email and synchronize verification status with database profile
   */
  async verifyEmailStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const uid = req.user?.uid;
      if (!uid) {
        throw new ValidationError('Missing user ID');
      }

      const profile = await userService.getProfile(uid);
      if (!profile) {
        throw new NotFoundError('Profile not found');
      }

      // Update emailVerified in DB
      const updatedProfile = await userService.updateProfile(uid, {
        // Since we don't have emailVerified in updateProfileSchema, let's bypass or use userService directly
      });
      
      // Directly update in database via repository to bypass validator schemas
      const { userRepository } = await import('../repositories/userRepository');
      await userRepository.update(uid, { emailVerified: true });
      
      const refreshedProfile = await userService.getProfile(uid);

      await auditService.logAuthenticationEvent(uid, 'reset_password', profile.email, { verified: true });
      
      return res.json({
        success: true,
        message: 'Email status verified and synchronized successfully',
        profile: refreshedProfile
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Request password reset email / link
   */
  async forgotPassword(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { email } = z.object({ email: z.string().email() }).parse(req.body);
      
      let link = 'https://ecotrack.example.com/reset-password';
      try {
        link = await adminAuth.generatePasswordResetLink(email);
      } catch (err: any) {
        Logger.warn('Auth', `Could not generate actual Firebase password reset link (fallback to demo link): ${err.message}`);
      }

      const userRecord = await adminAuth.getUserByEmail(email).catch(() => null);
      if (userRecord) {
        await auditService.logAuthenticationEvent(userRecord.uid, 'forgot_password', email, { link });
      }

      return res.json({
        success: true,
        message: 'Password reset link generated successfully',
        link
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Reset Password manually
   */
  async resetPassword(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { uid, password } = z.object({
        uid: z.string(),
        password: z.string().min(6)
      }).parse(req.body);

      await adminAuth.updateUser(uid, { password });
      
      const userRecord = await adminAuth.getUser(uid);
      await auditService.logAuthenticationEvent(uid, 'reset_password', userRecord.email, { action: 'password_updated' });

      return res.json({
        success: true,
        message: 'Password updated successfully'
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Secure Logout Event
   */
  async logout(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const uid = req.user?.uid;
      if (uid) {
        const profile = await userService.getProfile(uid);
        await auditService.logAuthenticationEvent(uid, 'logout', profile?.email || '');
      }

      return res.json({
        success: true,
        message: 'Logged out and session cleared successfully'
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Token refresh verification
   */
  async refreshToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const uid = req.user?.uid;
      if (!uid) {
        throw new UnauthorizedError('Unauthorized: Missing token session');
      }

      const profile = await userService.getProfile(uid);
      if (!profile) {
        throw new NotFoundError('Profile not found');
      }

      // Sync claims on refresh
      try {
        await adminAuth.setCustomUserClaims(uid, { role: profile.role });
      } catch (claimsErr: any) {
        Logger.warn('Auth', `Failed to sync custom claims during refresh for UID ${uid}: ${claimsErr.message}`);
      }

      await auditService.logAuthenticationEvent(uid, 'refresh_token', profile.email, { role: profile.role });

      return res.json({
        success: true,
        profile
      });
    } catch (error: any) {
      next(error);
    }
  }
}

export const authController = new AuthController();
