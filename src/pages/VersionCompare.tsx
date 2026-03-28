import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  workflows,
  workflowVersions,
  users,
  NODE_TYPE_LABELS,
  NODE_TYPE_COLORS,
} from '../data/mockData';
import type { WorkflowVersion } from '../data/mockData';

const VERSION_STATUS_LABELS: Record<string, string> = {
  draft: '下書き',
  pending: '承認待ち',
  approved: '承認済',
  rejected: '却下',
};

const VERSION_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

export default function VersionCompare() {
  const { id } = useParams<{ id: string }>();
  const workflow = workflows.find((w) => w.id === id);
  const versions = workflowVersions
    .filter((v) => v.workflowId === id)
    .sort((a, b) => b.versionNo - a.versionNo);

  const [selectedLeft, setSelectedLeft] = useState<string | null>(
    versions.length >= 2 ? versions[1].id : null
  );
  const [selectedRight, setSelectedRight] = useState<string | null>(
    versions.length >= 1 ? versions[0].id : null
  );

  const getUserName = (userId: string) =>
    users.find((u) => u.id === userId)?.name ?? userId;

  if (!workflow) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">ワークフローが見つかりません (ID: {id})</p>
      </div>
    );
  }

  const leftVersion = versions.find((v) => v.id === selectedLeft);
  const rightVersion = versions.find((v) => v.id === selectedRight);

  const renderVersionNodes = (version: WorkflowVersion) => (
    <div className="space-y-2">
      {version.nodes.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">ノードがありません</p>
      ) : (
        version.nodes.map((node) => (
          <div
            key={node.id}
            className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2"
          >
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: NODE_TYPE_COLORS[node.type] }}
            />
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-700">{node.name}</p>
              <p className="text-xs text-gray-400">{NODE_TYPE_LABELS[node.type]}</p>
            </div>
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        to="/"
        className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
      >
        &larr; ワークフロー一覧へ戻る
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{workflow.name} - バージョン管理</h1>
        <p className="text-sm text-gray-500 mt-1">現在の本番バージョン: v{workflow.currentVersion}</p>
      </div>

      {/* Version List */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">バージョン一覧</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">選択(左)</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">選択(右)</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">バージョン</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">承認状態</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">作成者</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">作成日</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {versions.map((v) => {
                const isProduction = v.versionNo === workflow.currentVersion && v.status === 'approved';
                return (
                  <tr key={v.id} className={`hover:bg-gray-50 transition-colors ${isProduction ? 'bg-green-50' : ''}`}>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="radio"
                        name="leftVersion"
                        checked={selectedLeft === v.id}
                        onChange={() => setSelectedLeft(v.id)}
                        className="w-4 h-4 text-blue-600"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="radio"
                        name="rightVersion"
                        checked={selectedRight === v.id}
                        onChange={() => setSelectedRight(v.id)}
                        className="w-4 h-4 text-blue-600"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700">v{v.versionNo}</span>
                        {isProduction && (
                          <span className="inline-block rounded-full bg-green-500 px-2 py-0.5 text-xs font-bold text-white">
                            本番
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${VERSION_STATUS_COLORS[v.status]}`}>
                        {VERSION_STATUS_LABELS[v.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{getUserName(v.createdBy)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{v.createdAt}</td>
                    <td className="px-4 py-3">
                      {!isProduction && v.status === 'approved' && (
                        <button className="rounded border border-blue-300 bg-white px-2.5 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50">
                          このバージョンに戻す
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Side-by-side Comparison */}
      {leftVersion && rightVersion && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">バージョン比較</h2>
          <div className="grid grid-cols-2 gap-6">
            {/* Left */}
            <div>
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700">v{leftVersion.versionNo}</h3>
                <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${VERSION_STATUS_COLORS[leftVersion.status]}`}>
                  {VERSION_STATUS_LABELS[leftVersion.status]}
                </span>
                <span className="text-xs text-gray-400">{leftVersion.createdAt}</span>
              </div>
              {renderVersionNodes(leftVersion)}
              <div className="mt-3 text-xs text-gray-400">
                ノード数: {leftVersion.nodes.length} / エッジ数: {leftVersion.edges.length}
              </div>
            </div>

            {/* Right */}
            <div>
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700">v{rightVersion.versionNo}</h3>
                <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${VERSION_STATUS_COLORS[rightVersion.status]}`}>
                  {VERSION_STATUS_LABELS[rightVersion.status]}
                </span>
                <span className="text-xs text-gray-400">{rightVersion.createdAt}</span>
              </div>
              {renderVersionNodes(rightVersion)}
              <div className="mt-3 text-xs text-gray-400">
                ノード数: {rightVersion.nodes.length} / エッジ数: {rightVersion.edges.length}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
