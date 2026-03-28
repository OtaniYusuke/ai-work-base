import { useState, useMemo } from 'react';
import {
  logs,
  LOG_TYPE_LABELS,
  LogType,
} from '../data/mockData';

const typeTabs: { label: string; value: LogType | 'all' }[] = [
  { label: '全て', value: 'all' },
  { label: '実行ログ', value: 'execution' },
  { label: '承認ログ', value: 'approval' },
  { label: '変更ログ', value: 'change' },
  { label: '通知ログ', value: 'notification' },
  { label: '例外ログ', value: 'exception' },
];

export default function LogViewer() {
  const [activeType, setActiveType] = useState<LogType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = useMemo(() => {
    let result = [...logs];

    // Filter by type
    if (activeType !== 'all') {
      result = result.filter((log) => log.type === activeType);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (log) =>
          log.targetName.toLowerCase().includes(q) ||
          log.actor.toLowerCase().includes(q) ||
          log.eventType.toLowerCase().includes(q) ||
          log.content.toLowerCase().includes(q) ||
          (log.instanceId && log.instanceId.toLowerCase().includes(q))
      );
    }

    // Sort by timestamp descending
    result.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    return result;
  }, [activeType, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">ログビューア</h1>
      </div>

      {/* Type Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {typeTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveType(tab.value)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeType === tab.value
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="検索... (フロー名、実行者、内容など)"
          className="w-full max-w-md rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">タイムスタンプ</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">種別</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">対象フロー</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">インスタンスID</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">実行者</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">イベント種別</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">内容</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((log) => {
              const typeColor: Record<LogType, string> = {
                execution: 'bg-blue-100 text-blue-700',
                approval: 'bg-yellow-100 text-yellow-700',
                change: 'bg-purple-100 text-purple-700',
                notification: 'bg-pink-100 text-pink-700',
                exception: 'bg-red-100 text-red-700',
              };

              return (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{log.timestamp}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${typeColor[log.type]}`}>
                      {LOG_TYPE_LABELS[log.type]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{log.targetName}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{log.instanceId ?? '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{log.actor}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{log.eventType}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{log.content}</td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">
                  該当するログがありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
