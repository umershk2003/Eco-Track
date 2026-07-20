import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import RoleGuard from '../RoleGuard';
import { useAuth } from '../../hooks/useAuth';

vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

describe('RoleGuard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading spinner when auth is loading', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      profile: null,
      loading: true,
      error: null,
    } as any);

    render(
      <RoleGuard allowedRoles={['admin']}>
        <div>Secret Content</div>
      </RoleGuard>
    );

    // Should not render the secret content
    expect(screen.queryByText('Secret Content')).toBeNull();
  });

  it('renders sign-in message if user is not authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      profile: null,
      loading: false,
      error: null,
    } as any);

    render(
      <RoleGuard allowedRoles={['admin']}>
        <div>Secret Content</div>
      </RoleGuard>
    );

    expect(screen.getByText('Authentication Required')).toBeDefined();
    expect(screen.queryByText('Secret Content')).toBeNull();
  });

  it('renders forbidden access warning if role is unauthorized', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { uid: '123' },
      profile: { uid: '123', role: 'citizen' },
      loading: false,
      error: null,
    } as any);

    render(
      <RoleGuard allowedRoles={['admin']}>
        <div>Secret Content</div>
      </RoleGuard>
    );

    expect(screen.getByText('Access Unauthorized')).toBeDefined();
    expect(screen.queryByText('Secret Content')).toBeNull();
  });

  it('renders children if user role is authorized', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { uid: '123' },
      profile: { uid: '123', role: 'admin' },
      loading: false,
      error: null,
    } as any);

    render(
      <RoleGuard allowedRoles={['admin']}>
        <div>Secret Content</div>
      </RoleGuard>
    );

    expect(screen.getByText('Secret Content')).toBeDefined();
  });
});
