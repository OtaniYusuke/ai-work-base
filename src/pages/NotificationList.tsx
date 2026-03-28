import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { notifications as allNotifications } from '../data/mockData';
import type { Notification } from '../data/mockData';

type ReadFilter = 'unread' | 'read' | 'all';

const filterTabs: { label: string; value: ReadFilter }[] = [
  { label: '未読', value: 'unread' },
  { label: '既読', value: 'read' },
  { label: '全て', value: 'all' },
];

const TYPE_STYLES: Record<Notification['type'], { bg: string; border: string; label: string }> = {
  approval_request: {
    bg: 'bg-yellow-100 text-yellow-700',
    border: 'border-l-yellow-500',
    label: '承認依頼',
  },
  exception: {
    bg: 'bg-red-100 text-red-700',
    border: 'border-l-red-500',
    label: '例外',
  },
  completed: {
    bg: 'bg-green-100 text-green-700',
    border: 'border-l-green-500',
    label: '完了',
  },
  failed: {
    bg: 'bg-red-100 text-red-700',
    border: 'border-l-red-500',
    label: '失敗',
  },
  returned: {
    bg: 'bg-orange-100 text-orange-700',
    border: 'border-l-orange-500',
    label: '差し戻し',
  },
  stop_request: {
    bg: 'bg-gray-100 text-gray-700',
    border: 'border-l-gray-500',
    label: '停止依頼',
  },
};

const TYPE_ICONS: Record<Notification['type'], React.ReactNode> = {
  approval_request: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
    </svg>
  ),
  exception: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  ),
  completed: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  failed: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  returned: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
    </svg>
  ),
  stop_request: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
    </svg>
  ),
};

function getRelatedLink(notif: Notification): { to: string; label: string } | null {
  if (notif.type === 'approval_request' || notif.type === 'returned') {
    return { to: '/approvals', label: '承認一覧を開く' };
  }
  if (notif.type === 'exception') {
    return { to: '/exceptions', label: '例外一覧を開く' };
  }
  if (notif.type === 'completed' || notif.type === 'failed') {
    return { to: '/instances', label: 'インスタンス一覧を開く' };
  }
  if (notif.type === 'stop_request') {
    return { to: '/workflows', label: 'ワークフロー一覧を開く' };
  }
  return null;
}

export default function NotificationList() {
  const { currentUser } = useAuth();
  const [activeFilter, setActiveFilter] = useState<ReadFilter>('unread');
  const [notifs, setNotifs] = useState(allNotifications);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">ログインしてください</p>
      </div>
    );
  }

  const userNotifs = notifs
    .filter((n) => n.toUserId === currentUser.id)
    .filter((n) => {
      if (activeFilter === 'unread') return !n.read;
      if (activeFilter === 'read') return n.read;
      return true;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const unreadCount = notifs.filter(
    (n) => n.toUserId === currentUser.id && !n.read
  ).length;

  const markAsRead = (notifId: string) => {
    setNotifs((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifs((prev) =>
      prev.map((n) =>
        n.toUserId === currentUser.id ? { ...n, read: true } : n
      )
    );
  };

  const handleNotificationClick = (notif: Notification) => {
    markAsRead(notif.id);
    setSelectedNotification(notif);
  };

  const closeDetail = () => {
    setSelectedNotification(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">通知一覧</h1>
          {unreadCount > 0 && (
            <span className="inline-flex items-center justify-center rounded-full bg-red-500 px-2.5 py-0.5 text-xs font-bold text-white">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            全て既読にする
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {filterTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveFilter(tab.value)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeFilter === tab.value
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.label}
            {tab.value === 'unread' && unreadCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Notification List */}
      <div className="space-y-2">
        {userNotifs.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm px-6 py-12 text-center text-sm text-gray-400">
            通知はありません
          </div>
        ) : (
          userNotifs.map((notif) => {
            const style = TYPE_STYLES[notif.type];
            const icon = TYPE_ICONS[notif.type];
            return (
              <button
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`w-full text-left rounded-lg border border-l-4 shadow-sm p-4 flex items-start gap-4 transition-colors ${
                  notif.read
                    ? `bg-white border-gray-200 ${style.border} hover:bg-gray-50`
                    : `bg-blue-50 border-blue-200 ${style.border} hover:bg-blue-100`
                }`}
              >
                {/* Type Icon */}
                <span className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${style.bg}`}>
                  {icon}
                </span>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${style.bg}`}>
                      {style.label}
                    </span>
                    {!notif.read && (
                      <span className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500" />
                    )}
                  </div>
                  <p className={`text-sm font-medium mt-1 truncate ${notif.read ? 'text-gray-700' : 'text-gray-900'}`}>
                    {notif.title}
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{notif.body}</p>
                  <p className="text-xs text-gray-400 mt-1">{notif.createdAt}</p>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Detail Panel */}
      {selectedNotification && (
        <div className="fixed inset-0 z-50 flex items-start justify-end">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/30" onClick={closeDetail} />

          {/* Panel */}
          <div className="relative z-10 h-full w-full max-w-lg overflow-y-auto bg-white shadow-xl">
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
              <h2 className="text-lg font-bold text-gray-900">通知詳細</h2>
              <button
                onClick={closeDetail}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="space-y-6 px-6 py-6">
              {/* Type Badge */}
              {(() => {
                const style = TYPE_STYLES[selectedNotification.type];
                const icon = TYPE_ICONS[selectedNotification.type];
                return (
                  <div className="flex items-center gap-3">
                    <span className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${style.bg}`}>
                      {icon}
                    </span>
                    <span className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${style.bg}`}>
                      {style.label}
                    </span>
                    <span className="text-xs text-gray-400">{selectedNotification.read ? '既読' : '未読'}</span>
                  </div>
                );
              })()}

              {/* Title */}
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">タイトル</p>
                <p className="mt-1 text-base font-semibold text-gray-900">{selectedNotification.title}</p>
              </div>

              {/* Body */}
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">内容</p>
                <p className="mt-1 text-sm text-gray-700 leading-relaxed">{selectedNotification.body}</p>
              </div>

              {/* Timestamp */}
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">受信日時</p>
                <p className="mt-1 text-sm text-gray-500">{selectedNotification.createdAt}</p>
              </div>

              {/* Related Link */}
              {(() => {
                const link = getRelatedLink(selectedNotification);
                return link ? (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">関連ページ</p>
                    <a
                      href={link.to}
                      onClick={(e) => {
                        e.preventDefault();
                        closeDetail();
                        window.location.hash = link.to;
                      }}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                      </svg>
                      {link.label}
                    </a>
                  </div>
                ) : null;
              })()}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 border-t border-gray-200 bg-gray-50 px-6 py-4">
              <button
                onClick={closeDetail}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
