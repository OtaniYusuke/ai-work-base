import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  approvalRequests,
  APPROVAL_TYPE_LABELS,
  APPROVAL_STATUS_LABELS,
  getUserName,
  workflows,
  instances,
  ApprovalStatus,
  ApprovalRequest,
} from '../data/mockData';
import { useAuth } from '../context/AuthContext';

const APPROVAL_STATUS_COLORS: Record<ApprovalStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  returned: 'bg-orange-100 text-orange-700',
};

const statusTabs: { label: string; value: ApprovalStatus | 'all' }[] = [
  { label: '承認待ち', value: 'pending' },
  { label: '承認済', value: 'approved' },
  { label: '却下', value: 'rejected' },
  { label: '差し戻し', value: 'returned' },
  { label: '全て', value: 'all' },
];

export default function ApprovalList() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<ApprovalStatus | 'all'>('pending');
  const [selectedItem, setSelectedItem] = useState<ApprovalRequest | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [comments, setComments] = useState<Record<string, string>>({});

  const filtered =
    activeTab === 'all'
      ? approvalRequests
      : approvalRequests.filter((ar) => ar.status === activeTab);

  const openPanel = (item: ApprovalRequest) => {
    setSelectedItem(item);
    setPanelOpen(true);
  };

  const closePanel = () => {
    setPanelOpen(false);
    setSelectedItem(null);
  };

  const handleAction = (id: string, action: string) => {
    alert(`${action}しました (ID: ${id}, コメント: ${comments[id] || 'なし'})`);
    closePanel();
  };

  const getRelatedLink = (item: ApprovalRequest): { to: string; label: string } | null => {
    if (item.targetType === 'workflow') {
      const wf = workflows.find((w) => w.id === item.targetId);
      if (wf) return { to: `/workflows/${wf.id}`, label: `ワークフロー: ${wf.name}` };
    }
    if (item.targetType === 'instance') {
      const inst = instances.find((i) => i.id === item.targetId);
      if (inst) return { to: `/instances/${inst.id}`, label: `インスタンス: ${item.targetName}` };
    }
    if (item.targetType === 'agent') {
      return { to: `/agents/${item.targetId}`, label: `AIエージェント: ${item.targetName}` };
    }
    return null;
  };

  const isCurrentUserApprover = (item: ApprovalRequest) =>
    currentUser && item.approverId === currentUser.id;

  return (
    <div className="space-y-6">
      {/* Header */}
      <h1 className="text-2xl font-bold text-gray-900">承認一覧</h1>

      {/* Status Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {statusTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.value
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.label}
            {tab.value === 'pending' && (
              <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-yellow-500 px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">
                {approvalRequests.filter((ar) => ar.status === 'pending').length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                対象名
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                承認種別
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                申請者
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                状態
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                申請日
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((ar) => (
              <tr
                key={ar.id}
                onClick={() => openPanel(ar)}
                className="hover:bg-blue-50 transition-colors cursor-pointer"
              >
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  {ar.targetName}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {APPROVAL_TYPE_LABELS[ar.approvalType]}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {getUserName(ar.requesterId)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${APPROVAL_STATUS_COLORS[ar.status]}`}
                  >
                    {APPROVAL_STATUS_LABELS[ar.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{ar.createdAt}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">
                  該当する承認要求がありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Panel / Modal Overlay */}
      {panelOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-start justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30"
            onClick={closePanel}
          />

          {/* Slide-in Panel */}
          <div className="relative z-10 h-full w-full max-w-lg overflow-y-auto bg-white shadow-xl">
            {/* Panel Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
              <h2 className="text-lg font-bold text-gray-900">承認詳細</h2>
              <button
                onClick={closePanel}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Panel Body */}
            <div className="space-y-6 px-6 py-6">
              {/* Status Badge */}
              <div>
                <span
                  className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${APPROVAL_STATUS_COLORS[selectedItem.status]}`}
                >
                  {APPROVAL_STATUS_LABELS[selectedItem.status]}
                </span>
              </div>

              {/* Basic Info */}
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">対象名</p>
                  <p className="mt-1 text-sm font-medium text-gray-900">{selectedItem.targetName}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">承認種別</p>
                  <p className="mt-1 text-sm text-gray-700">{APPROVAL_TYPE_LABELS[selectedItem.approvalType]}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">申請者</p>
                    <p className="mt-1 text-sm text-gray-700">{getUserName(selectedItem.requesterId)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">承認者</p>
                    <p className="mt-1 text-sm text-gray-700">{getUserName(selectedItem.approverId)}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">申請理由</p>
                  <p className="mt-1 text-sm text-gray-700">{selectedItem.reason}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">申請日</p>
                  <p className="mt-1 text-sm text-gray-500">{selectedItem.createdAt}</p>
                </div>
              </div>

              {/* Related Link */}
              {(() => {
                const link = getRelatedLink(selectedItem);
                return link ? (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">関連リンク</p>
                    <Link
                      to={link.to}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                      onClick={closePanel}
                    >
                      {link.label}
                    </Link>
                  </div>
                ) : null;
              })()}

              {/* Approval History / Comment */}
              {selectedItem.comment && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">承認履歴</p>
                  <div className="flex items-start gap-3 mt-2">
                    <div className="mt-0.5 h-2 w-2 flex-shrink-0 rounded-full bg-green-500" />
                    <div>
                      <p className="text-sm text-gray-700">{selectedItem.comment}</p>
                      <p className="mt-0.5 text-xs text-gray-400">
                        {getUserName(selectedItem.approverId)} - {selectedItem.createdAt}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions - only for pending items when current user is approver */}
              {selectedItem.status === 'pending' && isCurrentUserApprover(selectedItem) && (
                <div className="space-y-3 rounded-lg border-2 border-blue-200 bg-blue-50 p-4">
                  <p className="text-sm font-semibold text-blue-800">承認アクション</p>
                  <textarea
                    rows={3}
                    placeholder="コメントを入力..."
                    value={comments[selectedItem.id] || ''}
                    onChange={(e) =>
                      setComments((prev) => ({ ...prev, [selectedItem.id]: e.target.value }))
                    }
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAction(selectedItem.id, '承認')}
                      className="flex-1 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
                    >
                      承認
                    </button>
                    <button
                      onClick={() => handleAction(selectedItem.id, '却下')}
                      className="flex-1 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
                    >
                      却下
                    </button>
                    <button
                      onClick={() => handleAction(selectedItem.id, '差し戻し')}
                      className="flex-1 rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors"
                    >
                      差し戻し
                    </button>
                  </div>
                </div>
              )}

              {/* Info when pending but user is not approver */}
              {selectedItem.status === 'pending' && !isCurrentUserApprover(selectedItem) && (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3">
                  <p className="text-sm text-yellow-800">
                    この承認は <span className="font-medium">{getUserName(selectedItem.approverId)}</span> が担当しています。
                  </p>
                </div>
              )}
            </div>

            {/* Panel Footer */}
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
