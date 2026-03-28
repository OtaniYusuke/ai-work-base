import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCategories } from '../context/CategoryContext';
import {
  workflows,
  workflowVersions,
  instances,
  approvalRequests,
  exceptions,
  getUserName,
  aiAgents,
  WF_STATUS_LABELS,
  WF_STATUS_COLORS,
  INSTANCE_STATUS_LABELS,
  INSTANCE_STATUS_COLORS,
  NODE_TYPE_COLORS,
  NODE_TYPE_LABELS,
  TRIGGER_LABELS,
  APPROVAL_TYPE_LABELS,
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

function getWorkflowCountForCategory(catId: string, cats: BusinessCategory[]): number {
  const childIds = cats.filter(c => c.parentId === catId).map(c => c.id);
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

function getActionBadgeColor(type: string): { badge: string; border: string } {
  switch (type) {
    case 'approve': return { badge: 'bg-yellow-200 text-yellow-800', border: 'border-yellow-300' };
    case 'execute_task': return { badge: 'bg-blue-200 text-blue-800', border: 'border-blue-300' };
    case 'handle_exception': return { badge: 'bg-red-200 text-red-800', border: 'border-red-300' };
    case 'confirm': return { badge: 'bg-green-200 text-green-800', border: 'border-green-300' };
    case 'trigger': return { badge: 'bg-purple-200 text-purple-800', border: 'border-purple-300' };
    default: return { badge: 'bg-gray-200 text-gray-800', border: 'border-gray-300' };
  }
}

// ============================================================
// Unified ActionItem type
// ============================================================
interface ActionItem {
  id: string;
  sourceType: 'approval' | 'instance';
  actionType: string;
  title: string;
  subtitle: string;
  badge: string;
  badgeColor: string;
  cardBorderColor: string;
  createdAt: string;
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
            {idx > 0 && <span className="text-gray-300 text-xs">&rarr;</span>}
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
function BatchItemsList({ items }: { items: BatchItem[] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-2">
      <button
        onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
        className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
      >
        <span className={`transform transition-transform ${expanded ? 'rotate-90' : ''}`}>&#9654;</span>
        アイテム一覧 ({items.length}件)
      </button>
      {expanded && (
        <div className="mt-2 space-y-1.5">
          {items.map(item => (
            <div
              key={item.id}
              className="p-2.5 rounded-lg border border-gray-200 bg-white text-sm"
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
          ))}
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
  const { categories, addCategory } = useCategories();
  const userId = currentUser?.id ?? 'u1';

  // State
  const [activeTab, setActiveTab] = useState<'my' | 'overview'>('my');
  const [slideOver, setSlideOver] = useState<{ type: string; data: unknown } | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => {
    return new Set(categories.filter(c => c.parentId === null).map(c => c.id));
  });

  // Category creation state
  const [newCatMode, setNewCatMode] = useState<{ parentId: string | null } | null>(null);
  const [newCatName, setNewCatName] = useState('');

  // Workflow execution state (for slide-over)
  const [slideExecMode, setSlideExecMode] = useState<'single' | 'batch_parallel' | 'batch_sequential'>('single');
  const [slideExecOpen, setSlideExecOpen] = useState(false);
  const [slideExecBatchInput, setSlideExecBatchInput] = useState('');

  // Approval slide-over state
  const [approvalComment, setApprovalComment] = useState('');

  // ---- Data ----

  // Pending actions from instances assigned to current user
  const myPendingActions = useMemo(
    () => instances.filter(i => i.pendingAction?.assigneeId === userId),
    [userId]
  );

  // Pending approval requests for current user
  const pendingApprovals = useMemo(
    () => approvalRequests.filter(a => a.approverId === userId && a.status === 'pending'),
    [userId]
  );

  // Unified action items combining approvals + instance actions
  const actionItems = useMemo<ActionItem[]>(() => {
    const items: ActionItem[] = [];

    // From approval requests
    pendingApprovals.forEach(ar => {
      items.push({
        id: `approval-${ar.id}`,
        sourceType: 'approval',
        actionType: 'approve',
        title: ar.targetName,
        subtitle: `${APPROVAL_TYPE_LABELS[ar.approvalType]} | 申請者: ${getUserName(ar.requesterId)}`,
        badge: '承認',
        badgeColor: 'bg-yellow-200 text-yellow-800',
        cardBorderColor: 'border-yellow-300',
        createdAt: ar.createdAt,
      });
    });

    // From instance pending actions
    myPendingActions.forEach(inst => {
      if (!inst.pendingAction) return;
      const wf = workflows.find(w => w.id === inst.workflowId);
      const actionType = inst.pendingAction.type;
      const colors = getActionBadgeColor(actionType);

      items.push({
        id: `instance-${inst.id}`,
        sourceType: 'instance',
        actionType,
        title: wf?.name ?? inst.workflowId,
        subtitle: inst.pendingAction.label,
        badge: getActionLabel(actionType),
        badgeColor: colors.badge,
        cardBorderColor: colors.border,
        createdAt: inst.startedAt,
      });
    });

    return items;
  }, [pendingApprovals, myPendingActions]);

  // My instances (started by me or I'm assigned to a node)
  const myInstances = useMemo(() => {
    return instances.filter(i => {
      if (i.startedBy === userId) return true;
      const version = workflowVersions.find(v => v.id === i.versionId);
      if (version) {
        return version.nodes.some(n => n.assignee === userId);
      }
      return false;
    });
  }, [userId]);

  // Workflows I own
  const myWorkflows = useMemo(
    () => workflows.filter(w => w.ownerId === userId),
    [userId]
  );

  // Summary data for overview tab
  const summaryData = useMemo(() => {
    const batchRunning = instances.filter(i =>
      (i.executionMode === 'batch_parallel' || i.executionMode === 'batch_sequential') &&
      i.status !== 'completed' && i.status !== 'stopped'
    ).length;
    return {
      productionCount: workflows.filter(w => w.status === 'production').length,
      runningInstances: instances.filter(i => i.status !== 'completed' && i.status !== 'stopped').length,
      batchRunning,
      pendingApprovals: approvalRequests.filter(a => a.status === 'pending').length,
      exceptionCount: exceptions.filter(e => e.status === 'open' || e.status === 'assigned' || e.status === 'in_progress').length,
    };
  }, []);

  // Category tree data
  const parentCategories = categories.filter(c => c.parentId === null);

  // ---- Handlers ----

  const toggleFolder = (catId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  };

  const handleAddCategory = () => {
    if (!newCatName.trim()) return;
    addCategory(newCatName.trim(), newCatMode?.parentId ?? null, newCatMode?.parentId ? '📂' : '📁');
    setNewCatName('');
    setNewCatMode(null);
  };

  const handleActionClick = (item: ActionItem) => {
    if (item.sourceType === 'approval') {
      const arId = item.id.replace('approval-', '');
      const ar = approvalRequests.find(a => a.id === arId);
      if (ar) {
        setApprovalComment('');
        setSlideOver({ type: 'approval', data: ar });
      }
    } else {
      const instId = item.id.replace('instance-', '');
      const inst = instances.find(i => i.id === instId);
      if (inst) setSlideOver({ type: 'instance', data: inst });
    }
  };

  // ============================================================
  // Slide-over: Instance action
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
            <textarea className="w-full border rounded p-2 text-sm" placeholder="コメント（任意）" rows={3} />
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
  // Slide-over: Workflow detail
  // ============================================================
  function renderWorkflowSlideOver(wf: Workflow) {
    const version = getVersionForWorkflow(wf.id);
    const activeInsts = instances.filter(i => i.workflowId === wf.id && i.status !== 'completed' && i.status !== 'stopped');
    const canExecute = wf.status === 'production' && wf.triggerType === 'manual';

    const handleExecute = () => {
      const modeLabel = slideExecMode === 'single' ? '単体' : slideExecMode === 'batch_parallel' ? 'バッチ（並列）' : 'バッチ（順次）';
      alert(`「${wf.name}」を${modeLabel}モードで実行しました（モック）`);
      setSlideExecOpen(false);
      setSlideExecBatchInput('');
      setSlideOver(null);
    };

    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">{wf.name}</h3>
          <button onClick={() => { setSlideOver(null); setSlideExecOpen(false); }} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
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
            {canExecute && (
              <button
                onClick={() => { setSlideExecOpen(!slideExecOpen); setSlideExecMode('single'); setSlideExecBatchInput(''); }}
                className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700 font-medium"
              >
                実行
              </button>
            )}
            <Link to={`/workflows/${wf.id}/versions`} className="px-3 py-1.5 bg-gray-100 rounded text-sm hover:bg-gray-200">バージョン管理</Link>
          </div>
        </div>

        {canExecute && slideExecOpen && (
          <div className="border rounded-lg p-4 bg-green-50 border-green-200 space-y-3">
            <div className="text-sm font-semibold text-green-800">実行設定</div>
            <div className="flex gap-1 bg-white rounded-lg p-1">
              {(['single', 'batch_parallel', 'batch_sequential'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setSlideExecMode(mode)}
                  className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                    slideExecMode === mode ? 'bg-green-600 text-white shadow' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {mode === 'single' ? '単体実行' : mode === 'batch_parallel' ? 'バッチ（並列）' : 'バッチ（順次）'}
                </button>
              ))}
            </div>
            {(slideExecMode === 'batch_parallel' || slideExecMode === 'batch_sequential') && (
              <div>
                <textarea
                  className="w-full border rounded p-2 text-xs"
                  placeholder={'処理対象リスト（1行1件）\n例:\n株式会社アルファ\nベータ商事株式会社'}
                  rows={4}
                  value={slideExecBatchInput}
                  onChange={e => setSlideExecBatchInput(e.target.value)}
                />
                <div className="text-xs text-gray-500 mt-1">
                  {slideExecMode === 'batch_parallel' ? '全件を同時に並列処理します' : '上から順に1件ずつ処理します'}
                </div>
              </div>
            )}
            <button
              onClick={handleExecute}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-bold"
            >
              実行開始
            </button>
          </div>
        )}

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
  // Slide-over: Approval detail
  // ============================================================
  function renderApprovalSlideOver(ar: ApprovalRequest) {
    const deadline = getDeadlineLabel(ar.createdAt);

    return (
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">{ar.targetName}</h3>
          <button onClick={() => setSlideOver(null)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        {/* Target preview */}
        <div className="border rounded-lg p-4 bg-gray-50 space-y-3">
          <div className="text-xs text-gray-500">対象: {ar.targetType}</div>

          {ar.targetType === 'workflow' && (() => {
            const wf = workflows.find(w => w.id === ar.targetId);
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
                  <div>
                    <div className="text-xs text-gray-500 mb-1">フロー図</div>
                    <MiniFlowDiagram nodes={version.nodes} edges={version.edges} />
                  </div>
                )}
              </div>
            ) : null;
          })()}

          {ar.targetType === 'instance' && (() => {
            const inst = instances.find(i => i.id === ar.targetId);
            const version = inst ? workflowVersions.find(v => v.id === inst.versionId) : undefined;
            if (!inst) return null;
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
                {!isBatch && (
                  <>
                    <div className="text-sm text-gray-600">現在ノード: <span className="font-medium">{inst.currentNode}</span></div>
                    <ProgressBar progress={inst.progress} />
                  </>
                )}
                {isBatch && inst.batchItems && (
                  <div className="space-y-2">
                    <div className="text-sm text-gray-600">{getBatchSummaryLine(inst.batchItems)}</div>
                    <ProgressBar
                      progress={inst.batchTotalCount ? Math.round((inst.batchCompletedCount ?? 0) / inst.batchTotalCount * 100) : 0}
                      color="bg-green-500"
                    />
                    <div className="space-y-1.5">
                      {inst.batchItems.map(item => (
                        <div
                          key={item.id}
                          className={`p-2 rounded border text-sm ${
                            item.status === 'waiting_approval'
                              ? 'border-yellow-400 bg-yellow-50'
                              : 'border-gray-200 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium">{item.label}</span>
                            <span className={`px-2 py-0.5 rounded text-xs ${BATCH_ITEM_STATUS_COLORS[item.status]}`}>
                              {BATCH_ITEM_STATUS_LABELS[item.status]}
                            </span>
                          </div>
                          <ProgressBar progress={item.progress} height="h-1" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {version && version.nodes.length > 0 && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">フロー図</div>
                    <MiniFlowDiagram nodes={version.nodes} edges={version.edges} currentNodeId={inst.currentNodeId} />
                  </div>
                )}
              </div>
            );
          })()}

          {ar.targetType === 'agent' && (() => {
            const agent = aiAgents.find(a => a.id === ar.targetId);
            return agent ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">{agent.description}</p>
                <div className="flex flex-wrap gap-1">
                  {agent.capabilities.map(cap => (
                    <span key={cap} className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">{cap}</span>
                  ))}
                </div>
                <div className="text-sm p-2 bg-white rounded border">{agent.instructions}</div>
              </div>
            ) : null;
          })()}
        </div>

        {/* Approval action panel */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
              {APPROVAL_TYPE_LABELS[ar.approvalType]}
            </span>
            <span className={`text-sm font-medium ${deadline.color}`}>{deadline.text}</span>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-gray-500">申請者</div>
            <div className="text-sm font-medium">{getUserName(ar.requesterId)}</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-gray-500">申請理由</div>
            <div className="text-sm p-3 bg-gray-50 rounded">{ar.reason}</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-gray-500">コメント</div>
            <textarea
              className="w-full border rounded p-2 text-sm"
              placeholder="コメントを入力..."
              rows={3}
              value={approvalComment}
              onChange={e => setApprovalComment(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
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
    );
  }

  // ============================================================
  // Render: Tab 1 - 自分に関連する業務
  // ============================================================
  function renderMyWorkTab() {
    return (
      <div className="space-y-6">
        {/* Unified action items */}
        <section className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h3 className="text-sm font-bold text-amber-800 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
            アクション待ち
            {actionItems.length > 0 && (
              <span className="px-2 py-0.5 bg-amber-200 text-amber-800 rounded-full text-xs">{actionItems.length}</span>
            )}
          </h3>
          {actionItems.length === 0 ? (
            <div className="p-3 bg-white/60 rounded text-sm text-gray-500">アクション待ちの項目はありません。</div>
          ) : (
            <div className="space-y-2">
              {actionItems.map(item => (
                <div
                  key={item.id}
                  onClick={() => handleActionClick(item)}
                  className={`p-4 bg-white border ${item.cardBorderColor} rounded-lg cursor-pointer hover:shadow-md transition-shadow`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-sm">{item.title}</span>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-xs text-gray-600">
                    <span>{item.subtitle}</span>
                    <span className="text-gray-400">{item.createdAt}</span>
                  </div>
                </div>
              ))}
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
  // Helper: render a workflow row in the folder tree
  // ============================================================
  function renderWorkflowRow(wf: Workflow) {
    const canExecute = wf.status === 'production' && wf.triggerType === 'manual' && !wf.isTemplate;
    const activeCount = getActiveInstanceCount(wf.id);
    return (
      <div
        key={wf.id}
        onClick={() => setSlideOver({ type: 'workflow', data: wf })}
        className="pl-3 pr-4 py-2.5 flex items-center justify-between cursor-pointer hover:bg-blue-50 transition-colors border-t border-gray-100"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-gray-400 flex-shrink-0">📄</span>
          <span className="text-sm font-medium truncate">{wf.name}</span>
          <span className={`px-2 py-0.5 rounded text-xs flex-shrink-0 ${WF_STATUS_COLORS[wf.status]}`}>
            {WF_STATUS_LABELS[wf.status]}
          </span>
          {wf.isTemplate && (
            <span className="px-1.5 py-0.5 bg-purple-100 text-purple-600 rounded text-[10px] flex-shrink-0">テンプレート</span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500 flex-shrink-0 ml-2">
          <span className="hidden sm:inline">{TRIGGER_LABELS[wf.triggerType]}</span>
          {activeCount > 0 && (
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">実行中{activeCount}件</span>
          )}
          {canExecute && (
            <button
              onClick={(e) => { e.stopPropagation(); setSlideOver({ type: 'workflow', data: wf }); setSlideExecOpen(true); setSlideExecMode('single'); }}
              className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200 font-medium"
            >
              実行
            </button>
          )}
        </div>
      </div>
    );
  }

  // ============================================================
  // Render: Tab 2 - 全体 (Folder hierarchy)
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

        {/* Folder tree */}
        <div className="border rounded-lg bg-white overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-700">ワークフロー一覧</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setNewCatMode({ parentId: null }); setNewCatName(''); }}
                className="px-3 py-1.5 text-xs text-gray-600 bg-white border rounded hover:bg-gray-50 font-medium"
              >
                + 新規フォルダ
              </button>
              <Link
                to="/workflows/new"
                className="px-3 py-1.5 text-xs text-white bg-blue-600 rounded hover:bg-blue-700 font-medium"
              >
                + 新規ワークフロー
              </Link>
            </div>
          </div>

          {/* New parent category inline form */}
          {newCatMode && newCatMode.parentId === null && (
            <div className="px-4 py-2 bg-blue-50 border-b flex items-center gap-2">
              <span className="text-gray-400">📁</span>
              <input
                autoFocus
                type="text"
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddCategory(); if (e.key === 'Escape') setNewCatMode(null); }}
                placeholder="新規カテゴリ名"
                className="flex-1 min-w-0 border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
              <button onClick={handleAddCategory} className="text-xs text-blue-600 hover:text-blue-800 font-medium">追加</button>
              <button onClick={() => setNewCatMode(null)} className="text-xs text-gray-400 hover:text-gray-600">キャンセル</button>
            </div>
          )}

          <div>
            {parentCategories.map(parent => {
              const children = categories.filter(c => c.parentId === parent.id);
              const isExpanded = expandedFolders.has(parent.id);
              const totalCount = getWorkflowCountForCategory(parent.id, categories);
              const directWFs = workflows.filter(w => w.categoryId === parent.id);

              return (
                <div key={parent.id} className="border-b last:border-b-0">
                  {/* Parent folder row */}
                  <div className="group flex items-center">
                    <button
                      onClick={() => toggleFolder(parent.id)}
                      className="flex-1 px-4 py-2.5 flex items-center gap-2 hover:bg-gray-50 transition-colors text-left"
                    >
                      <span className="text-xs text-gray-400 w-4">{isExpanded ? '▼' : '▶'}</span>
                      <span className="text-base">{parent.icon}</span>
                      <span className="text-sm font-semibold text-gray-700">{parent.name}</span>
                      <span className="text-xs text-gray-400 ml-1">{totalCount}</span>
                    </button>
                    <button
                      onClick={() => { setNewCatMode({ parentId: parent.id }); setNewCatName(''); }}
                      className="opacity-0 group-hover:opacity-100 px-2 py-1 mr-2 text-xs text-gray-400 hover:text-blue-600 transition-opacity"
                      title="子フォルダを追加"
                    >
                      + フォルダ
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="bg-gray-50/30">
                      {/* Direct workflows under parent */}
                      {directWFs.length > 0 && (
                        <div className="ml-6">
                          {directWFs.map(wf => renderWorkflowRow(wf))}
                        </div>
                      )}

                      {/* Child categories */}
                      {children.map(child => {
                        const childExpanded = expandedFolders.has(child.id);
                        const childWFs = workflows.filter(w => w.categoryId === child.id);

                        return (
                          <div key={child.id}>
                            <button
                              onClick={() => toggleFolder(child.id)}
                              className="w-full ml-6 px-4 py-2 flex items-center gap-2 hover:bg-gray-100 transition-colors text-left"
                            >
                              <span className="text-xs text-gray-400 w-4">{childExpanded ? '▼' : '▶'}</span>
                              <span className="text-base">{child.icon}</span>
                              <span className="text-sm font-medium text-gray-600">{child.name}</span>
                              <span className="text-xs text-gray-400 ml-1">{childWFs.length}</span>
                            </button>
                            {childExpanded && childWFs.length > 0 && (
                              <div className="ml-12">
                                {childWFs.map(wf => renderWorkflowRow(wf))}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* New child category inline form */}
                      {newCatMode && newCatMode.parentId === parent.id && (
                        <div className="ml-10 px-4 py-2 flex items-center gap-2">
                          <span className="text-gray-400">📂</span>
                          <input
                            autoFocus
                            type="text"
                            value={newCatName}
                            onChange={e => setNewCatName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleAddCategory(); if (e.key === 'Escape') setNewCatMode(null); }}
                            placeholder="サブカテゴリ名"
                            className="flex-1 min-w-0 border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                          />
                          <button onClick={handleAddCategory} className="text-xs text-blue-600 hover:text-blue-800 font-medium">追加</button>
                          <button onClick={() => setNewCatMode(null)} className="text-xs text-gray-400 hover:text-gray-600">x</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {parentCategories.length === 0 && (
              <div className="p-8 text-center text-gray-400 text-sm">カテゴリがありません。「新規フォルダ」で追加してください。</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // Main render
  // ============================================================
  const tabs = [
    { key: 'my' as const, label: '自分に関連する業務', badge: actionItems.length },
    { key: 'overview' as const, label: '全体' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">ワークフロー管理</h1>
        <div className="flex items-center gap-3">
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
              onClick={() => setActiveTab(tab.key)}
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
      <div className="p-6 max-w-6xl mx-auto">
        {activeTab === 'my' && renderMyWorkTab()}
        {activeTab === 'overview' && renderOverviewTab()}
      </div>

      {/* Slide-over */}
      {slideOver && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/20" onClick={() => { setSlideOver(null); setSlideExecOpen(false); }} />
          <div className="relative w-[520px] bg-white shadow-xl overflow-y-auto">
            {slideOver.type === 'instance' && renderInstanceSlideOver(slideOver.data as ExecutionInstance)}
            {slideOver.type === 'workflow' && renderWorkflowSlideOver(slideOver.data as Workflow)}
            {slideOver.type === 'approval' && renderApprovalSlideOver(slideOver.data as ApprovalRequest)}
          </div>
        </div>
      )}
    </div>
  );
}
