import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useCategories } from '../context/CategoryContext';
import {
  workflows,
  workflowVersions,
  instances,
  logs,
  getUserName,
  getAgentName,
  TRIGGER_LABELS,
  WF_STATUS_LABELS,
  WF_STATUS_COLORS,
  NODE_TYPE_COLORS,
  NODE_TYPE_LABELS,
  INSTANCE_STATUS_LABELS,
  INSTANCE_STATUS_COLORS,
  LOG_TYPE_LABELS,
  WorkflowNode,
  WorkflowEdge,
  TriggerType,
  NodeType,
} from '../data/mockData';

type TabId = 'flow' | 'history' | 'versions' | 'settings';

const tabs: { id: TabId; label: string }[] = [
  { id: 'flow', label: 'フロー図' },
  { id: 'history', label: '実行履歴' },
  { id: 'versions', label: 'バージョン' },
  { id: 'settings', label: '設定' },
];

const VERSION_STATUS_LABELS: Record<string, string> = {
  draft: '下書き',
  pending: '申請中',
  approved: '承認済',
  rejected: '却下',
};

const VERSION_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

const TRIGGER_EXPLANATIONS: Record<TriggerType, (config?: string) => string> = {
  manual: () => '担当者がボタンを押して実行を開始します',
  scheduled: (config) => `設定されたスケジュールに基づいて自動実行されます: ${config ?? '未設定'}`,
  event: (config) => `指定イベント発生時に自動実行されます: ${config ?? '未設定'}`,
  api: () => '外部APIからの呼び出しで実行されます',
};

const TRIGGER_BADGE_COLORS: Record<TriggerType, string> = {
  manual: 'bg-slate-100 text-slate-700',
  scheduled: 'bg-indigo-100 text-indigo-700',
  event: 'bg-teal-100 text-teal-700',
  api: 'bg-orange-100 text-orange-700',
};

function getCategoryPath(categoryId: string, categories: { id: string; name: string; parentId: string | null }[]): string {
  const cat = categories.find((c) => c.id === categoryId);
  if (!cat) return '';
  if (cat.parentId) {
    const parent = categories.find((c) => c.id === cat.parentId);
    return parent ? `${parent.name} > ${cat.name}` : cat.name;
  }
  return cat.name;
}

function getAssigneeLabel(node: WorkflowNode): string {
  if (!node.assignee || !node.assigneeType) return '-';
  if (node.assigneeType === 'agent') return `AI: ${getAgentName(node.assignee)}`;
  return getUserName(node.assignee);
}

/* ---------- Flow Diagram ---------- */
function FlowDiagram({ nodes, edges }: { nodes: WorkflowNode[]; edges: WorkflowEdge[] }) {
  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 p-16 text-sm text-gray-400">
        ノードが定義されていません
      </div>
    );
  }

  const NODE_W = 160;
  const NODE_H = 70;
  const HEADER_H = 32;
  const SCALE_X = 1 / 1.2;
  const SCALE_Y = 1 / 1.2;

  const maxX = Math.max(...nodes.map((n) => n.x * SCALE_X)) + NODE_W + 60;
  const maxY = Math.max(...nodes.map((n) => n.y * SCALE_Y)) + NODE_H + 60;

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  const legendTypes = [...new Set(nodes.map((n) => n.type))];

  return (
    <div className="space-y-3">
      <svg
        viewBox={`0 0 ${maxX} ${maxY}`}
        className="w-full rounded-lg border border-gray-200 bg-white"
        style={{ minHeight: 340 }}
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="8"
            markerHeight="6"
            refX="8"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill="#94a3b8" />
          </marker>
        </defs>

        {/* Edges */}
        {edges.map((edge) => {
          const from = nodeMap.get(edge.from);
          const to = nodeMap.get(edge.to);
          if (!from || !to) return null;
          const x1 = from.x * SCALE_X + NODE_W;
          const y1 = from.y * SCALE_Y + NODE_H / 2;
          const x2 = to.x * SCALE_X;
          const y2 = to.y * SCALE_Y + NODE_H / 2;
          const midX = (x1 + x2) / 2;
          return (
            <g key={edge.id}>
              <path
                d={`M${x1},${y1} C${midX},${y1} ${midX},${y2} ${x2},${y2}`}
                fill="none"
                stroke="#94a3b8"
                strokeWidth={2}
                markerEnd="url(#arrowhead)"
              />
              {edge.label && (
                <text
                  x={(x1 + x2) / 2}
                  y={(y1 + y2) / 2 - 8}
                  textAnchor="middle"
                  className="text-[10px]"
                  fill="#64748b"
                  fontWeight={500}
                >
                  {edge.label}
                </text>
              )}
            </g>
          );
        })}

        {/* Nodes */}
        {nodes.map((node) => {
          const x = node.x * SCALE_X;
          const y = node.y * SCALE_Y;
          const color = NODE_TYPE_COLORS[node.type];
          const assigneeLabel = getAssigneeLabel(node);
          const isAgent = node.assigneeType === 'agent';
          return (
            <g key={node.id}>
              {/* Outer rounded rect */}
              <rect
                x={x}
                y={y}
                width={NODE_W}
                height={NODE_H}
                rx={10}
                ry={10}
                fill="#ffffff"
                stroke={color}
                strokeWidth={2}
              />
              {/* Header background */}
              <rect
                x={x}
                y={y}
                width={NODE_W}
                height={HEADER_H}
                rx={10}
                ry={10}
                fill={color}
              />
              {/* Fill the bottom corners of header so it looks flat at bottom */}
              <rect
                x={x}
                y={y + HEADER_H - 10}
                width={NODE_W}
                height={10}
                fill={color}
              />
              {/* Node name */}
              <text
                x={x + NODE_W / 2}
                y={y + HEADER_H / 2 + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#ffffff"
                fontSize={11}
                fontWeight={600}
              >
                {node.name}
              </text>
              {/* Assignee section */}
              <text
                x={x + NODE_W / 2}
                y={y + HEADER_H + (NODE_H - HEADER_H) / 2 + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={isAgent ? '#7c3aed' : '#374151'}
                fontSize={10}
                fontWeight={isAgent ? 600 : 400}
              >
                {assigneeLabel}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-4 py-2">
        <span className="text-xs font-semibold text-gray-500">凡例:</span>
        {legendTypes.map((type) => (
          <div key={type} className="flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-3 rounded-sm"
              style={{ backgroundColor: NODE_TYPE_COLORS[type] }}
            />
            <span className="text-xs text-gray-600">{NODE_TYPE_LABELS[type]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Main Component ---------- */
export default function WorkflowDetail() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<TabId>('flow');
  const { categories, addCategory } = useCategories();
  const [newCatMode, setNewCatMode] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatParent, setNewCatParent] = useState('');

  const workflow = workflows.find((w) => w.id === id);
  if (!workflow) {
    return (
      <div className="py-16 text-center text-gray-500">
        ワークフローが見つかりません (ID: {id})
      </div>
    );
  }

  const versions = workflowVersions.filter((v) => v.workflowId === id);
  const latestVersion = versions.sort((a, b) => b.versionNo - a.versionNo)[0];
  const nodes = latestVersion?.nodes ?? [];
  const edges = latestVersion?.edges ?? [];

  const wfInstances = instances.filter((inst) => inst.workflowId === id);
  const wfLogs = logs.filter((l) => l.workflowId === id).sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  const categoryPath = getCategoryPath(workflow.categoryId, categories);
  const productionVersion = versions.find((v) => v.status === 'approved');

  const handleExecute = () => {
    if (workflow.triggerType === 'manual') {
      alert(`ワークフロー「${workflow.name}」の実行を開始しました（モック）`);
    }
  };

  const handleApplyProduction = () => {
    alert(`ワークフロー「${workflow.name}」の本番申請を送信しました（モック）`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{workflow.name}</h1>
            <span
              className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${WF_STATUS_COLORS[workflow.status]}`}
            >
              {WF_STATUS_LABELS[workflow.status]}
            </span>
            <span
              className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${TRIGGER_BADGE_COLORS[workflow.triggerType]}`}
            >
              {TRIGGER_LABELS[workflow.triggerType]}
            </span>
          </div>
          {categoryPath && (
            <p className="text-sm text-gray-500">{categoryPath}</p>
          )}
          <p className="text-sm text-gray-500">{workflow.description}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link
            to={`/workflows/${id}/edit`}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            編集
          </Link>
          {workflow.status === 'production' && workflow.triggerType === 'manual' && (
            <button
              onClick={handleExecute}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              実行する
            </button>
          )}
          {(workflow.status === 'draft' || workflow.status === 'testing') && (
            <button
              onClick={handleApplyProduction}
              className="rounded-lg bg-yellow-500 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-600"
            >
              本番申請
            </button>
          )}
        </div>
      </div>

      {/* Info bar */}
      <div className="flex flex-wrap items-center gap-6 rounded-lg border border-gray-200 bg-white px-5 py-3 text-sm shadow-sm">
        <div>
          <span className="text-xs font-medium text-gray-500">オーナー</span>
          <p className="text-gray-900">{getUserName(workflow.ownerId)}</p>
        </div>
        <div>
          <span className="text-xs font-medium text-gray-500">バージョン</span>
          <p className="text-gray-900">v{workflow.currentVersion}</p>
        </div>
        <div>
          <span className="text-xs font-medium text-gray-500">更新日</span>
          <p className="text-gray-900">{workflow.updatedAt}</p>
        </div>
        {(workflow.triggerType === 'scheduled' || workflow.triggerType === 'event') && workflow.triggerConfig && (
          <div>
            <span className="text-xs font-medium text-gray-500">トリガー設定</span>
            <p className="text-gray-900">{workflow.triggerConfig}</p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {/* Flow Diagram */}
        {activeTab === 'flow' && <FlowDiagram nodes={nodes} edges={edges} />}

        {/* Execution History */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            {/* Instance list */}
            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
              <h3 className="border-b border-gray-100 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700">
                実行インスタンス
              </h3>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">ID</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">状態</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">開始者</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">開始日時</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">現在ノード</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">進捗</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {wfInstances.map((inst) => (
                    <tr key={inst.id} className="cursor-pointer hover:bg-blue-50 transition-colors">
                      <td className="px-4 py-3">
                        <Link to={`/instances/${inst.id}`} className="text-sm font-medium text-blue-600 hover:underline">
                          {inst.id}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${INSTANCE_STATUS_COLORS[inst.status]}`}
                        >
                          {INSTANCE_STATUS_LABELS[inst.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{getUserName(inst.startedBy)}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{inst.startedAt}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{inst.currentNode}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-200">
                            <div
                              className="h-full rounded-full bg-blue-500 transition-all"
                              style={{ width: `${inst.progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500">{inst.progress}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {wfInstances.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">
                        実行履歴がありません
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Per-workflow logs */}
            <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
              <h3 className="border-b border-gray-100 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700">
                ワークフローログ
              </h3>
              <div className="divide-y divide-gray-100">
                {wfLogs.map((log) => {
                  const typeColor: Record<string, string> = {
                    execution: 'border-blue-400',
                    approval: 'border-yellow-400',
                    change: 'border-purple-400',
                    notification: 'border-pink-400',
                    exception: 'border-red-400',
                  };
                  const dotColor: Record<string, string> = {
                    execution: 'bg-blue-400',
                    approval: 'bg-yellow-400',
                    change: 'bg-purple-400',
                    notification: 'bg-pink-400',
                    exception: 'bg-red-400',
                  };
                  return (
                    <div key={log.id} className="flex items-start gap-3 px-4 py-3">
                      <div className="mt-1.5 flex flex-col items-center">
                        <span className={`inline-block h-2.5 w-2.5 rounded-full ${dotColor[log.type] ?? 'bg-gray-400'}`} />
                        <span className={`mt-1 h-full w-0.5 ${typeColor[log.type] ?? 'border-gray-300'}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-500">
                            {LOG_TYPE_LABELS[log.type]}
                          </span>
                          <span className="text-xs text-gray-400">{log.timestamp}</span>
                        </div>
                        <p className="text-sm text-gray-800">{log.content}</p>
                        <p className="text-xs text-gray-500">
                          {log.actor} / {log.eventType}
                          {log.instanceId && (
                            <span className="ml-1 text-gray-400">({log.instanceId})</span>
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {wfLogs.length === 0 && (
                  <div className="px-4 py-8 text-center text-sm text-gray-400">
                    ログがありません
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Versions */}
        {activeTab === 'versions' && (
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                    バージョン
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                    状態
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                    作成者
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                    作成日
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {versions.map((v) => {
                  const isProduction = v.status === 'approved' && v.versionNo === workflow.currentVersion;
                  return (
                    <tr key={v.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        <span className="flex items-center gap-2">
                          v{v.versionNo}
                          {isProduction && (
                            <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                              本番
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${VERSION_STATUS_COLORS[v.status] ?? 'bg-gray-100 text-gray-700'}`}
                        >
                          {VERSION_STATUS_LABELS[v.status] ?? v.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {getUserName(v.createdBy)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{v.createdAt}</td>
                      <td className="px-4 py-3">
                        <Link
                          to={`/workflows/${id}/compare?v=${v.versionNo}`}
                          className="text-xs font-medium text-blue-600 hover:underline"
                        >
                          比較
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {versions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">
                      バージョンがありません
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Settings */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">ワークフロー設定</h3>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium text-gray-500">名称</dt>
                  <dd className="mt-1 text-sm text-gray-900">{workflow.name}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500">オーナー</dt>
                  <dd className="mt-1 text-sm text-gray-900">{getUserName(workflow.ownerId)}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium text-gray-500">説明</dt>
                  <dd className="mt-1 text-sm text-gray-900">{workflow.description}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500">カテゴリ</dt>
                  <dd className="mt-1 text-sm text-gray-900 flex items-center gap-2">
                    {categoryPath || '-'}
                    {!newCatMode ? (
                      <button
                        onClick={() => { setNewCatMode(true); setNewCatName(''); setNewCatParent(''); }}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        + 新規作成
                      </button>
                    ) : (
                      <span className="flex items-center gap-1">
                        <select
                          value={newCatParent}
                          onChange={(e) => setNewCatParent(e.target.value)}
                          className="rounded border border-gray-300 px-1 py-0.5 text-xs"
                        >
                          <option value="">親なし</option>
                          {categories.filter(c => c.parentId === null).map(c => (
                            <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                          ))}
                        </select>
                        <input
                          autoFocus
                          type="text"
                          value={newCatName}
                          onChange={(e) => setNewCatName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && newCatName.trim()) {
                              addCategory(newCatName.trim(), newCatParent || null, newCatParent ? '📂' : '📁');
                              setNewCatMode(false);
                            }
                            if (e.key === 'Escape') setNewCatMode(false);
                          }}
                          placeholder="カテゴリ名"
                          className="w-24 rounded border border-gray-300 px-1.5 py-0.5 text-xs"
                        />
                        <button
                          onClick={() => {
                            if (newCatName.trim()) {
                              addCategory(newCatName.trim(), newCatParent || null, newCatParent ? '📂' : '📁');
                              setNewCatMode(false);
                            }
                          }}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                          追加
                        </button>
                        <button onClick={() => setNewCatMode(false)} className="text-xs text-gray-400 hover:text-gray-600">x</button>
                      </span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500">現在のバージョン</dt>
                  <dd className="mt-1 text-sm text-gray-900">v{workflow.currentVersion}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500">トリガー種別</dt>
                  <dd className="mt-1 text-sm text-gray-900">{TRIGGER_LABELS[workflow.triggerType]}</dd>
                </div>
                {workflow.triggerConfig && (
                  <div>
                    <dt className="text-xs font-medium text-gray-500">トリガー設定</dt>
                    <dd className="mt-1 text-sm text-gray-900">{workflow.triggerConfig}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs font-medium text-gray-500">テンプレート</dt>
                  <dd className="mt-1 text-sm text-gray-900">{workflow.isTemplate ? 'はい' : 'いいえ'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500">作成日</dt>
                  <dd className="mt-1 text-sm text-gray-900">{workflow.createdAt}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500">更新日</dt>
                  <dd className="mt-1 text-sm text-gray-900">{workflow.updatedAt}</dd>
                </div>
              </dl>
            </div>

            {/* Execution pattern explanation */}
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="mb-3 text-lg font-semibold text-gray-900">実行パターン</h3>
              <div className="flex items-start gap-3 rounded-lg bg-gray-50 px-4 py-3">
                <span
                  className={`mt-0.5 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${TRIGGER_BADGE_COLORS[workflow.triggerType]}`}
                >
                  {TRIGGER_LABELS[workflow.triggerType]}
                </span>
                <p className="text-sm text-gray-700">
                  {TRIGGER_EXPLANATIONS[workflow.triggerType](workflow.triggerConfig)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
