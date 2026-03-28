import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  approvalRequests,
  users,
  APPROVAL_TYPE_LABELS,
  APPROVAL_STATUS_LABELS,
  ApprovalStatus,
} from '../data/mockData';

const APPROVAL_STATUS_COLORS: Record<ApprovalStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  returned: 'bg-orange-100 text-orange-700',
};

// Mock approval history
const mockHistory = [
  { action: '申請', actor: '申請者', comment: '', date: '' },
];

export default function ApprovalDetail() {
  const { id } = useParams<{ id: string }>();
  const ar = approvalRequests.find((a) => a.id === id);
  const [comment, setComment] = useState('');

  if (!ar) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-500">承認要求が見つかりません (ID: {id})</p>
      </div>
    );
  }

  const getUserName = (userId: string) =>
    users.find((u) => u.id === userId)?.name ?? userId;

  const requester = getUserName(ar.requesterId);
  const approver = getUserName(ar.approverId);

  const history = [
    { action: '申請', actor: requester, comment: ar.reason, date: ar.createdAt },
    ...(ar.status === 'approved'
      ? [{ action: '承認', actor: approver, comment: ar.comment || '', date: ar.createdAt }]
      : ar.status === 'rejected'
      ? [{ action: '却下', actor: approver, comment: ar.comment || '', date: ar.createdAt }]
      : ar.status === 'returned'
      ? [{ action: '差し戻し', actor: approver, comment: ar.comment || '', date: ar.createdAt }]
      : []),
  ];

  const handleAction = (action: string) => {
    alert(`${action}しました (ID: ${ar.id}, コメント: ${comment || 'なし'})`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/" className="text-sm text-gray-500 hover:text-gray-700">
          &larr; 一覧へ
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">承認詳細</h1>
        <span
          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${APPROVAL_STATUS_COLORS[ar.status]}`}
        >
          {APPROVAL_STATUS_LABELS[ar.status]}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Detail Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">申請情報</h2>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium text-gray-500">対象</dt>
                <dd className="mt-1 text-sm text-gray-900">{ar.targetName}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500">対象タイプ</dt>
                <dd className="mt-1 text-sm text-gray-900">{ar.targetType}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500">承認種別</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {APPROVAL_TYPE_LABELS[ar.approvalType]}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500">申請日</dt>
                <dd className="mt-1 text-sm text-gray-900">{ar.createdAt}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500">申請者</dt>
                <dd className="mt-1 text-sm text-gray-900">{requester}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500">承認者</dt>
                <dd className="mt-1 text-sm text-gray-900">{approver}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium text-gray-500">申請理由</dt>
                <dd className="mt-1 text-sm text-gray-900">{ar.reason}</dd>
              </div>
            </dl>
          </div>

          {/* Action Panel (only for pending) */}
          {ar.status === 'pending' && (
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">承認アクション</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">コメント</label>
                  <textarea
                    rows={3}
                    placeholder="コメントを入力..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleAction('承認')}
                    className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                  >
                    承認
                  </button>
                  <button
                    onClick={() => handleAction('却下')}
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                  >
                    却下
                  </button>
                  <button
                    onClick={() => handleAction('差し戻し')}
                    className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
                  >
                    差し戻し
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* History */}
        <div>
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">承認履歴</h2>
            <div className="space-y-4">
              {history.map((entry, idx) => (
                <div key={idx} className="relative pl-5 border-l-2 border-gray-200 pb-4 last:pb-0">
                  <div className="absolute -left-1.5 top-0.5 h-3 w-3 rounded-full bg-blue-500" />
                  <p className="text-sm font-medium text-gray-900">{entry.action}</p>
                  <p className="text-xs text-gray-500">
                    {entry.actor} - {entry.date}
                  </p>
                  {entry.comment && (
                    <p className="mt-1 text-sm text-gray-600">{entry.comment}</p>
                  )}
                </div>
              ))}
              {ar.status === 'pending' && (
                <div className="relative pl-5 border-l-2 border-dashed border-gray-200">
                  <div className="absolute -left-1.5 top-0.5 h-3 w-3 rounded-full border-2 border-gray-300 bg-white" />
                  <p className="text-sm text-gray-400">承認待ち...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
