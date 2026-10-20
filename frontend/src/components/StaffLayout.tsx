import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { apiClient } from '../api/client';
import {
  LayoutDashboard,
  CreditCard,
  Building2,
  ListOrdered,
  ClipboardCheck,
  Radio,
  FileBarChart2,
  Settings,
  LogOut,
  Menu,
  X,
  Wifi,
  WifiOff,
  CircleSlash,
  User as UserIcon,
} from 'lucide-react';

interface DeviceStatus {
  device_id: string;
  status: 'online' | 'offline' | 'never_connected';
  last_seen_at: string | null;
}

export const StaffLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [deviceStatuses, setDeviceStatuses] = useState<DeviceStatus[]>([]);

  // Navigation items with icons and explicit text labels
  const navItems = [
    { to: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/app/cards', label: 'Cards', icon: CreditCard },
    { to: '/app/library', label: 'Library', icon: Building2 },
    { to: '/app/instructions', label: 'Instructions', icon: ListOrdered },
    { to: '/app/assessments', label: 'Assessments', icon: ClipboardCheck },
    { to: '/app/scans', label: 'Live Scans', icon: Radio },
    { to: '/app/reports', label: 'Reports', icon: FileBarChart2 },
    { to: '/app/settings', label: 'Settings', icon: Settings },
  ];

  // Derive page title from route
  const currentNav = navItems.find((item) => location.pathname.startsWith(item.to));
  const pageTitle = currentNav ? currentNav.label : 'Staff Portal';

  // Poll device status every 5 seconds
  useEffect(() => {
    let isMounted = true;
    const fetchStatus = async () => {
      try {
        const statuses = await apiClient<DeviceStatus[]>('/api/devices/status');
        if (isMounted) {
          setDeviceStatuses(statuses);
        }
      } catch {
        // Silently catch to avoid intrusive alerts during polling
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Compute aggregate device status: Online, Offline, or Never connected
  let overallStatus: 'online' | 'offline' | 'never_connected' = 'never_connected';
  if (deviceStatuses.length > 0) {
    if (deviceStatuses.some((d) => d.status === 'online')) {
      overallStatus = 'online';
    } else if (deviceStatuses.some((d) => d.status === 'offline')) {
      overallStatus = 'offline';
    } else {
      overallStatus = 'never_connected';
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col">
      {/* Skip to main content accessibility link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-[var(--color-primary)] focus:text-white focus:rounded focus:outline-none focus:ring-2 focus:ring-white font-medium"
      >
        Skip to main content
      </a>

      <div className="flex flex-1">
        {/* Sidebar for Desktop */}
        <aside
          id="sidebar-navigation"
          aria-label="Staff sidebar navigation"
          className={`fixed inset-y-0 left-0 z-40 w-64 bg-[var(--color-surface)] border-r border-gray-300 flex flex-col transform transition-none lg:static lg:translate-x-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Brand header */}
          <div className="h-16 flex items-center justify-between px-6 border-b border-gray-300 bg-[var(--color-surface)]">
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-[var(--color-primary)] tracking-wide">
                ACCESS-EASE
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1.5 rounded text-[var(--color-muted)] hover:text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          {/* Nav items */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium transition-none ${
                      isActive
                        ? 'bg-[var(--color-primary)] text-white'
                        : 'text-[var(--color-text)] hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]'
                    }`
                  }
                >
                  <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* User profile info in sidebar footer */}
          <div className="p-4 border-t border-gray-300 bg-[var(--color-surface)]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center font-semibold text-xs shrink-0">
                <UserIcon className="w-4 h-4" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[var(--color-text)] truncate">
                  {user?.username || 'Staff'}
                </p>
                <p className="text-xs text-[var(--color-muted)] capitalize truncate">
                  {user?.role || 'Staff Member'}
                </p>
              </div>
            </div>
          </div>
        </aside>

        {/* Mobile backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Bar */}
          <header className="h-16 bg-white border-b border-gray-300 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded text-[var(--color-muted)] hover:text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                aria-label="Open sidebar navigation"
              >
                <Menu className="w-5 h-5" aria-hidden="true" />
              </button>
              <h1 className="text-lg font-bold text-[var(--color-text)]">{pageTitle}</h1>
            </div>

            {/* Top Bar Right: Device Status + User Controls */}
            <div className="flex items-center gap-4">
              {/* Device Status Badge (Always uses Icon + Text, never color alone) */}
              <div
                className="flex items-center gap-2 px-3 py-1 rounded text-xs font-semibold border"
                role="status"
                aria-label={`Reader Device Status: ${
                  overallStatus === 'online'
                    ? 'Online'
                    : overallStatus === 'offline'
                    ? 'Offline'
                    : 'Never connected'
                }`}
              >
                {overallStatus === 'online' && (
                  <>
                    <Wifi className="w-4 h-4 text-[var(--color-success)] shrink-0" aria-hidden="true" />
                    <span className="w-2 h-2 rounded-full bg-[var(--color-success)]" aria-hidden="true" />
                    <span className="text-[var(--color-success)]">Reader: Online</span>
                  </>
                )}
                {overallStatus === 'offline' && (
                  <>
                    <WifiOff className="w-4 h-4 text-[var(--color-danger)] shrink-0" aria-hidden="true" />
                    <span className="w-2 h-2 rounded-full bg-[var(--color-danger)]" aria-hidden="true" />
                    <span className="text-[var(--color-danger)]">Reader: Offline</span>
                  </>
                )}
                {overallStatus === 'never_connected' && (
                  <>
                    <CircleSlash className="w-4 h-4 text-[var(--color-neutral)] shrink-0" aria-hidden="true" />
                    <span className="w-2 h-2 rounded-full bg-[var(--color-neutral)]" aria-hidden="true" />
                    <span className="text-[var(--color-neutral)]">Reader: Never connected</span>
                  </>
                )}
              </div>

              {/* Logout button */}
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[var(--color-danger)] hover:bg-red-50 rounded border border-transparent hover:border-red-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-danger)]"
                aria-label="Log out of staff portal"
              >
                <LogOut className="w-4 h-4" aria-hidden="true" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </header>

          {/* Main Outlet */}
          <main
            id="main-content"
            tabIndex={-1}
            className="flex-1 p-4 sm:p-6 lg:p-8 outline-none"
          >
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};
