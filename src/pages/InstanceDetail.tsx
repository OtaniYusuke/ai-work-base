import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  instances,
  workflows,
  workflowVersions,
  logs,
  users,
  getUserName,
  getAgentName,
  aiAgents,
  categories,
  INSTANCE_STATUS_LABELS,
  INSTANCE_STATUS_COLORS,
  NODE_TYPE_COLORS,
  NODE_TYPE_LABELS,
  TRIGGER_LABELS,
  BATCH_ITEM_STATUS_LABELS,
  BATCH_ITEM_STATUS_COLORS,
  LOG_TYPE_LABELS,
  ROLE_LABELS,
} from '../data/mockData';
import type { WorkflowNode, BatchItem } from '../data/mockData';

const EXECUTION_MODE_LABELS: Record<string, string> = {
  single: '単体',
  batch_parallel: '並列バッチ',
  batch_sequential: '順次バッチ',
};

const EXECUTION_MODE_COLORS: Record<string, string> = {
  single: 'bg-gray-100 text-gray-700',
  batch_parallel: 'bg-indigo-100 text-indigo-700',
  batch_sequential: 'bg-teal-100 text-teal-700',
};

export default function InstanceDetail() {
  const { id } = useParams<{ id: string }>();
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'logs' | 'flow_info'>('logs');
  const [comment, setComment] = useState('');
  const [expandedBatchItem, setExpandedBatchItem] = useState<string | null>(null);

  const instance = instances.find((inst) => inst.id === id);

  if (!instance) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">インスタンスが見つかりません (ID: {id})</p>
      </div>
    );
  }

  const workflow = workflows.find((w) => w.id === instance.workflowId);
  const version = workflowVersions.find((v) => v.id === instance.versionId);
  const executionMode = instance.executionMode ?? 'single';
  const isBatch = executionMode !== 'single';

  // Build category path
  const getCategoryPath = (categoryId: string): string => {
    const parts: string[] = [];
    let current = categories.find((c) => c.id === categoryId);
    while (current) {
      parts.unshift(current.name);
      current = current.parentId ? categories.find((c) => c.id === current!.parentId) : undefined;
    }
    return parts.join(' / ');
  };

  // Logs filtered by workflowId AND instanceId
  const relatedLogs = logs
    .filter((l) => l.workflowId === instance.workflowId && l.instanceId === instance.id)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  // Determine node status
  const getNodeStatus = (node: WorkflowNode, index: number, nodes: WorkflowNode[], currentNodeId?: string) => {
    const targetNodeId = currentNodeId ?? instance.currentNodeId;
    const currentNodeObj = nodes.find((n) => n.id === targetNodeId);
    const currentIndex = currentNodeObj ? nodes.indexOf(currentNodeObj) : -1;
    if (node.id === targetNodeId) return 'current';
    if (currentIndex >= 0 && index < currentIndex) return 'completed';
    return 'future';
  };

  // Resolve assignee display name
  const getAssigneeName = (node: WorkflowNode): string | null => {
    if (!node.assignee) return null;
    if (node.assigneeType === 'agent') return getAgentName(node.assignee);
    return getUserName(node.assignee);
  };

  // Current node object
  const currentNodeObj = version?.nodes.find((n) => n.id === instance.currentNodeId);

  // Check if current user is the assignee of the current node
  const isCurrentUserAssignee =
    currentUser &&
    currentNodeObj?.assignee === currentUser.id &&
    currentNodeObj?.assigneeType === 'user';

  // Check if AI is executing the current node
  const isAiExecuting =
    currentNodeObj?.assigneeType === 'agent' && instance.status === 'running';

  // Get assignee role label
  const getAssigneeRole = (node: WorkflowNode): string | null => {
    if (!node.assignee) return null;
    if (node.assigneeType === 'agent') {
      const agent = aiAgents.find((a) => a.id === node.assignee);
      return agent ? 'AIエージェント' : null;
    }
    const user = users.find((u) => u.id === node.assignee);
    return user ? ROLE_LABELS[user.role] : null;
  };

  // Batch stats
  const batchItems = instance.batchItems ?? [];
  const batchTotal = instance.batchTotalCount ?? batchItems.length;
  const batchCompleted = instance.batchCompletedCount ?? batchItems.filter((b) => b.status === 'completed').length;
  const batchRunning = batchItems.filter((b) => b.status === 'running').length;
  const batchWaiting = batchItems.filter((b) => b.status === 'pending').length;
  const batchError = batchItems.filter((b) => b.status === 'error').length;
  const batchWaitingAction = batchItems.filter((b) => b.status === 'waiting_approval' || b.status === 'waiting_human').length;

  // Elapsed time helper
  const getElapsedTime = (startedAt?: string, completedAt?: string): string | null => {
    if (!startedAt) return null;
    const start = new Date(startedAt.replace(' ', 'T'));
    const end = completedAt ? new Date(completedAt.replace(' ', 'T')) : new Date('2026-03-23T12:00:00');
    const diffMs = end.getTime() - start.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 60) return `${diffMin}分`;
    const hours = Math.floor(diffMin / 60);
    const mins = diffMin % 60;
    return `${hours}時間${mins}分`;
  };

  // ----- Flow Diagram Component -----
  const FlowDiagram = ({ currentNodeId, compact }: { currentNodeId?: string; compact?: boolean }) => {
    if (!version || version.nodes.length === 0) return null;
    const targetNodeId = currentNodeId ?? instance.currentNodeId;
    return (
      <div className={`flex items-start gap-1 overflow-x-auto ${compact ? 'pb-2' : 'pb-4'}`}>
        {version.nodes.map((node, index) => {
          const status = getNodeStatus(node, index, version.nodes, targetNodeId);
          const assigneeName = getAssigneeName(node);

          let borderClass = '';
          let textClass = '';
          let statusIndicator: React.ReactNode = null;

          if (status === 'completed') {
            borderClass = 'border-green-400 bg-green-50';
            textClass = 'text-gray-800';
            statusIndicator = (
              <div className="flex items-center gap-1 text-green-600">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-[10px] font-medium">完了</span>
              </div>
            );
          } else if (status === 'current') {
            borderClass = 'border-blue-500 ring-2 ring-blue-300 bg-blue-50';
            textClass = 'text-gray-900 font-semibold';
            statusIndicator = (
              <span className="text-[10px] font-bold text-blue-600 animate-pulse">実行中</span>
            );
          } else {
            borderClass = 'border-gray-300 bg-gray-50';
            textClass = 'text-gray-400';
          }

          return (
            <div key={node.id} className="flex items-center gap-1 flex-shrink-0">
              <div className={`flex flex-col items-center rounded-lg border-2 ${compact ? 'px-2 py-1.5 min-w-[90px]' : 'px-4 py-3 min-w-[120px]'} ${borderClass}`}>
                <div
                  className={`${compact ? 'w-2 h-2' : 'w-3 h-3'} rounded-full mb-1`}
                  style={{ backgroundColor: NODE_TYPE_COLORS[node.type] }}
                  title={NODE_TYPE_LABELS[node.type]}
                />
                <span className={`${compact ? 'text-[10px]' : 'text-xs'} text-center leading-tight ${textClass}`}>
                  {node.name}
                </span>
                {!compact && (
                  <span className="text-[10px] text-gray-400 mt-0.5">
                    {NODE_TYPE_LABELS[node.type]}
                  </span>
                )}
                {assigneeName && (
                  <span className={`text-[10px] mt-0.5 ${status === 'future' ? 'text-gray-300' : 'text-gray-500'}`}>
                    {assigneeName}
                  </span>
                )}
                <div className="mt-0.5">{statusIndicator}</div>
              </div>
              {index < version.nodes.length - 1 && (
                <svg className={`${compact ? 'w-4 h-4' : 'w-6 h-6'} text-gray-300 flex-shrink-0`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // ----- Current Node Detail Card -----
  const CurrentNodeCard = () => {
    if (!currentNodeObj) return null;
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">現在のノード</h2>
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: NODE_TYPE_COLORS[currentNodeObj.type] + '20' }}
            >
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: NODE_TYPE_COLORS[currentNodeObj.type] }} />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-gray-900">{currentNodeObj.name}</h3>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                <span>種別: <span className="font-medium text-gray-700">{NODE_TYPE_LABELS[currentNodeObj.type]}</span></span>
                {getAssigneeName(currentNodeObj) && (
                  <span>
                    担当: <span className="font-medium text-gray-700">{getAssigneeName(currentNodeObj)}</span>
                    {getAssigneeRole(currentNodeObj) && (
                      <span className="text-gray-400 ml-1">({getAssigneeRole(currentNodeObj)})</span>
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>

          {isAiExecuting && (
            <div className="flex items-center gap-3 bg-violet-50 rounded-lg px-4 py-3 border border-violet-200">
              <svg className="w-5 h-5 text-violet-500 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-sm font-medium text-violet-700">
                AI処理中...（{getAssigneeName(currentNodeObj)}が実行しています）
              </span>
            </div>
          )}

          {isCurrentUserAssignee && (
            <div className="border-t border-gray-100 pt-4 space-y-3">
              {currentNodeObj.type === 'human_task' && (
                <>
                  <textarea
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none resize-none"
                    rows={3}
                    placeholder="コメントを入力..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors">作業開始</button>
                    <button className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors">完了報告</button>
                  </div>
                </>
              )}
              {currentNodeObj.type === 'approval' && (
                <>
                  <textarea
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none resize-none"
                    rows={3}
                    placeholder="コメントを入力..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors">承認</button>
                    <button className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors">却下</button>
                    <button className="px-4 py-2 rounded-lg bg-yellow-500 text-white text-sm font-medium hover:bg-yellow-600 transition-colors">差し戻し</button>
                  </div>
                </>
              )}
              {currentNodeObj.type === 'exception' && (
                <div className="flex gap-2">
                  <button className="px-4 py-2 rounded-lg bg-orange-600 text-white text-sm font-medium hover:bg-orange-700 transition-colors">対応開始</button>
                  <button className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors">解決済みにする</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ----- Batch Item Action Buttons -----
  const BatchItemActions = ({ item }: { item: BatchItem }) => {
    const itemNode = item.currentNodeId ? version?.nodes.find((n) => n.id === item.currentNodeId) : null;
    if (!itemNode || !currentUser) return null;
    const isAssignee = itemNode.assignee === currentUser.id && itemNode.assigneeType === 'user';
    if (!isAssignee) return null;

    return (
      <div className="mt-3 pt-3 border-t border-gray-100">
        {(item.status === 'waiting_approval' && itemNode.type === 'approval') && (
          <div className="flex gap-2">
            <button className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700 transition-colors">承認</button>
            <button className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition-colors">却下</button>
            <button className="px-3 py-1.5 rounded-lg bg-yellow-500 text-white text-xs font-medium hover:bg-yellow-600 transition-colors">差し戻し</button>
          </div>
        )}
        {(item.status === 'waiting_human' && itemNode.type === 'human_task') && (
          <div className="flex gap-2">
            <button className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors">作業開始</button>
            <button className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700 transition-colors">完了報告</button>
          </div>
        )}
      </div>
    );
  };

  // ----- Sidebar (shared) -----
  const Sidebar = () => (
    <div className="lg:col-span-1">
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden sticky top-6">
        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'logs'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
            onClick={() => setActiveTab('logs')}
          >
            {isBatch ? '全体ログ' : '作業ログ'}
          </button>
          <button
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'flow_info'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
            onClick={() => setActiveTab('flow_info')}
          >
            フロー情報
          </button>
        </div>

        {/* Tab: ログ */}
        {activeTab === 'logs' && (
          <div className="max-h-[600px] overflow-y-auto">
            {relatedLogs.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">関連するログはありません</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {relatedLogs.map((log) => (
                  <div key={log.id} className="px-4 py-3 hover:bg-gray-50">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] text-gray-400 font-mono">{log.timestamp}</span>
                      <span className="inline-block rounded px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-600">
                        {LOG_TYPE_LABELS[log.type]}
                      </span>
                    </div>
                    <div className="text-sm text-gray-800">
                      <span className="font-medium">{log.actor}</span>
                      <span className="text-gray-400 mx-1">|</span>
                      <span className="text-gray-500">{log.eventType}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{log.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: フロー情報 */}
        {activeTab === 'flow_info' && workflow && (
          <div className="p-4 space-y-4">
            <dl className="space-y-3">
              <div>
                <dt className="text-xs text-gray-400 uppercase tracking-wider">実行パターン</dt>
                <dd className="text-sm font-medium text-gray-700 mt-0.5">{TRIGGER_LABELS[workflow.triggerType]}</dd>
                {workflow.triggerConfig && (
                  <dd className="text-xs text-gray-500 mt-0.5">{workflow.triggerConfig}</dd>
                )}
              </div>
              <div>
                <dt className="text-xs text-gray-400 uppercase tracking-wider">オーナー</dt>
                <dd className="text-sm font-medium text-gray-700 mt-0.5">{getUserName(workflow.ownerId)}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 uppercase tracking-wider">バージョン</dt>
                <dd className="text-sm font-medium text-gray-700 mt-0.5">
                  v{workflow.currentVersion}
                  {version && (
                    <span className="text-gray-400 ml-1">
                      ({version.status === 'approved' ? '承認済' : version.status})
                    </span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 uppercase tracking-wider">業務カテゴリ</dt>
                <dd className="text-sm font-medium text-gray-700 mt-0.5">{getCategoryPath(workflow.categoryId)}</dd>
              </div>
            </dl>
            <div className="pt-3 border-t border-gray-100">
              <Link
                to={`/workflows/${workflow.id}/edit`}
                className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                ワークフローを編集
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* ===== Header ===== */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">
                {workflow?.name ?? instance.workflowId}
              </h1>
              <span className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${INSTANCE_STATUS_COLORS[instance.status]}`}>
                {INSTANCE_STATUS_LABELS[instance.status]}
              </span>
              <span className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${EXECUTION_MODE_COLORS[executionMode]}`}>
                {EXECUTION_MODE_LABELS[executionMode]}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1 font-mono">ID: {instance.id}</p>
          </div>
          <div className="text-right text-sm text-gray-500 space-y-1">
            <div>
              <span className="text-gray-400">開始者:</span>{' '}
              <span className="font-medium text-gray-700">{getUserName(instance.startedBy)}</span>
            </div>
            <div>
              <span className="text-gray-400">開始日時:</span>{' '}
              <span className="font-medium text-gray-700">{instance.startedAt}</span>
            </div>
            {instance.endedAt && (
              <div>
                <span className="text-gray-400">終了日時:</span>{' '}
                <span className="font-medium text-gray-700">{instance.endedAt}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== SINGLE MODE ===== */}
      {!isBatch && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left (main) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Flow Diagram */}
            {version && version.nodes.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">フロー進捗</h2>
                <FlowDiagram />
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${instance.progress}%` }} />
                  </div>
                  <span className="text-sm font-medium text-gray-600">{instance.progress}%</span>
                </div>
              </div>
            )}

            {/* Current Node Detail */}
            <CurrentNodeCard />
          </div>

          {/* Right sidebar */}
          <Sidebar />
        </div>
      )}

      {/* ===== BATCH MODE ===== */}
      {isBatch && (
        <>
          {/* Overall batch progress */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-semibold text-gray-800">バッチ進捗</h2>
                <span className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${executionMode === 'batch_parallel' ? 'bg-indigo-100 text-indigo-700' : 'bg-teal-100 text-teal-700'}`}>
                  {executionMode === 'batch_parallel' ? '並列処理' : '順次処理'}
                </span>
              </div>
              <span className="text-2xl font-bold text-gray-900">
                {batchTotal}件中{batchCompleted}件完了
              </span>
            </div>
            {/* Progress bar */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all"
                  style={{ width: `${batchTotal > 0 ? Math.round((batchCompleted / batchTotal) * 100) : 0}%` }}
                />
              </div>
              <span className="text-sm font-medium text-gray-600">
                {batchTotal > 0 ? Math.round((batchCompleted / batchTotal) * 100) : 0}%
              </span>
            </div>
            {/* Stats row */}
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2 bg-green-50 rounded-lg px-3 py-2">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                <span className="text-sm text-gray-600">完了</span>
                <span className="text-sm font-bold text-green-700">{batchCompleted}</span>
              </div>
              <div className="flex items-center gap-2 bg-blue-50 rounded-lg px-3 py-2">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span className="text-sm text-gray-600">処理中</span>
                <span className="text-sm font-bold text-blue-700">{batchRunning}</span>
              </div>
              <div className="flex items-center gap-2 bg-yellow-50 rounded-lg px-3 py-2">
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                <span className="text-sm text-gray-600">アクション待ち</span>
                <span className="text-sm font-bold text-yellow-700">{batchWaitingAction}</span>
              </div>
              <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                <div className="w-2.5 h-2.5 rounded-full bg-gray-400" />
                <span className="text-sm text-gray-600">待機中</span>
                <span className="text-sm font-bold text-gray-700">{batchWaiting}</span>
              </div>
              {batchError > 0 && (
                <div className="flex items-center gap-2 bg-red-50 rounded-lg px-3 py-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <span className="text-sm text-gray-600">エラー</span>
                  <span className="text-sm font-bold text-red-700">{batchError}</span>
                </div>
              )}
            </div>
          </div>

          {/* Main: batch items + sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-3">
              <h2 className="text-lg font-semibold text-gray-800">バッチアイテム一覧</h2>
              {batchItems.map((item) => {
                const isExpanded = expandedBatchItem === item.id;
                const itemNode = item.currentNodeId ? version?.nodes.find((n) => n.id === item.currentNodeId) : null;
                const itemAssignee = itemNode ? getAssigneeName(itemNode) : null;
                // Logs for this batch item (simulated: filter by instanceId)
                const itemLogs = relatedLogs.slice(0, 2); // simplified for mock

                return (
                  <div key={item.id} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                    {/* Item row */}
                    <button
                      className="w-full px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                      onClick={() => setExpandedBatchItem(isExpanded ? null : item.id)}
                    >
                      <div className="flex items-center gap-4">
                        {/* Expand chevron */}
                        <svg
                          className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>

                        {/* Label */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-gray-900 truncate">{item.label}</span>
                            <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${BATCH_ITEM_STATUS_COLORS[item.status]}`}>
                              {BATCH_ITEM_STATUS_LABELS[item.status]}
                            </span>
                          </div>
                          {item.currentNode && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              現在ノード: <span className="font-medium">{item.currentNode}</span>
                            </p>
                          )}
                        </div>

                        {/* Progress */}
                        <div className="flex items-center gap-2 flex-shrink-0 w-36">
                          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${item.status === 'completed' ? 'bg-green-500' : item.status === 'error' ? 'bg-red-500' : 'bg-blue-500'}`}
                              style={{ width: `${item.progress}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-gray-500 w-8 text-right">{item.progress}%</span>
                        </div>

                        {/* Detail text */}
                        {item.detail && (
                          <span className="text-xs text-gray-400 flex-shrink-0 max-w-[120px] truncate">{item.detail}</span>
                        )}

                        {/* Times */}
                        <div className="text-right text-[11px] text-gray-400 flex-shrink-0 hidden sm:block">
                          {item.startedAt && <div>開始: {item.startedAt.split(' ')[1]}</div>}
                          {item.completedAt && <div>完了: {item.completedAt.split(' ')[1]}</div>}
                          {item.startedAt && (
                            <div className="font-medium text-gray-500">
                              経過: {getElapsedTime(item.startedAt, item.completedAt)}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="border-t border-gray-100 px-5 py-4 bg-gray-50/50 space-y-4">
                        {/* Mini flow diagram */}
                        {version && version.nodes.length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">フロー進捗</h4>
                            <FlowDiagram currentNodeId={item.currentNodeId} compact />
                          </div>
                        )}

                        {/* Current node & assignee */}
                        {itemNode && (
                          <div className="flex items-center gap-3">
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center"
                              style={{ backgroundColor: NODE_TYPE_COLORS[itemNode.type] + '20' }}
                            >
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: NODE_TYPE_COLORS[itemNode.type] }} />
                            </div>
                            <div>
                              <span className="text-sm font-medium text-gray-800">{itemNode.name}</span>
                              <span className="text-xs text-gray-400 ml-2">{NODE_TYPE_LABELS[itemNode.type]}</span>
                              {itemAssignee && (
                                <p className="text-xs text-gray-500">担当: {itemAssignee}</p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Timing details (mobile) */}
                        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500 sm:hidden">
                          {item.startedAt && <span>開始: {item.startedAt}</span>}
                          {item.completedAt && <span>完了: {item.completedAt}</span>}
                          {item.startedAt && <span>経過: {getElapsedTime(item.startedAt, item.completedAt)}</span>}
                        </div>

                        {/* Action buttons if item needs user action */}
                        <BatchItemActions item={item} />

                        {/* Item-specific log entries */}
                        {itemLogs.length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">ログ</h4>
                            <div className="space-y-1">
                              {itemLogs.map((log) => (
                                <div key={log.id} className="text-xs bg-white rounded px-3 py-2 border border-gray-100">
                                  <span className="text-gray-400 font-mono">{log.timestamp}</span>
                                  <span className="text-gray-400 mx-1">|</span>
                                  <span className="font-medium text-gray-700">{log.actor}</span>
                                  <span className="text-gray-400 mx-1">-</span>
                                  <span className="text-gray-500">{log.content}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {batchItems.length === 0 && (
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center text-sm text-gray-400">
                  バッチアイテムがありません
                </div>
              )}
            </div>

            {/* Right sidebar */}
            <Sidebar />
          </div>
        </>
      )}

      {/* ===== Bottom Action Bar ===== */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm px-6 py-4 flex items-center justify-between">
        <div className="flex gap-3">
          {isBatch ? (
            <>
              {(instance.status === 'running') && (
                <button className="px-4 py-2 rounded-lg border border-yellow-300 bg-yellow-50 text-sm font-medium text-yellow-700 hover:bg-yellow-100 transition-colors">
                  一時停止
                </button>
              )}
              {(instance.status === 'running') && (
                <button className="px-4 py-2 rounded-lg border border-gray-300 bg-gray-50 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors">
                  残り全てスキップ
                </button>
              )}
              {(instance.status === 'stopped') && (
                <button className="px-4 py-2 rounded-lg border border-green-300 bg-green-50 text-sm font-medium text-green-700 hover:bg-green-100 transition-colors">
                  再開
                </button>
              )}
            </>
          ) : (
            <>
              {(instance.status === 'running' || instance.status === 'waiting_approval' || instance.status === 'waiting_human') && (
                <button className="px-4 py-2 rounded-lg border border-red-300 bg-red-50 text-sm font-medium text-red-700 hover:bg-red-100 transition-colors">
                  停止依頼
                </button>
              )}
              {instance.status === 'stopped' && (
                <button className="px-4 py-2 rounded-lg border border-green-300 bg-green-50 text-sm font-medium text-green-700 hover:bg-green-100 transition-colors">
                  再開依頼
                </button>
              )}
            </>
          )}
        </div>
        <Link
          to="/"
          className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          戻る
        </Link>
      </div>
    </div>
  );
}
