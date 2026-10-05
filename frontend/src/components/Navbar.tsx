import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Activity, BookOpen, Brain, Clock3, GitBranch, Home, LogOut, UserCog } from 'lucide-react';
import { useAuth } from '../auth/useAuth';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [logoutError, setLogoutError] = useState(false);

  if (!user || location.pathname === '/login') return null;

  const staffNavItems = [
    { path: '/predict', label: 'Predict & Explain', icon: Brain },
    { path: '/history', label: 'My History', icon: Clock3 },
  ];
  const projectNavItems = [
    { path: '/', label: 'Dashboard', icon: Home },
    { path: '/pipeline', label: 'How It Works', icon: GitBranch },
    { path: '/predict', label: 'Predict & Explain', icon: Brain },
    { path: '/history', label: 'History', icon: Clock3 },
    { path: '/guide', label: 'Project Guide', icon: BookOpen },
  ];
  const navItems = user.role === 'staff' ? staffNavItems : projectNavItems;
  if (user.role === 'manager') {
    navItems.push({ path: '/users', label: 'Manage Users', icon: UserCog });
  }

  async function handleLogout() {
    setLogoutError(false);
    try {
      await signOut();
      navigate('/login', { replace: true });
    } catch {
      setLogoutError(true);
    }
  }

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 backdrop-blur-sm bg-white/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">ChurnXAI</h1>
              <p className="text-xs text-slate-500">Explainable Customer Retention</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-1 sm:gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.path === '/'
                ? location.pathname === item.path
                : location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  title={item.label}
                  aria-label={item.label}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                    isActive
                      ? 'bg-primary-50 text-primary-700 font-semibold'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden text-sm lg:inline">{item.label}</span>
                </Link>
              );
            })}
            <div className="ml-1 flex items-center gap-2 border-l border-slate-200 pl-2">
              <span className="hidden text-right sm:block">
                <span className="block text-xs font-semibold text-slate-800">{user.username}</span>
                <span className="block text-[10px] capitalize text-slate-500">{user.role}</span>
              </span>
              <button
                aria-label="Sign out"
                className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-rose-700"
                onClick={handleLogout}
                title="Sign out"
                type="button"
              >
                <LogOut aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
        {logoutError && <p className="mt-2 text-right text-xs text-rose-700" role="alert">Sign-out request failed. Try again.</p>}
      </div>
    </nav>
  );
}