import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';

// Mock firebase/auth
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({})),
  onAuthStateChanged: vi.fn((auth, cb) => {
    // Immediate callback with null user for unauthenticated state
    cb(null);
    return () => {};
  }),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  sendEmailVerification: vi.fn(),
  signInWithPopup: vi.fn(),
}));

vi.mock('../../lib/firebase', () => ({
  auth: { currentUser: null },
  googleProvider: {},
}));

function TestComponent() {
  const { user, profile, loading } = useAuth();
  return (
    <div>
      <span data-testid="loading">{loading ? 'true' : 'false'}</span>
      <span data-testid="user">{user ? 'authenticated' : 'unauthenticated'}</span>
      <span data-testid="profile">{profile ? 'loaded' : 'none'}</span>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('provides default loading state and null user', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('loading').textContent).toBe('false');
    expect(screen.getByTestId('user').textContent).toBe('unauthenticated');
    expect(screen.getByTestId('profile').textContent).toBe('none');
  });

  it('restores session from fallback storage if present', async () => {
    const mockProfile = { uid: 'google_fallback_123', fullName: 'John Doe', email: 'john@doe.com', role: 'citizen' };
    localStorage.setItem('ecotrack_fallback_profile', JSON.stringify(mockProfile));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('loading').textContent).toBe('false');
    expect(screen.getByTestId('user').textContent).toBe('authenticated');
    expect(screen.getByTestId('profile').textContent).toBe('loaded');
  });
});
