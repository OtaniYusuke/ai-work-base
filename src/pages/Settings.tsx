import { useState, useMemo } from 'react';
import {
  categories,
  categoryPermissions,
  users,
  PERMISSION_LABELS,
  PERMISSION_DESCRIPTIONS,
  type CategoryPermission,
  type BusinessCategory,
  type CategoryPermissionEntry,
} from '../data/mockData';
import { useAuth } from '../context/AuthContext';

type NotificationType = 'approval_request' | 'exception' | 'completed' | 'failed' | 'returned' | 'stop_request';

const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  approval_request: '承認依頼',
  exception: '例外発生',
  completed: '実行完了',
  failed: '実行失敗',
  returned: '差し戻し',
  stop_request: '停止依頼',
};

const PERMISSION_GROUPS: { label: string; permissions: CategoryPermission[] }[] = [
  { label: '作る側', permissions: ['create_edit'] },
  { label: '承認する側', permissions: ['approve'] },
  { label: '実行する側', permissions: ['execute'] },
  { label: '管理', permissions: ['stop', 'admin'] },
];

const allPermissionKeys: CategoryPermission[] = ['create_edit', 'approve', 'execute', 'stop', 'admin'];

export default function Settings() {
  const { currentUser } = useAuth();

  // Notification toggles
  const [notifSettings, setNotifSettings] = useState<Record<NotificationType, boolean>>({
    approval_request: true,
    exception: true,
    completed: true,
    failed: true,
    returned: false,
    stop_request: true,
  });

  const toggleNotif = (type: NotificationType) => {
    setNotifSettings(prev => ({ ...prev, [type]: !prev[type] }));
  };

  // Category tree state
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(categories.filter(c => c.parentId === null).map(c => c.id)));
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  // Bulk grant state
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkSelectedUsers, setBulkSelectedUsers] = useState<Set<string>>(new Set());
  const [bulkSelectedPerms, setBulkSelectedPerms] = useState<Set<CategoryPermission>>(new Set());

  const rootCategories = categories.filter(c => c.parentId === null);

  const getChildren = (parentId: string): BusinessCategory[] =>
    categories.filter(c => c.parentId === parentId);

  const getPermissions = (categoryId: string): CategoryPermissionEntry[] =>
    categoryPermissions.filter(cp => cp.categoryId === categoryId);

  const selectedCategory = useMemo(
    () => categories.find(c => c.id === selectedCategoryId) ?? null,
    [selectedCategoryId]
  );

  // Check if current user has admin permission for the selected category
  const hasAdminForSelected = useMemo(() => {
    if (!currentUser || !selectedCategoryId) return false;
    const entry = categoryPermissions.find(
      cp => cp.categoryId === selectedCategoryId && cp.userId === currentUser.id
    );
    return entry?.permissions.includes('admin') ?? false;
  }, [currentUser, selectedCategoryId]);

  const toggleExpand = (catId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      next.has(catId) ? next.delete(catId) : next.add(catId);
      return next;
    });
  };

  const selectCategory = (catId: string) => {
    setSelectedCategoryId(catId);
    setBulkOpen(false);
    setBulkSelectedUsers(new Set());
    setBulkSelectedPerms(new Set());
  };

  // Bulk grant helpers
  const openBulkGrant = () => {
    setBulkOpen(true);
    setBulkSelectedUsers(new Set());
    setBulkSelectedPerms(new Set());
  };

  const toggleBulkUser = (userId: string) => {
    setBulkSelectedUsers(prev => {
      const next = new Set(prev);
      next.has(userId) ? next.delete(userId) : next.add(userId);
      return next;
    });
  };

  const toggleBulkPerm = (perm: CategoryPermission) => {
    setBulkSelectedPerms(prev => {
      const next = new Set(prev);
      next.has(perm) ? next.delete(perm) : next.add(perm);
      return next;
    });
  };

  const quickGrantPerms = (perms: CategoryPermission[]) => {
    setBulkSelectedPerms(new Set(perms));
  };

  const applyBulkGrant = () => {
    if (bulkSelectedUsers.size === 0 || bulkSelectedPerms.size === 0) {
      alert('ユーザーと権限を選択してください');
      return;
    }
    alert('権限を付与しました');
    setBulkOpen(false);
  };

  // Category tree rendering
  const renderCategoryNode = (cat: BusinessCategory, depth: number = 0) => {
    const children = getChildren(cat.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedCategories.has(cat.id);
    const isSelected = selectedCategoryId === cat.id;

    return (
      <div key={cat.id}>
        <div
          className={`flex items-center gap-1 px-3 py-2 cursor-pointer rounded-md text-sm transition-colors ${
            isSelected
              ? 'bg-cyan-50 text-cyan-800 font-semibold border-l-4 border-cyan-600'
              : 'text-gray-700 hover:bg-gray-50'
          }`}
          style={{ paddingLeft: `${depth * 16 + 12}px` }}
          onClick={() => selectCategory(cat.id)}
        >
          {hasChildren ? (
            <button
              onClick={e => {
                e.stopPropagation();
                toggleExpand(cat.id);
              }}
              className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600 flex-shrink-0"
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          ) : (
            <span className="w-5 flex-shrink-0" />
          )}
          <span>{cat.icon}</span>
          <span className="truncate">{cat.name}</span>
        </div>
        {hasChildren && isExpanded && (
          <div>
            {children.map(child => renderCategoryNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // Permission matrix for selected category
  const renderPermissionMatrix = () => {
    if (!selectedCategory) {
      return (
        <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
          左のカテゴリツリーからカテゴリを選択してください
        </div>
      );
    }

    const perms = getPermissions(selectedCategory.id);
    const isReadOnly = !hasAdminForSelected;

    return (
      <div>
        {/* Category header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-gray-800">
            {selectedCategory.icon} {selectedCategory.name}
          </h3>
          {!isReadOnly && (
            <button
              onClick={openBulkGrant}
              className="text-xs px-3 py-1.5 bg-cyan-600 text-white rounded hover:bg-cyan-700 transition-colors font-medium"
            >
              一括付与
            </button>
          )}
        </div>

        {/* Admin lock message */}
        {isReadOnly && (
          <div className="flex items-center gap-2 mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <svg className="w-5 h-5 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span className="text-sm text-amber-700">権限管理にはadmin権限が必要です</span>
          </div>
        )}

        {/* Permission legend */}
        <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-xs font-semibold text-gray-500 mb-2">権限の説明</p>
          <div className="grid grid-cols-1 gap-1">
            {allPermissionKeys.map(pk => (
              <div key={pk} className="flex items-start gap-2 text-xs">
                <span className="font-medium text-gray-700 min-w-[160px]">{PERMISSION_LABELS[pk]}</span>
                <span className="text-gray-500">{PERMISSION_DESCRIPTIONS[pk]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Permission matrix table */}
        {perms.length === 0 ? (
          <p className="text-sm text-gray-400 py-4">このカテゴリには権限設定がありません</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left px-3 py-2 font-medium text-gray-600 border-b border-gray-200" rowSpan={2}>
                    ユーザー
                  </th>
                  {PERMISSION_GROUPS.map(group => (
                    <th
                      key={group.label}
                      className="text-center px-2 py-1.5 font-semibold text-gray-700 border-b border-l border-gray-200 bg-gray-200/60 text-xs"
                      colSpan={group.permissions.length}
                    >
                      {group.label}
                    </th>
                  ))}
                </tr>
                <tr className="bg-gray-50">
                  {allPermissionKeys.map(pk => (
                    <th
                      key={pk}
                      className="text-center px-2 py-1.5 font-medium text-gray-600 border-b border-l border-gray-200 text-xs"
                      title={PERMISSION_DESCRIPTIONS[pk]}
                    >
                      <span className="cursor-help border-b border-dotted border-gray-400">
                        {PERMISSION_LABELS[pk]}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {perms.map(p => {
                  const user = users.find(u => u.id === p.userId);
                  return (
                    <tr key={p.userId} className="border-t border-gray-100 hover:bg-gray-50/50">
                      <td className="px-3 py-2 font-medium text-gray-700">
                        <div>{user?.name ?? p.userId}</div>
                        {user && (
                          <div className="text-xs text-gray-400">{user.department}</div>
                        )}
                      </td>
                      {allPermissionKeys.map(pk => (
                        <td key={pk} className="text-center px-2 py-2 border-l border-gray-100">
                          <input
                            type="checkbox"
                            checked={p.permissions.includes(pk)}
                            disabled={isReadOnly}
                            readOnly={isReadOnly}
                            onChange={() => {
                              // Mock toggle - in real app, would update state
                            }}
                            className={`w-4 h-4 accent-cyan-600 ${isReadOnly ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Bulk grant panel */}
        {bulkOpen && !isReadOnly && (
          <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h5 className="text-sm font-semibold mb-3 text-gray-700">
              一括権限付与 - {selectedCategory.name}
            </h5>

            <div className="grid grid-cols-2 gap-6">
              {/* User selection */}
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">ユーザー選択</p>
                <div className="space-y-1 max-h-48 overflow-y-auto border border-gray-200 rounded p-2 bg-white">
                  {users.map(u => (
                    <label key={u.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 px-1 py-0.5 rounded">
                      <input
                        type="checkbox"
                        checked={bulkSelectedUsers.has(u.id)}
                        onChange={() => toggleBulkUser(u.id)}
                        className="accent-cyan-600"
                      />
                      <span>{u.name}</span>
                      <span className="text-xs text-gray-400 ml-auto">{u.department}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Permission selection */}
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">付与する権限</p>

                {/* Quick buttons */}
                <div className="flex flex-wrap gap-2 mb-3">
                  <button
                    onClick={() => quickGrantPerms(['create_edit'])}
                    className="text-xs px-2.5 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors font-medium"
                  >
                    作成変更権限を付与
                  </button>
                  <button
                    onClick={() => quickGrantPerms(['approve'])}
                    className="text-xs px-2.5 py-1 bg-amber-100 text-amber-700 rounded hover:bg-amber-200 transition-colors font-medium"
                  >
                    承認権限を付与
                  </button>
                  <button
                    onClick={() => quickGrantPerms(['execute', 'create_edit', 'approve', 'stop', 'admin'])}
                    className="text-xs px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200 transition-colors font-medium"
                  >
                    全権限を付与
                  </button>
                </div>

                {/* Individual permission checkboxes */}
                <div className="space-y-1 border border-gray-200 rounded p-2 bg-white">
                  {allPermissionKeys.map(pk => (
                    <label key={pk} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 px-1 py-0.5 rounded">
                      <input
                        type="checkbox"
                        checked={bulkSelectedPerms.has(pk)}
                        onChange={() => toggleBulkPerm(pk)}
                        className="accent-cyan-600"
                      />
                      <span>{PERMISSION_LABELS[pk]}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={applyBulkGrant}
                className="px-4 py-1.5 bg-cyan-600 text-white text-sm rounded hover:bg-cyan-700 transition-colors font-medium"
              >
                適用
              </button>
              <button
                onClick={() => setBulkOpen(false)}
                className="px-4 py-1.5 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300 transition-colors"
              >
                キャンセル
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">設定</h1>

      {/* Section 1: Notification Settings */}
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">通知設定</h2>
        <p className="text-sm text-gray-500 mb-4">受信する通知の種類を選択してください。</p>

        <div className="space-y-3">
          {(Object.keys(NOTIFICATION_TYPE_LABELS) as NotificationType[]).map(type => (
            <div
              key={type}
              className="flex items-center justify-between py-2 px-3 rounded hover:bg-gray-50"
            >
              <span className="text-sm text-gray-700">{NOTIFICATION_TYPE_LABELS[type]}</span>
              <button
                onClick={() => toggleNotif(type)}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  notifSettings[type] ? 'bg-cyan-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    notifSettings[type] ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>

        <div className="mt-6">
          <button
            onClick={() => alert('通知設定を保存しました')}
            className="px-6 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors text-sm font-medium"
          >
            保存
          </button>
        </div>
      </section>

      {/* Section 2: Category Permission Management */}
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">カテゴリ権限管理</h2>
        <p className="text-sm text-gray-500 mb-6">
          業務カテゴリごとにユーザーの権限を管理します。
        </p>

        <div className="flex gap-6 min-h-[400px]">
          {/* Left: Category tree */}
          <div className="w-64 flex-shrink-0 border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-600 border-b border-gray-200">
              カテゴリ一覧
            </div>
            <div className="p-2 space-y-0.5 overflow-y-auto max-h-[500px]">
              {rootCategories.map(root => renderCategoryNode(root))}
            </div>
          </div>

          {/* Right: Permission matrix */}
          <div className="flex-1 min-w-0">
            {renderPermissionMatrix()}
          </div>
        </div>
      </section>
    </div>
  );
}
