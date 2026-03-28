import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  exceptions,
  users,
  EXCEPTION_STATUS_LABELS,
} from '../data/mockData';

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

const mockExceptionLogs = [
  { time: '2026-03-22 16:30:00', event: '例外発生', actor: 'システム', detail: '例外が検出されました' },
  { time: '2026-03-22 16:35:00', event: '通知送信', actor: 'システム', detail: '担当者に通知を送信しました' },
  { time: '2026-03-22 17:00:00', event: 'アサイン', actor: '高橋 美咲', detail: '伊藤健太さんにアサインしました' },
];

export default function ExceptionDetail() {
  const { id } = useParams<{ id: string }>();
  const exception = exceptions.find((ex) => ex.id === id);
  const [resultText, setResultText] = useState('');
  const [memoText, setMemoText] = useState(exception?.memo ?? '');

  if (!exception) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">例外が見つかりません (ID: {id})</p>
      </div>
    );
  }

  const getUserName = (userId?: string) =>
    userId ? (users.find((u) => u.id === userId)?.name ?? userId) : '未アサイン';

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        to="/"
        className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
      >
        &larr; 例外一覧へ戻る
      </Link>

      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-900">例外詳細: {exception.id}</h1>
        <span
          className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${PRIORITY_COLORS[exception.priority]}`}
        >
          優先度: {PRIORITY_LABELS[exception.priority]}
        </span>
        <span className="inline-block rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
          {EXCEPTION_STATUS_LABELS[exception.status]}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Exception Info */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">例外情報</h2>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">例外種別</dt>
              <dd className="text-sm font-medium text-gray-700">{exception.type}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">関連フロー</dt>
              <dd className="text-sm font-medium text-gray-700">{exception.workflowName}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">発生ノード</dt>
              <dd className="text-sm font-medium text-gray-700">{exception.node}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">インスタンスID</dt>
              <dd className="text-sm font-medium text-gray-700">
                <Link to={`/instances/${exception.instanceId}`} className="text-blue-600 hover:underline">
                  {exception.instanceId}
                </Link>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">発生日時</dt>
              <dd className="text-sm font-medium text-gray-700">{exception.createdAt}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500 mb-1">説明</dt>
              <dd className="text-sm text-gray-700 bg-gray-50 rounded p-3">{exception.description}</dd>
            </div>
          </dl>
        </div>

        {/* Assignee & Actions */}
        <div className="space-y-6">
          {/* Assignee */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">担当者</h2>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">{getUserName(exception.assigneeId)}</span>
              {!exception.assigneeId && (
                <button className="rounded-lg border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors">
                  アサイン
                </button>
              )}
            </div>
          </div>

          {/* Action Panel */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">対応入力</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">処理結果入力</label>
                <textarea
                  value={resultText}
                  onChange={(e) => setResultText(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  rows={3}
                  placeholder="処理結果を入力してください..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">対応メモ</label>
                <textarea
                  value={memoText}
                  onChange={(e) => setMemoText(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  rows={3}
                  placeholder="対応メモを入力してください..."
                />
              </div>
              <div className="flex gap-3">
                <button className="flex-1 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 transition-colors">
                  再開
                </button>
                <button className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 transition-colors">
                  中止
                </button>
                <button className="flex-1 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-600 transition-colors">
                  別ルート移送
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Exception Log */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">例外対応ログ</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">日時</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">イベント</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">実行者</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">詳細</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {mockExceptionLogs.map((log, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-500">{log.time}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{log.event}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{log.actor}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{log.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
