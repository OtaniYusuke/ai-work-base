import { useState, useRef, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABELS, notifications } from '../data/mockData';

const navItems = [
  { path: '/', label: 'ワークフロー管理', icon: '🔄' },
  { path: '/agents', label: 'AIエージェント', icon: '🤖' },
  { path: '/conversations', label: '会話', icon: '💬' },
  { path: '/datasources', label: 'データ元本', icon: '💾' },
  { path: '/settings', label: '設定', icon: '⚙️' },
];

export default function Layout() {
  const { currentUser, logout } = useAuth();
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);

  const userNotifications = currentUser
    ? notifications
        .filter(n => n.toUserId === currentUser.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 5)
    : [];

  const unreadCount = currentUser
    ? notifications.filter(
        n => n.toUserId === currentUser.id && !n.read && !readIds.has(n.id)
      ).length
    : 0;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = (id: string) => {
    setReadIds(prev => new Set(prev).add(id));
    setShowNotifications(false);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-cyan-400">AI-WOS</h1>
            <p className="text-xs text-slate-400 mt-1">AI Workflow Operating System</p>
          </div>

          {/* Notification bell */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowNotifications(prev => !prev)}
              className="relative p-1.5 rounded hover:bg-slate-700 transition-colors"
            >
              <span className="text-lg">🔔</span>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 top-10 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 text-gray-800">
                <div className="px-4 py-2 border-b border-gray-100 font-semibold text-sm text-gray-600">
                  通知
                </div>
                {userNotifications.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-gray-400">
                    通知はありません
                  </div>
                ) : (
                  <ul>
                    {userNotifications.map(n => {
                      const isUnread = !n.read && !readIds.has(n.id);
                      return (
                        <li key={n.id}>
                          <button
                            onClick={() => markAsRead(n.id)}
                            className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-start gap-2 border-b border-gray-50 last:border-0"
                          >
                            {isUnread && (
                              <span className="mt-1.5 w-2 h-2 rounded-full bg-cyan-500 flex-shrink-0" />
                            )}
                            {!isUnread && (
                              <span className="mt-1.5 w-2 h-2 rounded-full bg-transparent flex-shrink-0" />
                            )}
                            <div className="min-w-0">
                              <div className={`text-sm truncate ${isUnread ? 'font-semibold' : 'text-gray-600'}`}>
                                {n.title}
                              </div>
                              <div className="text-xs text-gray-400 mt-0.5">{n.createdAt}</div>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 py-2 overflow-y-auto">
          {navItems.map(item => {
            const isActive = item.path === '/'
              ? location.pathname === '/' || location.pathname.startsWith('/workflows')
              : location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-slate-700 text-white border-r-2 border-cyan-400'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User info */}
        <div className="p-4 border-t border-slate-700">
          <div className="text-sm font-medium">{currentUser?.name}</div>
          <div className="text-xs text-slate-400">{currentUser ? ROLE_LABELS[currentUser.role] : ''}</div>
          <div className="text-xs text-slate-500">{currentUser?.department}</div>
          <button
            onClick={logout}
            className="mt-2 text-xs text-slate-400 hover:text-white transition-colors"
          >
            ログアウト →
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
