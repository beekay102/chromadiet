// =============================================================
// src/components/ProtectedRoute.jsx
// Wraps protected pages. Redirects to /login if not authenticated.
// =============================================================

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children, requireStaff = false, requireAdmin = false }) {
  const { isAuthenticated, isStaff, isAdmin, loading, profileLoading } = useAuth();
  const location = useLocation();

  // Show loading screen only on initial session check. Profile revalidation
  // (e.g., on tab focus) shouldn't unmount the children — that resets local
  // state like the active tab.
  if (loading) {
    return (
    <div className="min-h-screen flex items-center justify-center" style={{
      background: 'linear-gradient(180deg, #F0F7E8 0%, #E3EFD3 50%, #F0F7E8 100%)',
    }}>
      <div className="text-stone-500 text-sm">Loading…</div>
    </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  if (requireStaff && !isStaff) {
    return <Navigate to="/" replace />;
  }

  return children;
}
