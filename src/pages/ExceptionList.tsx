import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  exceptions,
  EXCEPTION_STATUS_LABELS,
  getUserName,
  users,
  instances,
  workflows,
  ExceptionStatus,
  Exception,
} from '../data/mockData';
import { useAuth } from '../context/AuthContext';

const EXCEPTION_STATUS_COLORS: Record<ExceptionStatus, string> = {
  open: 'bg-red-100 text-red-700',
  assigned: 'bg-yellow-100 text-yellow-700',
  in_progress: 'bg-blue-100 text-blue-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-600',
};

const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-green-100 text-green-700',
};

const PRIORITY_LABELS: Record<string, string> = {
  high: '高',
  medium: '中',
  low: '低',
};

const priorityPills: { label: string; value: string }[] = [
  { label: '全て', value: 'all' },
  { label: '高', value: 'high' },
  { label: '中', value: 'medium' },
  { label: '低', value: 'low' },
];

export default function ExceptionList() {
  const { currentUser } = useAuth();
  const [activePriority, setActivePriority] = useState<string>('all');
  const [selectedItem, setSelectedItem] = useState<Exception | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [memos, setMemos] = useState<Record<string, string>>({});
  const [assignSelections, setAssignSelections] = useState<Record<string, string>>({});

  // Default sort: open/assigned first, then by priority
  const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
  const statusOrder: Record<string, number> = { open: 0, assigned: 1, in_progress: 2, resolved: 3, closed: 4 };

  const filtered = exceptions
    .filter((ex) => activePriority === 'all' || ex.priority === activePriority)
    .sort((a, b) => {
      const statusDiff = (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99);
      if (statusDiff !== 0) return statusDiff;
      return (priorityOrder[a.priority] ?? 99) - (priorityOrder[b.priority] ?? 99);
    });

  const openPanel = (item: Exception) => {
    setSelectedItem(item);
    setPanelOpen(true);
  };

  const closePanel = () => {
    setPanelOpen(false);
    setSelectedItem(null);
  };

  const handleAction = (id: string, action: string) => {
    alert(`${action} (ID: ${id}, メモ: ${memos[id] || 'なし'})`);
  };

  const handleAssign = (id: string) => {
    const userId = assignSelections[id];
    if (!userId) {
      alert('担当者を選択してください');
      return;
    }
    alert(`${getUserName(userId)} にアサインしました (例外ID: ${id})`);
  };

  const canAct = (item: Exception) => {
    if (!currentUser) return false;
    if (item.assigneeId === currentUser.id) return true;
    if (currentUser.role === 'exception_handler') return true;
    return false;
  };

  const getRelatedInstance = (item: Exception) => {
    const inst = instances.find((i) => i.id === item.instanceId);
    if (!inst) return null;
    const wf = workflows.find((w) => w.id === inst.workflowId);
    return { inst, wf };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <h1 className="text-2xl font-bold text-gray-900">例外一覧</h1>

      {/* Priority Filter Pills */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-500">優先度:</span>
        {priorityPills.map((pill) => (
          <button
            key={pill.value}
            onClick={() => setActivePriority(pill.value)}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-full border transition-colors ${
              activePriority === pill.value
                ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {pill.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">フロー名</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">発生ノード</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">例外種別</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">優先度</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">状態</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">担当者</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">発生日</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((ex) => (
              <tr
                key={ex.id}
                onClick={() => openPanel(ex)}
                className="hover:bg-blue-50 transition-colors cursor-pointer"
              >
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{ex.workflowName}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{ex.node}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{ex.type}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${PRIORITY_COLORS[ex.priority]}`}>
                    {PRIORITY_LABELS[ex.priority]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${EXCEPTION_STATUS_COLORS[ex.status]}`}>
                    {EXCEPTION_STATUS_LABELS[ex.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {ex.assigneeId ? getUserName(ex.assigneeId) : <span className="text-gray-400">-</span>}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{ex.createdAt}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">
                  該当する例外がありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Panel */}
      {panelOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-start justify-end">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/30" onClick={closePanel} />

          {/* Panel */}
          <div className="relative z-10 h-full w-full max-w-lg overflow-y-auto bg-white shadow-xl">
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
              <h2 className="text-lg font-bold text-gray-900">例外詳細</h2>
              <button
                onClick={closePanel}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="space-y-6 px-6 py-6">
              {/* Status & Priority */}
              <div className="flex items-center gap-3">
                <span className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${EXCEPTION_STATUS_COLORS[selectedItem.status]}`}>
                  {EXCEPTION_STATUS_LABELS[selectedItem.status]}
                </span>
                <span className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${PRIORITY_COLORS[selectedItem.priority]}`}>
                  優先度: {PRIORITY_LABELS[selectedItem.priority]}
                </span>
              </div>

              {/* Info */}
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">フロー名</p>
                  <p className="mt-1 text-sm font-medium text-gray-900">{selectedItem.workflowName}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">発生ノード</p>
                    <p className="mt-1 text-sm text-gray-700">{selectedItem.node}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">例外種別</p>
                    <p className="mt-1 text-sm text-gray-700">{selectedItem.type}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">説明</p>
                  <p className="mt-1 text-sm text-gray-700">{selectedItem.description}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">担当者</p>
                    <p className="mt-1 text-sm text-gray-700">
                      {selectedItem.assigneeId ? getUserName(selectedItem.assigneeId) : '未アサイン'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">発生日</p>
                    <p className="mt-1 text-sm text-gray-500">{selectedItem.createdAt}</p>
                  </div>
                </div>
              </div>

              {/* Existing Memo */}
              {selectedItem.memo && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">対応メモ</p>
                  <p className="text-sm text-gray-700">{selectedItem.memo}</p>
                </div>
              )}

              {/* Related Instance Link */}
              {(() => {
                const related = getRelatedInstance(selectedItem);
                return related ? (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">関連インスタンス</p>
                    <Link
                      to={`/instances/${related.inst.id}`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                      onClick={closePanel}
                    >
                      {related.wf?.name ?? related.inst.workflowId} (#{related.inst.id})
                    </Link>
                  </div>
                ) : null;
              })()}

              {/* Assign Section - if unassigned */}
              {!selectedItem.assigneeId && (
                <div className="rounded-lg border-2 border-orange-200 bg-orange-50 p-4 space-y-3">
                  <p className="text-sm font-semibold text-orange-800">担当者アサイン</p>
                  <div className="flex gap-2">
                    <select
                      value={assignSelections[selectedItem.id] || ''}
                      onChange={(e) =>
                        setAssignSelections((prev) => ({ ...prev, [selectedItem.id]: e.target.value }))
                      }
                      className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">担当者を選択...</option>
                      {users
                        .filter((u) => u.status === 'active')
                        .map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.department})
                          </option>
                        ))}
                    </select>
                    <button
                      onClick={() => handleAssign(selectedItem.id)}
                      className="rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors"
                    >
                      アサインする
                    </button>
                  </div>
                </div>
              )}

              {/* Action Section - if user can act */}
              {canAct(selectedItem) && ['open', 'assigned', 'in_progress'].includes(selectedItem.status) && (
                <div className="space-y-3 rounded-lg border-2 border-blue-200 bg-blue-50 p-4">
                  <p className="text-sm font-semibold text-blue-800">対応アクション</p>
                  <textarea
                    rows={3}
                    placeholder="メモ/コメントを入力..."
                    value={memos[selectedItem.id] || ''}
                    onChange={(e) =>
                      setMemos((prev) => ({ ...prev, [selectedItem.id]: e.target.value }))
                    }
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <div className="flex flex-wrap gap-2">
                    {(selectedItem.status === 'open' || selectedItem.status === 'assigned') && (
                      <button
                        onClick={() => handleAction(selectedItem.id, '対応開始')}
                        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                      >
                        対応開始
                      </button>
                    )}
                    {selectedItem.status === 'in_progress' && (
                      <button
                        onClick={() => handleAction(selectedItem.id, '解決済み')}
                        className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
                      >
                        解決済み
                      </button>
                    )}
                    {(selectedItem.status === 'in_progress' || selectedItem.status === 'assigned') && (
                      <button
                        onClick={() => handleAction(selectedItem.id, '再開指示')}
                        className="rounded-md bg-yellow-500 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-600 transition-colors"
                      >
                        再開指示
                      </button>
                    )}
                    <button
                      onClick={() => handleAction(selectedItem.id, '中止')}
                      className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
                    >
                      中止
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 border-t border-gray-200 bg-gray-50 px-6 py-4">
              <button
                onClick={closePanel}
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
