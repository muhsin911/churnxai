import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import type { UserRole } from '../types';

export default function RequireAuth({
  children,
  allowedRoles,
}: {
  children: ReactNode;
  allowedRoles?: UserRole[];
}) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="p-10 text-center text-slate-600">Checking your project account…</div>;
  }
  if (!user) {
    return <Navigate replace state={{ from: location }} to="/login" />;
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate replace to={user.role === 'staff' ? '/predict' : '/'} />;
  }
  return children;
}
