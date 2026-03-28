import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  categories,
  workflows,
  workflowVersions,
  instances,
  approvalRequests,
  exceptions,
  users,
  getUserName,
  getAgentName,
  aiAgents,
  notifications,
  logs,
  WF_STATUS_LABELS,
  WF_STATUS_COLORS,
  INSTANCE_STATUS_LABELS,
  INSTANCE_STATUS_COLORS,
  NODE_TYPE_COLORS,
  NODE_TYPE_LABELS,
  TRIGGER_LABELS,
  APPROVAL_TYPE_LABELS,
  APPROVAL_STATUS_LABELS,
  BATCH_ITEM_STATUS_LABELS,
  BATCH_ITEM_STATUS_COLORS,
} from '../data/mockData';
import type {
  BusinessCategory,
  Workflow,
  ExecutionInstance,
  ApprovalRequest,
  WorkflowVersion,
  WorkflowNode,
  BatchItem,
} from '../data/mockData';

// ============================================================
// Helper functions
// ============================================================

function getCategoryPath(catId: string): string {
  const cat = categories.find(c => c.id === catId);
  if (!cat) return '';
  if (cat.parentId) {
    const parent = categories.find(c => c.id === cat.parentId);
    return parent ? `${parent.icon} ${parent.name} > ${cat.icon} ${cat.name}` : `${cat.icon} ${cat.name}`;
  }
  return `${cat.icon} ${cat.name}`;
}

function getWorkflowCountForCategory(catId: string): number {
  const childIds = categories.filter(c => c.parentId === catId).map(c => c.id);
  const allIds = [catId, ...childIds];
  return workflows.filter(w => allIds.includes(w.categoryId)).length;
}

function getActiveInstanceCount(workflowId: string): number {
  return instances.filter(i => i.workflowId === workflowId && i.status !== 'completed' && i.status !== 'stopped').length;
}

function getElapsedTime(startedAt: string): string {
  const start = new Date(startedAt).getTime();
  const now = new Date('2026-03-23T12:00:00').getTime();
  const diffMs = now - start;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 60) return `${diffMin}分`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}時間${diffMin % 60}分`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay}日${diffHour % 24}時間`;
}

function getActionLabel(type: string): string {
  switch (type) {
    case 'approve': return '承認';
    case 'execute_task': return '作業完了';
    case 'handle_exception': return '例外対応';
    case 'confirm': return '確認';
    case 'trigger': return 'トリガー';
    default: return type;
  }
}

function getDeadlineLabel(createdAt: string): { text: string; color: string } {
  const created = new Date(createdAt);
  const deadline = new Date(created);
  let addedDays = 0;
  while (addedDays < 3) {
    deadline.setDate(deadline.getDate() + 1);
    const dow = deadline.getDay();
    if (dow !== 0 && dow !== 6) addedDays++;
  }
  const now = new Date('2026-03-23T12:00:00');
  const diffMs = deadline.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { text: '期限超過', color: 'text-red-600 font-bold' };
  if (diffDays === 0) return { text: '本日期限', color: 'text-orange-600 font-semibold' };
  return { text: `あと${diffDays}日`, color: 'text-gray-600' };
}

function getVersionForWorkflow(workflowId: string): WorkflowVersion | undefined {
  const wf = workflows.find(w => w.id === workflowId);
  if (!wf) return undefined;
  return workflowVersions.find(v => v.workflowId === workflowId && v.versionNo === wf.currentVersion);
}

function getExecutionModeLabel(mode?: string): string {
  switch (mode) {
    case 'single': return '単体';
    case 'batch_parallel': return '並列';
    case 'batch_sequential': return '順次';
    default: return '単体';
  }
}

function getExecutionModeBadgeColor(mode?: string): string {
  switch (mode) {
    case 'batch_parallel': return 'bg-indigo-100 text-indigo-700';
    case 'batch_sequential': return 'bg-teal-100 text-teal-700';
    default: return 'bg-gray-100 text-gray-600';
  }
}

function getBatchSummaryLine(items: BatchItem[]): string {
  const completed = items.filter(i => i.status === 'completed').length;
  const waiting = items.filter(i => i.status === 'waiting_approval').length;
  const running = items.filter(i => i.status === 'running').length;
  const pending = items.filter(i => i.status === 'pending').length;
  const error = items.filter(i => i.status === 'error').length;
  const parts: string[] = [];
  parts.push(`${items.length}件中${completed}件完了`);
  if (waiting > 0) parts.push(`${waiting}件承認待ち`);
  if (running > 0) parts.push(`${running}件処理中`);
  if (pending > 0) parts.push(`${pending}件待機中`);
  if (error > 0) parts.push(`${error}件エラー`);
  return parts.join(' | ');
}

// ============================================================
// Mini Flow Diagram component
// ============================================================
function MiniFlowDiagram({ nodes, edges, currentNodeId }: { nodes: WorkflowNode[]; edges: { from: string; to: string }[]; currentNodeId?: string }) {
  if (!nodes.length) return <div className="text-xs text-gray-400">ノード未定義</div>;

  const ordered: WorkflowNode[] = [];
  const startNode = nodes.find(n => n.type === 'start');
  if (startNode) {
    ordered.push(startNode);
    let current = startNode.id;
    const visited = new Set<string>([current]);
    while (ordered.length < nodes.length) {
      const nextEdge = edges.find(e => e.from === current && !visited.has(e.to));
      if (!nextEdge) break;
      const nextNode = nodes.find(n => n.id === nextEdge.to);
      if (!nextNode) break;
      ordered.push(nextNode);
      visited.add(nextNode.id);
      current = nextNode.id;
    }
    nodes.forEach(n => {
      if (!visited.has(n.id)) ordered.push(n);
    });
  } else {
    ordered.push(...nodes);
  }

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {ordered.map((node, idx) => {
        const isCurrent = node.id === currentNodeId;
        return (
          <div key={node.id} className="flex items-center gap-1">
            {idx > 0 && <span className="text-gray-300 text-xs">→</span>}
            <div
              className={`px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap border ${
                isCurrent ? 'ring-2 ring-blue-400 font-bold' : ''
              }`}
              style={{
                backgroundColor: NODE_TYPE_COLORS[node.type] + '20',
                borderColor: NODE_TYPE_COLORS[node.type],
                color: NODE_TYPE_COLORS[node.type],
              }}
              title={`${NODE_TYPE_LABELS[node.type]}: ${node.name}`}
            >
              {node.name}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// Progress bar component
// ============================================================
function ProgressBar({ progress, color = 'bg-blue-500', height = 'h-2' }: { progress: number; color?: string; height?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`flex-1 bg-gray-200 rounded-full ${height}`}>
        <div
          className={`${color} ${height} rounded-full transition-all`}
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 w-8 text-right">{progress}%</span>
    </div>
  );
}

// ============================================================
// Batch items expandable component
// ============================================================
function BatchItemsList({ items, highlightItemId }: { items: BatchItem[]; highlightItemId?: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-2">
      <button
        onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
        className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
      >
        <span className={`transform transition-transform ${expanded ? 'rotate-90' : ''}`}>▶</span>
        アイテム一覧 ({items.length}件)
      </button>
      {expanded && (
        <div className="mt-2 space-y-1.5">
          {items.map(item => {
            const isHighlighted = item.id === highlightItemId;
            return (
              <div
                key={item.id}
                className={`p-2.5 rounded-lg border text-sm ${
                  isHighlighted
                    ? 'border-yellow-400 bg-yellow-50 ring-1 ring-yellow-300'
                    : 'border-gray-200 bg-white'
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-gray-800">{item.label}</span>
                  <span className={`px-2 py-0.5 rounded text-xs ${BATCH_ITEM_STATUS_COLORS[item.status]}`}>
                    {BATCH_ITEM_STATUS_LABELS[item.status]}
                  </span>
                </div>
                {item.currentNode && (
                  <div className="text-xs text-gray-500 mb-1">現在ノード: {item.currentNode}</div>
                )}
                <ProgressBar progress={item.progress} height="h-1.5" color={
                  item.status === 'completed' ? 'bg-green-500' :
                  item.status === 'error' ? 'bg-red-500' :
                  item.status === 'running' ? 'bg-blue-500' :
                  item.status === 'waiting_approval' ? 'bg-yellow-500' :
                  'bg-gray-400'
                } />
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                  {item.detail && <span>{item.detail}</span>}
                  {item.startedAt && <span>開始: {item.startedAt}</span>}
                  {item.completedAt && <span>完了: {item.completedAt}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Main Component
// ============================================================
export default function WorkflowManagement() {
  const { currentUser } = useAuth();
  const userId = currentUser?.id ?? 'u1';

  // State
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'my' | 'overview' | 'approval'>('my');
  const [slideOver, setSlideOver] = useState<{ type: string; data: unknown } | null>(null);
  const [approvalSplit, setApprovalSplit] = useState<ApprovalRequest | null>(null);
  const [approvalComment, setApprovalComment] = useState('');
  const [showApprovalHistory, setShowApprovalHistory] = useState(false);
  const [newExecDropdown, setNewExecDropdown] = useState(false);
  const [execMode, setExecMode] = useState<'single' | 'batch_parallel' | 'batch_sequential'>('single');
  const [expandedBatchInstances, setExpandedBatchInstances] = useState<Set<string>>(new Set());

  // Category filter
  const filteredWorkflowIds = useMemo(() => {
    if (!selectedCategory) return workflows.map(w => w.id);
    const childIds = categories.filter(c => c.parentId === selectedCategory).map(c => c.id);
    const allCatIds = [selectedCategory, ...childIds];
    return workflows.filter(w => allCatIds.includes(w.categoryId)).map(w => w.id);
  }, [selectedCategory]);

  const filteredWorkflows = useMemo(() => workflows.filter(w => filteredWorkflowIds.includes(w.id)), [filteredWorkflowIds]);
  const filteredInstances = useMemo(() => instances.filter(i => filteredWorkflowIds.includes(i.workflowId)), [filteredWorkflowIds]);

  // Tab 1 data
  const myPendingActions = useMemo(
    () => filteredInstances.filter(i => i.pendingAction?.assigneeId === userId),
    [filteredInstances, userId]
  );

  const myInstances = useMemo(() => {
    return filteredInstances.filter(i => {
      if (i.startedBy === userId) return true;
      const version = workflowVersions.find(v => v.id === i.versionId);
      if (version) {
        return version.nodes.some(n => n.assignee === userId);
      }
      return false;
    });
  }, [filteredInstances, userId]);

  const myWorkflows = useMemo(
    () => filteredWorkflows.filter(w => w.ownerId === userId),
    [filteredWorkflows, userId]
  );

  // Tab 2 data
  const summaryData = useMemo(() => {
    const batchRunning = filteredInstances.filter(i =>
      (i.executionMode === 'batch_parallel' || i.executionMode === 'batch_sequential') &&
      i.status !== 'completed' && i.status !== 'stopped'
    ).length;
    return {
      productionCount: filteredWorkflows.filter(w => w.status === 'production').length,
      runningInstances: filteredInstances.filter(i => i.status !== 'completed' && i.status !== 'stopped').length,
      batchRunning,
      pendingApprovals: approvalRequests.filter(a => a.status === 'pending').length,
      exceptionCount: exceptions.filter(e => e.status === 'open' || e.status === 'assigned' || e.status === 'in_progress').length,
    };
  }, [filteredWorkflows, filteredInstances]);

  const groupedByCategory = useMemo(() => {
    const groups: Record<string, Workflow[]> = {};
    filteredWorkflows.forEach(w => {
      const key = w.categoryId;
      if (!groups[key]) groups[key] = [];
      groups[key].push(w);
    });
    return groups;
  }, [filteredWorkflows]);

  // Tab 3 data
  const pendingApprovals = useMemo(
    () => approvalRequests.filter(a => a.approverId === userId && a.status === 'pending'),
    [userId]
  );
  const pastApprovals = useMemo(
    () => approvalRequests.filter(a => a.approverId === userId && a.status !== 'pending'),
    [userId]
  );

  // Production manual-trigger workflows for "new execution" dropdown
  const manualProductionWFs = useMemo(
    () => workflows.filter(w => w.status === 'production' && w.triggerType === 'manual' && !w.isTemplate),
    []
  );

  // Category tree
  const parentCategories = categories.filter(c => c.parentId === null);

  // Helper: get instance count including batch items for a workflow
  function getInstanceCountWithBatch(workflowId: string): string {
    const wfInstances = instances.filter(i => i.workflowId === workflowId && i.status !== 'completed' && i.status !== 'stopped');
    const totalBatchItems = wfInstances.reduce((sum, i) => sum + (i.batchTotalCount ?? 0), 0);
    if (totalBatchItems > 0) {
      return `${wfInstances.length}件 (バッチ${totalBatchItems}アイテム)`;
    }
    return `${wfInstances.length}件`;
  }

  // ============================================================
  // Slide-over for instance action
  // ============================================================
  function renderInstanceSlideOver(inst: ExecutionInstance) {
    const wf = workflows.find(w => w.id === inst.workflowId);
    const version = workflowVersions.find(v => v.id === inst.versionId);
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">{wf?.name}</h3>
          <button onClick={() => setSlideOver(null)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-xs ${INSTANCE_STATUS_COLORS[inst.status]}`}>
              {INSTANCE_STATUS_LABELS[inst.status]}
            </span>
            <span className="text-sm text-gray-500">#{inst.id}</span>
            <span className={`px-2 py-0.5 rounded text-xs ${getExecutionModeBadgeColor(inst.executionMode)}`}>
              {getExecutionModeLabel(inst.executionMode)}
            </span>
          </div>
          <div className="text-sm"><span className="text-gray-500">現在ノード:</span> {inst.currentNode}</div>
          <div className="text-sm"><span className="text-gray-500">開始:</span> {inst.startedAt}</div>
          <div className="text-sm"><span className="text-gray-500">開始者:</span> {getUserName(inst.startedBy)}</div>
          {inst.executionMode === 'single' && <ProgressBar progress={inst.progress} />}
          {inst.batchItems && inst.batchItems.length > 0 && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
              <div className="text-sm font-semibold text-gray-700 mb-2">バッチ処理状況</div>
              <div className="text-xs text-gray-600 mb-2">{getBatchSummaryLine(inst.batchItems)}</div>
              <ProgressBar
                progress={inst.batchTotalCount ? Math.round((inst.batchCompletedCount ?? 0) / inst.batchTotalCount * 100) : 0}
                color="bg-green-500"
              />
              <div className="mt-3 space-y-1.5">
                {inst.batchItems.map(item => (
                  <div key={item.id} className="p-2 bg-white rounded border border-gray-200 text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{item.label}</span>
                      <span className={`px-2 py-0.5 rounded text-xs ${BATCH_ITEM_STATUS_COLORS[item.status]}`}>
                        {BATCH_ITEM_STATUS_LABELS[item.status]}
                      </span>
                    </div>
                    {item.currentNode && <div className="text-xs text-gray-500">ノード: {item.currentNode}</div>}
                    {item.detail && <div className="text-xs text-gray-400">{item.detail}</div>}
                    <ProgressBar progress={item.progress} height="h-1" />
                  </div>
                ))}
              </div>
            </div>
          )}
          {version && (
            <div className="mt-3">
              <div className="text-xs text-gray-500 mb-1">フロー図</div>
              <MiniFlowDiagram nodes={version.nodes} edges={version.edges} currentNodeId={inst.currentNodeId} />
            </div>
          )}
        </div>
        {inst.pendingAction && inst.pendingAction.assigneeId === userId && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg space-y-3">
            <div className="font-semibold text-yellow-800">アクション: {inst.pendingAction.label}</div>
            <textarea
              className="w-full border rounded p-2 text-sm"
              placeholder="コメント（任意）"
              rows={3}
            />
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">
                {inst.pendingAction.label}
              </button>
              <button className="px-4 py-2 border rounded hover:bg-gray-50 text-sm" onClick={() => setSlideOver(null)}>
                閉じる
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============================================================
  // Slide-over for workflow detail (Tab 2)
  // ============================================================
  function renderWorkflowSlideOver(wf: Workflow) {
    const version = getVersionForWorkflow(wf.id);
    const activeInsts = instances.filter(i => i.workflowId === wf.id && i.status !== 'completed' && i.status !== 'stopped');
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">{wf.name}</h3>
          <button onClick={() => setSlideOver(null)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>
        <p className="text-sm text-gray-600">{wf.description}</p>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`px-2 py-0.5 rounded text-xs ${WF_STATUS_COLORS[wf.status]}`}>
            {WF_STATUS_LABELS[wf.status]}
          </span>
          <span className="text-xs text-gray-500">{TRIGGER_LABELS[wf.triggerType]}</span>
          <span className="text-xs text-gray-500">v{wf.currentVersion}</span>
        </div>
        {version && version.nodes.length > 0 && (
          <div>
            <div className="text-xs text-gray-500 mb-1">フロー図</div>
            <MiniFlowDiagram nodes={version.nodes} edges={version.edges} />
          </div>
        )}
        <div className="border-t pt-3 space-y-2">
          <div className="text-sm font-semibold">アクション</div>
          <div className="flex flex-wrap gap-2">
            <Link to={`/workflows/${wf.id}`} className="px-3 py-1.5 bg-gray-100 rounded text-sm hover:bg-gray-200">詳細</Link>
            <Link to={`/workflows/${wf.id}/edit`} className="px-3 py-1.5 bg-gray-100 rounded text-sm hover:bg-gray-200">編集</Link>
            <button className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded text-sm hover:bg-blue-100">実行</button>
            <Link to={`/workflows/${wf.id}/versions`} className="px-3 py-1.5 bg-gray-100 rounded text-sm hover:bg-gray-200">バージョン管理</Link>
          </div>
        </div>
        {activeInsts.length > 0 && (
          <div className="border-t pt-3">
            <div className="text-sm font-semibold mb-2">実行中インスタンス ({activeInsts.length})</div>
            <div className="space-y-2">
              {activeInsts.map(inst => (
                <div key={inst.id} className="p-2 bg-gray-50 rounded text-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">#{inst.id}</span>
                      <span className={`px-1.5 py-0.5 rounded text-xs ${getExecutionModeBadgeColor(inst.executionMode)}`}>
                        {getExecutionModeLabel(inst.executionMode)}
                      </span>
                      <span className="text-gray-500">{inst.currentNode}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs ${INSTANCE_STATUS_COLORS[inst.status]}`}>
                      {INSTANCE_STATUS_LABELS[inst.status]}
                    </span>
                  </div>
                  {inst.batchItems && inst.batchItems.length > 0 && (
                    <div className="mt-1 text-xs text-gray-500">{getBatchSummaryLine(inst.batchItems)}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============================================================
  // Render: Left Panel - Category Tree
  // ============================================================
  function renderCategoryTree() {
    return (
      <div className="w-64 min-h-screen bg-white border-r flex-shrink-0">
        <div className="p-4 border-b">
          <h2 className="font-bold text-sm text-gray-700">業務カテゴリ</h2>
        </div>
        <nav className="p-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`w-full text-left px-3 py-2 rounded text-sm flex items-center justify-between ${
              selectedCategory === null ? 'bg-blue-50 text-blue-700 font-semibold' : 'hover:bg-gray-50 text-gray-700'
            }`}
          >
            <span>全て</span>
            <span className="text-xs text-gray-400">{workflows.length}</span>
          </button>
          {parentCategories.map(parent => {
            const children = categories.filter(c => c.parentId === parent.id);
            const isSelected = selectedCategory === parent.id;
            return (
              <div key={parent.id} className="mt-1">
                <button
                  onClick={() => setSelectedCategory(parent.id)}
                  className={`w-full text-left px-3 py-2 rounded text-sm flex items-center justify-between ${
                    isSelected ? 'bg-blue-50 text-blue-700 font-semibold' : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <span>{parent.icon} {parent.name}</span>
                  <span className="text-xs text-gray-400">{getWorkflowCountForCategory(parent.id)}</span>
                </button>
                {children.length > 0 && (
                  <div className="ml-4">
                    {children.map(child => {
                      const isChildSelected = selectedCategory === child.id;
                      const count = workflows.filter(w => w.categoryId === child.id).length;
                      return (
                        <button
                          key={child.id}
                          onClick={() => setSelectedCategory(child.id)}
                          className={`w-full text-left px-3 py-1.5 rounded text-sm flex items-center justify-between ${
                            isChildSelected ? 'bg-blue-50 text-blue-700 font-semibold' : 'hover:bg-gray-50 text-gray-500'
                          }`}
                        >
                          <span>{child.icon} {child.name}</span>
                          <span className="text-xs text-gray-400">{count}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>
    );
  }

  // ============================================================
  // Render: Tab 1 - 自分の業務
  // ============================================================
  function renderMyWorkTab() {
    return (
      <div className="space-y-6">
        {/* アクション待ち */}
        <section className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-sm font-bold text-yellow-800 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
            アクション待ち
            {myPendingActions.length > 0 && (
              <span className="px-2 py-0.5 bg-yellow-200 text-yellow-800 rounded-full text-xs">{myPendingActions.length}</span>
            )}
          </h3>
          {myPendingActions.length === 0 ? (
            <div className="p-3 bg-white/60 rounded text-sm text-gray-500">アクション待ちの項目はありません。</div>
          ) : (
            <div className="space-y-2">
              {myPendingActions.map(inst => {
                const wf = workflows.find(w => w.id === inst.workflowId);
                return (
                  <div
                    key={inst.id}
                    onClick={() => setSlideOver({ type: 'instance', data: inst })}
                    className="p-4 bg-white border border-yellow-300 rounded-lg cursor-pointer hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-sm">{wf?.name}</span>
                        <span className="text-xs text-gray-500">#{inst.id}</span>
                        <span className={`px-1.5 py-0.5 rounded text-xs ${getExecutionModeBadgeColor(inst.executionMode)}`}>
                          {getExecutionModeLabel(inst.executionMode)}
                        </span>
                      </div>
                      <span className="px-2 py-1 bg-yellow-200 text-yellow-800 rounded text-xs font-semibold">
                        {inst.pendingAction ? getActionLabel(inst.pendingAction.type) : ''}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-xs text-gray-600">
                      <span>アクション: <span className="font-medium text-yellow-800">{inst.pendingAction?.label}</span></span>
                      <span>経過: {getElapsedTime(inst.startedAt)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 担当中のフロー実行 */}
        <section>
          <h3 className="text-sm font-bold text-gray-700 mb-3">担当中のフロー実行</h3>
          {myInstances.length === 0 ? (
            <div className="p-4 bg-gray-50 rounded text-sm text-gray-500">該当するインスタンスはありません。</div>
          ) : (
            <div className="space-y-3">
              {myInstances.map(inst => {
                const wf = workflows.find(w => w.id === inst.workflowId);
                const version = workflowVersions.find(v => v.id === inst.versionId);
                const assignee = inst.pendingAction ? getUserName(inst.pendingAction.assigneeId) : '-';
                const isBatch = inst.executionMode === 'batch_parallel' || inst.executionMode === 'batch_sequential';

                return (
                  <Link
                    key={inst.id}
                    to={`/instances/${inst.id}`}
                    className="block p-4 bg-white border rounded-lg hover:shadow-md transition-shadow"
                  >
                    {/* Header row */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{wf?.name}</span>
                        <span className="text-xs text-gray-400">#{inst.id}</span>
                        <span className={`px-2 py-0.5 rounded text-xs ${getExecutionModeBadgeColor(inst.executionMode)}`}>
                          {getExecutionModeLabel(inst.executionMode)}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs ${INSTANCE_STATUS_COLORS[inst.status]}`}>
                          {INSTANCE_STATUS_LABELS[inst.status]}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400">{inst.startedAt}</span>
                    </div>

                    {/* Single execution details */}
                    {!isBatch && (
                      <>
                        <div className="flex items-center gap-4 text-xs text-gray-600 mb-2">
                          <span>現在: <span className="font-medium">{inst.currentNode}</span></span>
                          <span>担当: {assignee}</span>
                        </div>
                        <ProgressBar progress={inst.progress} />
                        {version && version.nodes.length > 0 && (
                          <div className="mt-2">
                            <MiniFlowDiagram nodes={version.nodes} edges={version.edges} currentNodeId={inst.currentNodeId} />
                          </div>
                        )}
                      </>
                    )}

                    {/* Batch execution details */}
                    {isBatch && inst.batchItems && (
                      <div className="mt-1">
                        <div className="text-xs text-gray-600 mb-2">{getBatchSummaryLine(inst.batchItems)}</div>
                        <ProgressBar
                          progress={inst.batchTotalCount ? Math.round((inst.batchCompletedCount ?? 0) / inst.batchTotalCount * 100) : 0}
                          color="bg-green-500"
                        />
                        <BatchItemsList items={inst.batchItems} />
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* 管理するワークフロー */}
        <section>
          <h3 className="text-sm font-bold text-gray-700 mb-3">管理するワークフロー</h3>
          {myWorkflows.length === 0 ? (
            <div className="p-4 bg-gray-50 rounded text-sm text-gray-500">管理するワークフローはありません。</div>
          ) : (
            <div className="space-y-2">
              {myWorkflows.map(wf => {
                const activeCount = getActiveInstanceCount(wf.id);
                return (
                  <div
                    key={wf.id}
                    onClick={() => setSlideOver({ type: 'workflow', data: wf })}
                    className="p-4 bg-white border rounded-lg cursor-pointer hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{wf.name}</span>
                        <span className={`px-2 py-0.5 rounded text-xs ${WF_STATUS_COLORS[wf.status]}`}>
                          {WF_STATUS_LABELS[wf.status]}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400">更新: {wf.updatedAt}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                      <span>{TRIGGER_LABELS[wf.triggerType]}</span>
                      <span>v{wf.currentVersion}</span>
                      <span>実行中: {activeCount}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    );
  }

  // ============================================================
  // Render: Tab 2 - 全体状況
  // ============================================================
  function renderOverviewTab() {
    return (
      <div className="space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-5 gap-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="text-2xl font-bold text-green-700">{summaryData.productionCount}</div>
            <div className="text-xs text-green-600 mt-1">本番稼働中</div>
          </div>
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-2xl font-bold text-blue-700">{summaryData.runningInstances}</div>
            <div className="text-xs text-blue-600 mt-1">実行中インスタンス</div>
          </div>
          <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
            <div className="text-2xl font-bold text-indigo-700">{summaryData.batchRunning}</div>
            <div className="text-xs text-indigo-600 mt-1">バッチ処理中</div>
          </div>
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="text-2xl font-bold text-yellow-700">{summaryData.pendingApprovals}</div>
            <div className="text-xs text-yellow-600 mt-1">承認待ち</div>
          </div>
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="text-2xl font-bold text-red-700">{summaryData.exceptionCount}</div>
            <div className="text-xs text-red-600 mt-1">例外</div>
          </div>
        </div>

        {/* Category-grouped workflows */}
        <div className="space-y-4">
          {Object.entries(groupedByCategory).map(([catId, wfs]) => (
            <div key={catId} className="border rounded-lg overflow-hidden">
              <div className="px-4 py-2 bg-gray-50 border-b">
                <span className="text-sm font-semibold text-gray-700">{getCategoryPath(catId)}</span>
              </div>
              <div className="divide-y">
                {wfs.map(wf => {
                  const countLabel = getInstanceCountWithBatch(wf.id);
                  return (
                    <div
                      key={wf.id}
                      onClick={() => setSlideOver({ type: 'workflow', data: wf })}
                      className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">{wf.name}</span>
                        <span className={`px-2 py-0.5 rounded text-xs ${WF_STATUS_COLORS[wf.status]}`}>
                          {WF_STATUS_LABELS[wf.status]}
                        </span>
                        {wf.isTemplate && (
                          <span className="px-1.5 py-0.5 bg-purple-100 text-purple-600 rounded text-[10px]">テンプレート</span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>{TRIGGER_LABELS[wf.triggerType]}</span>
                        {countLabel !== '0件' && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">{countLabel}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {Object.keys(groupedByCategory).length === 0 && (
            <div className="p-8 text-center text-gray-400 text-sm">該当するワークフローはありません。</div>
          )}
        </div>
      </div>
    );
  }

  // ============================================================
  // Render: Tab 3 - 承認
  // ============================================================
  function renderApprovalTab() {
    return (
      <div className="space-y-6">
        {/* Pending approvals */}
        <section>
          <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
            承認待ちリスト
            {pendingApprovals.length > 0 && (
              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs">{pendingApprovals.length}</span>
            )}
          </h3>

          {approvalSplit ? (
            // Split view: 60% left / 40% right
            <div className="flex gap-4">
              {/* Left: Target state preview (60%) */}
              <div className="w-3/5 border rounded-lg p-5 space-y-4 bg-white">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-base">{approvalSplit.targetName}</h4>
                  <button onClick={() => { setApprovalSplit(null); setApprovalComment(''); }} className="text-gray-400 hover:text-gray-600 text-sm">
                    &times; 閉じる
                  </button>
                </div>
                <div className="text-xs text-gray-500">対象タイプ: {approvalSplit.targetType}</div>

                {/* Workflow target */}
                {approvalSplit.targetType === 'workflow' && (() => {
                  const wf = workflows.find(w => w.id === approvalSplit.targetId);
                  const version = wf ? getVersionForWorkflow(wf.id) : undefined;
                  return wf ? (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600">{wf.description}</p>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs ${WF_STATUS_COLORS[wf.status]}`}>
                          {WF_STATUS_LABELS[wf.status]}
                        </span>
                        <span className="text-xs text-gray-500">v{wf.currentVersion}</span>
                      </div>
                      {version && version.nodes.length > 0 && (
                        <div className="mt-2">
                          <div className="text-xs text-gray-500 mb-1">フロー図</div>
                          <MiniFlowDiagram nodes={version.nodes} edges={version.edges} />
                        </div>
                      )}
                    </div>
                  ) : <div className="text-sm text-gray-400">ワークフロー情報が見つかりません。</div>;
                })()}

                {/* Instance target */}
                {approvalSplit.targetType === 'instance' && (() => {
                  const inst = instances.find(i => i.id === approvalSplit.targetId);
                  const version = inst ? workflowVersions.find(v => v.id === inst.versionId) : undefined;
                  if (!inst) return <div className="text-sm text-gray-400">インスタンス情報が見つかりません。</div>;

                  const isBatch = inst.executionMode === 'batch_parallel' || inst.executionMode === 'batch_sequential';
                  return (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs ${INSTANCE_STATUS_COLORS[inst.status]}`}>
                          {INSTANCE_STATUS_LABELS[inst.status]}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs ${getExecutionModeBadgeColor(inst.executionMode)}`}>
                          {getExecutionModeLabel(inst.executionMode)}
                        </span>
                      </div>

                      {/* Single instance */}
                      {!isBatch && (
                        <>
                          <div className="text-sm text-gray-600">現在ノード: <span className="font-medium">{inst.currentNode}</span></div>
                          <ProgressBar progress={inst.progress} />
                          {inst.pendingAction && (
                            <div className="text-sm text-gray-600">担当: {getUserName(inst.pendingAction.assigneeId)}</div>
                          )}
                        </>
                      )}

                      {/* Batch instance - show items with highlighting */}
                      {isBatch && inst.batchItems && (
                        <div className="space-y-3">
                          <div className="text-sm text-gray-600">{getBatchSummaryLine(inst.batchItems)}</div>
                          <ProgressBar
                            progress={inst.batchTotalCount ? Math.round((inst.batchCompletedCount ?? 0) / inst.batchTotalCount * 100) : 0}
                            color="bg-green-500"
                          />
                          <div className="space-y-2">
                            {inst.batchItems.map(item => {
                              const isApprovalItem = item.status === 'waiting_approval';
                              return (
                                <div
                                  key={item.id}
                                  className={`p-3 rounded-lg border ${
                                    isApprovalItem
                                      ? 'border-yellow-400 bg-yellow-50 ring-1 ring-yellow-300'
                                      : 'border-gray-200 bg-gray-50'
                                  }`}
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-medium text-sm">{item.label}</span>
                                    <span className={`px-2 py-0.5 rounded text-xs ${BATCH_ITEM_STATUS_COLORS[item.status]}`}>
                                      {BATCH_ITEM_STATUS_LABELS[item.status]}
                                    </span>
                                  </div>
                                  {isApprovalItem && (
                                    <div className="text-xs text-yellow-700 font-medium mt-1">
                                      {item.label}の{item.currentNode ?? '処理'}が承認待ちです
                                    </div>
                                  )}
                                  {item.currentNode && (
                                    <div className="text-xs text-gray-500">ノード: {item.currentNode}</div>
                                  )}
                                  <ProgressBar progress={item.progress} height="h-1.5" color={
                                    item.status === 'completed' ? 'bg-green-500' :
                                    item.status === 'waiting_approval' ? 'bg-yellow-500' :
                                    'bg-blue-500'
                                  } />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {version && version.nodes.length > 0 && (
                        <div className="mt-2">
                          <div className="text-xs text-gray-500 mb-1">フロー図</div>
                          <MiniFlowDiagram nodes={version.nodes} edges={version.edges} currentNodeId={inst.currentNodeId} />
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Agent target */}
                {approvalSplit.targetType === 'agent' && (() => {
                  const agent = aiAgents.find(a => a.id === approvalSplit.targetId);
                  return agent ? (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600">{agent.description}</p>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">能力</div>
                        <div className="flex flex-wrap gap-1">
                          {agent.capabilities.map(cap => (
                            <span key={cap} className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">{cap}</span>
                          ))}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">バージョン: v{agent.version}</div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">指示内容</div>
                        <div className="text-sm p-2 bg-gray-50 rounded">{agent.instructions}</div>
                      </div>
                      <div className="p-3 bg-orange-50 border border-orange-200 rounded text-sm text-orange-800">
                        変更内容: {approvalSplit.reason}
                      </div>
                    </div>
                  ) : <div className="text-sm text-gray-400">エージェント情報が見つかりません。</div>;
                })()}
              </div>

              {/* Right: Approval action panel (40%) */}
              <div className="w-2/5 border rounded-lg p-5 space-y-4 bg-white">
                <h4 className="font-bold text-base">承認アクション</h4>
                <div className="space-y-1">
                  <div className="text-xs text-gray-500">承認種別</div>
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                    {APPROVAL_TYPE_LABELS[approvalSplit.approvalType]}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-gray-500">申請者</div>
                  <div className="text-sm font-medium">{getUserName(approvalSplit.requesterId)}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-gray-500">申請理由</div>
                  <div className="text-sm p-3 bg-gray-50 rounded">{approvalSplit.reason}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-gray-500">期限</div>
                  {(() => {
                    const dl = getDeadlineLabel(approvalSplit.createdAt);
                    return <div className={`text-sm font-medium ${dl.color}`}>{dl.text}</div>;
                  })()}
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-gray-500">コメント</div>
                  <textarea
                    className="w-full border rounded p-2 text-sm"
                    placeholder="コメントを入力..."
                    rows={4}
                    value={approvalComment}
                    onChange={e => setApprovalComment(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2 pt-2">
                  <button className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-bold">
                    承認
                  </button>
                  <button className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-bold">
                    却下
                  </button>
                  <button className="w-full px-4 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 text-sm font-bold">
                    差し戻し
                  </button>
                </div>
              </div>
            </div>
          ) : (
            // List view
            <div className="space-y-2">
              {pendingApprovals.length === 0 ? (
                <div className="p-4 bg-gray-50 rounded text-sm text-gray-500">承認待ちの項目はありません。</div>
              ) : (
                pendingApprovals.map(ar => {
                  const deadline = getDeadlineLabel(ar.createdAt);
                  return (
                    <div
                      key={ar.id}
                      onClick={() => { setApprovalSplit(ar); setApprovalComment(''); }}
                      className="p-4 bg-white border rounded-lg cursor-pointer hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-sm">{ar.targetName}</span>
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                            {APPROVAL_TYPE_LABELS[ar.approvalType]}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-xs font-medium ${deadline.color}`}>{deadline.text}</span>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                        <span>申請者: {getUserName(ar.requesterId)}</span>
                        <span>申請日: {ar.createdAt}</span>
                        <span>対象: {ar.targetType}</span>
                      </div>
                      {/* Target preview snippet */}
                      {ar.targetType === 'instance' && (() => {
                        const inst = instances.find(i => i.id === ar.targetId);
                        if (!inst || !inst.batchItems) return null;
                        const waitingItems = inst.batchItems.filter(bi => bi.status === 'waiting_approval');
                        if (waitingItems.length === 0) return null;
                        return (
                          <div className="mt-2 text-xs text-yellow-700 bg-yellow-50 rounded px-2 py-1">
                            {waitingItems.map(wi => wi.label).join(', ')} の承認が必要
                          </div>
                        );
                      })()}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </section>

        {/* Approval history */}
        <section>
          <button
            onClick={() => setShowApprovalHistory(!showApprovalHistory)}
            className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1"
          >
            <span className={`transform transition-transform ${showApprovalHistory ? 'rotate-90' : ''}`}>▶</span>
            承認履歴 ({pastApprovals.length})
          </button>
          {showApprovalHistory && (
            <div className="mt-2 space-y-2">
              {pastApprovals.length === 0 ? (
                <div className="p-4 bg-gray-50 rounded text-sm text-gray-500">承認履歴はありません。</div>
              ) : (
                pastApprovals.map(ar => (
                  <div key={ar.id} className="p-3 bg-gray-50 border rounded-lg text-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{ar.targetName}</span>
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          ar.status === 'approved' ? 'bg-green-100 text-green-700' :
                          ar.status === 'rejected' ? 'bg-red-100 text-red-700' :
                          ar.status === 'returned' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {APPROVAL_STATUS_LABELS[ar.status]}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400">{ar.createdAt}</span>
                    </div>
                    {ar.comment && (
                      <div className="mt-1 text-xs text-gray-500">コメント: {ar.comment}</div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </section>
      </div>
    );
  }

  // ============================================================
  // Main render
  // ============================================================
  const tabs = [
    { key: 'my' as const, label: '自分の業務' },
    { key: 'overview' as const, label: '全体状況' },
    { key: 'approval' as const, label: '承認', badge: pendingApprovals.length },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Left panel */}
      {renderCategoryTree()}

      {/* Right main area */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">ワークフロー管理</h1>
          <div className="flex items-center gap-3">
            {/* New execution dropdown */}
            <div className="relative">
              <button
                onClick={() => setNewExecDropdown(!newExecDropdown)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
              >
                新規実行 ▾
              </button>
              {newExecDropdown && (
                <div className="absolute right-0 mt-1 w-80 bg-white border rounded-lg shadow-lg z-50">
                  <div className="p-3">
                    {/* Execution mode selector */}
                    <div className="text-xs text-gray-500 px-1 mb-2">実行モード</div>
                    <div className="flex gap-1 mb-3 bg-gray-100 rounded-lg p-1">
                      <button
                        onClick={() => setExecMode('single')}
                        className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                          execMode === 'single' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        単体実行
                      </button>
                      <button
                        onClick={() => setExecMode('batch_parallel')}
                        className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                          execMode === 'batch_parallel' ? 'bg-white shadow text-indigo-700' : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        バッチ（並列）
                      </button>
                      <button
                        onClick={() => setExecMode('batch_sequential')}
                        className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                          execMode === 'batch_sequential' ? 'bg-white shadow text-teal-700' : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        バッチ（順次）
                      </button>
                    </div>

                    {/* Batch input area */}
                    {(execMode === 'batch_parallel' || execMode === 'batch_sequential') && (
                      <div className="mb-3">
                        <textarea
                          className="w-full border rounded p-2 text-xs"
                          placeholder="処理対象リスト（1行1件）&#10;例:&#10;株式会社アルファ&#10;ベータ商事株式会社"
                          rows={4}
                        />
                        <div className="text-xs text-gray-400 mt-1">
                          {execMode === 'batch_parallel' ? '全件を同時に並列処理します' : '上から順に1件ずつ処理します'}
                        </div>
                      </div>
                    )}

                    <div className="text-xs text-gray-500 px-1 mb-1">本番稼働中の手動実行フロー</div>
                    {manualProductionWFs.length === 0 ? (
                      <div className="px-2 py-2 text-sm text-gray-400">該当なし</div>
                    ) : (
                      manualProductionWFs.map(wf => (
                        <button
                          key={wf.id}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 rounded flex items-center justify-between"
                          onClick={() => setNewExecDropdown(false)}
                        >
                          <span>{wf.name}</span>
                          <span className="text-xs text-gray-400">{getExecutionModeLabel(execMode)}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            <Link
              to="/workflows/new"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
            >
              新規ワークフロー作成
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white border-b px-6">
          <div className="flex gap-1">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); setApprovalSplit(null); }}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 bg-red-500 text-white rounded-full text-[10px]">{tab.badge}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="p-6">
          {activeTab === 'my' && renderMyWorkTab()}
          {activeTab === 'overview' && renderOverviewTab()}
          {activeTab === 'approval' && renderApprovalTab()}
        </div>
      </div>

      {/* Slide-over */}
      {slideOver && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/20" onClick={() => setSlideOver(null)} />
          <div className="relative w-[520px] bg-white shadow-xl overflow-y-auto">
            {slideOver.type === 'instance' && renderInstanceSlideOver(slideOver.data as ExecutionInstance)}
            {slideOver.type === 'workflow' && renderWorkflowSlideOver(slideOver.data as Workflow)}
          </div>
        </div>
      )}

      {/* Close new exec dropdown on outside click */}
      {newExecDropdown && (
        <div className="fixed inset-0 z-40" onClick={() => setNewExecDropdown(false)} />
      )}
    </div>
  );
}
