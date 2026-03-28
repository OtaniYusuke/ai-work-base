import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  instances,
  workflows,
  users,
  INSTANCE_STATUS_LABELS,
  INSTANCE_STATUS_COLORS,
  InstanceStatus,
} from '../data/mockData';

const statusTabs: { label: string; value: InstanceStatus | 'all' }[] = [
  { label: '全て', value: 'all' },
  { label: '実行中', value: 'running' },
  { label: '承認待ち', value: 'waiting_approval' },
  { label: '人間作業待ち', value: 'waiting_human' },
  { label: '例外発生', value: 'exception' },
  { label: '完了', value: 'completed' },
  { label: '停止', value: 'stopped' },
];

export default function InstanceList() {
  const [activeTab, setActiveTab] = useState<InstanceStatus | 'all'>('all');

  const filtered =
    activeTab === 'all'
      ? instances
      : instances.filter((inst) => inst.status === activeTab);

  const getWorkflowName = (workflowId: string) =>
    workflows.find((w) => w.id === workflowId)?.name ?? workflowId;

  const getUserName = (userId: string) =>
    users.find((u) => u.id === userId)?.name ?? userId;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">実行インスタンス一覧</h1>
      </div>

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
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">ID</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">フロー名</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">状態</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">開始者</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">現在ノード</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">進捗率</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">開始日時</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((inst) => (
              <tr key={inst.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <Link
                    to={`/instances/${inst.id}`}
                    className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {inst.id}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {getWorkflowName(inst.workflowId)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${INSTANCE_STATUS_COLORS[inst.status]}`}
                  >
                    {INSTANCE_STATUS_LABELS[inst.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {getUserName(inst.startedBy)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">{inst.currentNode}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${inst.progress}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500">{inst.progress}%</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{inst.startedAt}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {(inst.status === 'running' ||
                      inst.status === 'waiting_approval' ||
                      inst.status === 'waiting_human') && (
                      <button className="rounded border border-red-300 bg-white px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50">
                        停止依頼
                      </button>
                    )}
                    {(inst.status === 'stopped' || inst.status === 'exception') && (
                      <button className="rounded border border-green-300 bg-white px-2.5 py-1 text-xs font-medium text-green-600 hover:bg-green-50">
                        再開依頼
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">
                  該当するインスタンスがありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
