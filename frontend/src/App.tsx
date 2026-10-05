import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
import RequireAuth from './components/RequireAuth';
import Dashboard from './pages/Dashboard';
import Pipeline from './pages/Pipeline';
import Predict from './pages/Predict';
import ProjectGuide from './pages/ProjectGuide';
import Login from './pages/Login';
import PredictionHistory from './pages/PredictionHistory';
import UserManagement from './pages/UserManagement';
import { AuthProvider } from './auth/AuthContext';
import { useAuth } from './auth/useAuth';

function LoginRoute() {
  const { isLoading, user } = useAuth();
  if (isLoading) return <div className="p-10 text-center text-slate-600">Loading…</div>;
  if (user) return <Navigate replace to={user.role === 'staff' ? '/predict' : '/'} />;
  return <Login />;
}

function AuthenticatedRoutes() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <Routes>
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/" element={<RequireAuth allowedRoles={['manager', 'professor']}><main className="max-w-7xl mx-auto px-6 py-8"><Dashboard /></main></RequireAuth>} />
        <Route path="/pipeline" element={<RequireAuth allowedRoles={['manager', 'professor']}><main className="max-w-7xl mx-auto px-6 py-8"><Pipeline /></main></RequireAuth>} />
        <Route path="/predict" element={<RequireAuth allowedRoles={['staff', 'manager', 'professor']}><main className="max-w-7xl mx-auto px-6 py-8"><Predict /></main></RequireAuth>} />
        <Route path="/history" element={<RequireAuth allowedRoles={['staff', 'manager', 'professor']}><main className="max-w-7xl mx-auto px-6 py-8"><PredictionHistory /></main></RequireAuth>} />
        <Route path="/guide" element={<RequireAuth allowedRoles={['manager', 'professor']}><main className="max-w-7xl mx-auto px-6 py-8"><ProjectGuide /></main></RequireAuth>} />
        <Route path="/users" element={<RequireAuth allowedRoles={['manager']}><main className="max-w-7xl mx-auto px-6 py-8"><UserManagement /></main></RequireAuth>} />
        <Route path="*" element={<Navigate replace to="/predict" />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AuthenticatedRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}