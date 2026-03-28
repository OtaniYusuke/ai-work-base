import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  instances,
  workflows,
  workflowVersions,
  categories,
  users,
  getUserName,
  getAgentName,
  INSTANCE_STATUS_LABELS,
  INSTANCE_STATUS_COLORS,
  NODE_TYPE_COLORS,
  type ExecutionInstance,
  type WorkflowNode,
  type InstanceStatus,
} from '../data/mockData';

// Helper: get category path string e.g. "経理業務 > 見積・請求"
function getCategoryPath(categoryId: string): string {
  const cat = categories.find(c => c.id === categoryId);
  if (!cat) return '未分類';
  if (cat.parentId) {
    const parent = categories.find(c => c.id === cat.parentId);
    return parent ? `${parent.icon} ${parent.name} > ${cat.name}` : `${cat.icon} ${cat.name}`;
  }
  return `${cat.icon} ${cat.name}`;
}

// Helper: get current node from workflow version
function getCurrentNodeFromVersion(instance: ExecutionInstance): WorkflowNode | undefined {
  const version = workflowVersions.find(v => v.id === instance.versionId);
  if (!version) return undefined;
  return version.nodes.find(n => n.id === instance.currentNodeId);
}

// Helper: get assignee display name for a node
function getNodeAssignee(node: WorkflowNode | undefined): string {
  if (!node || !node.assignee) return '-';
  if (node.assigneeType === 'agent') return getAgentName(node.assignee);
  return getUserName(node.assignee);
}

// Helper: format time
function formatTime(dateStr: string): string {
  const parts = dateStr.split(' ');
  if (parts.length < 2) return dateStr;
  const datePart = parts[0];
  const timePart = parts[1];
  const today = '2026-03-23';
  if (datePart === today) return timePart;
  return `${datePart.slice(5)} ${timePart}`;
}

type TabType = 'active' | 'completed';

export default function OperationsHome() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [selectedInstance, setSelectedInstance] = useState<ExecutionInstance | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [startDropdownOpen, setStartDropdownOpen] = useState(false);

  // Split instances
  const activeStatuses: InstanceStatus[] = ['running', 'waiting_approval', 'waiting_human', 'exception'];
  const activeInstances = instances.filter(i => activeStatuses.includes(i.status));
  const completedInstances = instances.filter(i => i.status === 'completed' || i.status === 'stopped');

  const displayInstances = activeTab === 'active' ? activeInstances : completedInstances;

  // Summary counts
  const summaryCards = useMemo(() => [
    { label: '実行中', count: instances.filter(i => i.status === 'running').length, color: 'bg-blue-500', textColor: 'text-blue-700', bgLight: 'bg-blue-50' },
    { label: '承認待ち', count: instances.filter(i => i.status === 'waiting_approval').length, color: 'bg-yellow-500', textColor: 'text-yellow-700', bgLight: 'bg-yellow-50' },
    { label: '人間作業待ち', count: instances.filter(i => i.status === 'waiting_human').length, color: 'bg-purple-500', textColor: 'text-purple-700', bgLight: 'bg-purple-50' },
    { label: '例外発生', count: instances.filter(i => i.status === 'exception').length, color: 'bg-red-500', textColor: 'text-red-700', bgLight: 'bg-red-50' },
  ], []);

  // Group by category
  const groupedInstances = useMemo(() => {
    const groups: Record<string, { categoryPath: string; instances: ExecutionInstance[] }> = {};
    for (const inst of displayInstances) {
      const wf = workflows.find(w => w.id === inst.workflowId);
      const catId = wf?.categoryId ?? 'unknown';
      const catPath = wf ? getCategoryPath(wf.categoryId) : '未分類';
      if (!groups[catId]) {
        groups[catId] = { categoryPath: catPath, instances: [] };
      }
      groups[catId].instances.push(inst);
    }
    return Object.values(groups);
  }, [displayInstances]);

  // Production workflows for manual start
  const productionWorkflows = workflows.filter(w => w.status === 'production' && !w.isTemplate && w.triggerType === 'manual');

  const openPanel = (inst: ExecutionInstance) => {
    setSelectedInstance(inst);
    setPanelOpen(true);
  };

  const closePanel = () => {
    setPanelOpen(false);
    setSelectedInstance(null);
  };

  // Get workflow info for selected instance
  const selectedWf = selectedInstance ? workflows.find(w => w.id === selectedInstance.workflowId) : null;
  const selectedVersion = selectedInstance ? workflowVersions.find(v => v.id === selectedInstance.versionId) : null;
  const selectedCurrentNode = selectedInstance ? getCurrentNodeFromVersion(selectedInstance) : undefined;
  const isAssignee = selectedCurrentNode?.assignee === currentUser?.id;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">稼働状況</h1>
          <p className="text-sm text-gray-500 mt-1">稼働中のフローとアクション待ちの一覧</p>
        </div>
        <div className="relative">
          <button
            onClick={() => setStartDropdownOpen(!startDropdownOpen)}
            className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            + 新規実行
          </button>
          {startDropdownOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border z-50">
              <div className="p-2">
                <div className="text-xs text-gray-500 px-3 py-1 font-medium">本番稼働中のワークフロー</div>
                {productionWorkflows.length === 0 && (
                  <div className="px-3 py-2 text-sm text-gray-400">手動実行可能なフローがありません</div>
                )}
                {productionWorkflows.map(wf => (
                  <button
                    key={wf.id}
                    onClick={() => {
                      setStartDropdownOpen(false);
                      alert(`「${wf.name}」を実行開始します（モック）`);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 rounded flex items-center gap-2"
                  >
                    <span className="text-cyan-600">▶</span>
                    <div>
                      <div className="font-medium text-gray-800">{wf.name}</div>
                      <div className="text-xs text-gray-400">{getCategoryPath(wf.categoryId)}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {summaryCards.map(card => (
          <div key={card.label} className={`${card.bgLight} rounded-lg p-4 border`}>
            <div className="text-sm text-gray-600">{card.label}</div>
            <div className={`text-3xl font-bold ${card.textColor} mt-1`}>{card.count}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'active'
              ? 'border-cyan-500 text-cyan-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          稼働中 ({activeInstances.length})
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'completed'
              ? 'border-cyan-500 text-cyan-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          完了済み ({completedInstances.length})
        </button>
      </div>

      {/* Grouped Instances */}
      <div className="space-y-6">
        {groupedInstances.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            {activeTab === 'active' ? '稼働中のフローはありません' : '完了済みのフローはありません'}
          </div>
        )}
        {groupedInstances.map(group => (
          <div key={group.categoryPath}>
            <h3 className="text-sm font-semibold text-gray-500 mb-2">{group.categoryPath}</h3>
            <div className="bg-white rounded-lg border shadow-sm divide-y">
              {group.instances.map(inst => {
                const wf = workflows.find(w => w.id === inst.workflowId);
                const currentNode = getCurrentNodeFromVersion(inst);
                const assigneeName = getNodeAssignee(currentNode);
                const hasPendingForMe = inst.pendingAction?.assigneeId === currentUser?.id;

                return (
                  <div
                    key={inst.id}
                    onClick={() => openPanel(inst)}
                    className={`flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                      hasPendingForMe ? 'bg-cyan-50 border-l-4 border-l-cyan-500' : ''
                    }`}
                  >
                    {/* Status badge */}
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${INSTANCE_STATUS_COLORS[inst.status]}`}>
                      {INSTANCE_STATUS_LABELS[inst.status]}
                    </span>

                    {/* Workflow name + instance ID */}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {wf?.name ?? inst.workflowId}
                        <span className="text-gray-400 font-normal ml-2">#{inst.id}</span>
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-3 mt-0.5">
                        <span>
                          現在: <span className="font-medium text-gray-700">{inst.currentNode}</span>
                        </span>
                        <span>
                          担当: <span className="font-medium text-gray-700">{assigneeName}</span>
                        </span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="w-24 flex-shrink-0">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                          <div
                            className="bg-cyan-500 h-1.5 rounded-full transition-all"
                            style={{ width: `${inst.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-8 text-right">{inst.progress}%</span>
                      </div>
                    </div>

                    {/* Started time */}
                    <div className="text-xs text-gray-400 whitespace-nowrap w-20 text-right">
                      {formatTime(inst.startedAt)}
                    </div>

                    {/* Pending action indicator */}
                    {hasPendingForMe && (
                      <span className="flex-shrink-0 bg-cyan-600 text-white text-xs px-2 py-1 rounded font-medium">
                        要対応
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Click to close dropdown overlay */}
      {startDropdownOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setStartDropdownOpen(false)} />
      )}

      {/* Slide-over Panel */}
      {panelOpen && selectedInstance && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/30 z-40" onClick={closePanel} />

          {/* Panel */}
          <div className="fixed inset-y-0 right-0 w-[480px] bg-white shadow-2xl z-50 flex flex-col">
            {/* Panel Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{selectedWf?.name}</h2>
                <span className="text-sm text-gray-500">#{selectedInstance.id}</span>
              </div>
              <button
                onClick={closePanel}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                &times;
              </button>
            </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Status & Progress */}
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center px-2.5 py-1 rounded text-sm font-medium ${INSTANCE_STATUS_COLORS[selectedInstance.status]}`}>
                  {INSTANCE_STATUS_LABELS[selectedInstance.status]}
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-cyan-500 h-2 rounded-full"
                        style={{ width: `${selectedInstance.progress}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 font-medium">{selectedInstance.progress}%</span>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-50 rounded p-3">
                  <div className="text-gray-500 text-xs">開始日時</div>
                  <div className="font-medium text-gray-800">{selectedInstance.startedAt}</div>
                </div>
                <div className="bg-gray-50 rounded p-3">
                  <div className="text-gray-500 text-xs">開始者</div>
                  <div className="font-medium text-gray-800">{getUserName(selectedInstance.startedBy)}</div>
                </div>
                <div className="bg-gray-50 rounded p-3">
                  <div className="text-gray-500 text-xs">現在のノード</div>
                  <div className="font-medium text-gray-800">{selectedInstance.currentNode}</div>
                </div>
                <div className="bg-gray-50 rounded p-3">
                  <div className="text-gray-500 text-xs">担当</div>
                  <div className="font-medium text-gray-800">{getNodeAssignee(selectedCurrentNode)}</div>
                </div>
                {selectedInstance.endedAt && (
                  <div className="bg-gray-50 rounded p-3 col-span-2">
                    <div className="text-gray-500 text-xs">完了日時</div>
                    <div className="font-medium text-gray-800">{selectedInstance.endedAt}</div>
                  </div>
                )}
              </div>

              {/* Mini Flow Diagram */}
              {selectedVersion && selectedVersion.nodes.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">フロー進捗</h4>
                  <div className="bg-gray-50 rounded-lg p-3 overflow-x-auto">
                    <div className="flex items-center gap-1 min-w-0">
                      {selectedVersion.nodes
                        .sort((a, b) => a.x - b.x)
                        .map((node, idx, arr) => {
                          const isCurrent = node.id === selectedInstance.currentNodeId;
                          const isPast = node.x < (selectedVersion.nodes.find(n => n.id === selectedInstance.currentNodeId)?.x ?? 0);
                          const nodeColor = NODE_TYPE_COLORS[node.type];
                          return (
                            <div key={node.id} className="flex items-center gap-1 flex-shrink-0">
                              <div className="flex flex-col items-center">
                                <div
                                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                                    isCurrent
                                      ? 'ring-2 ring-cyan-400 ring-offset-1'
                                      : ''
                                  }`}
                                  style={{
                                    backgroundColor: isPast || isCurrent ? nodeColor : '#e5e7eb',
                                    borderColor: nodeColor,
                                    color: isPast || isCurrent ? 'white' : '#9ca3af',
                                  }}
                                  title={`${node.name}${node.assignee ? ` (${node.assigneeType === 'agent' ? getAgentName(node.assignee) : getUserName(node.assignee)})` : ''}`}
                                >
                                  {idx + 1}
                                </div>
                                <div className={`text-[10px] mt-1 text-center w-16 truncate ${isCurrent ? 'text-cyan-700 font-bold' : 'text-gray-500'}`}>
                                  {node.name}
                                </div>
                                {node.assignee && (
                                  <div className="text-[9px] text-gray-400 truncate w-16 text-center">
                                    {node.assigneeType === 'agent' ? getAgentName(node.assignee) : getUserName(node.assignee)}
                                  </div>
                                )}
                              </div>
                              {idx < arr.length - 1 && (
                                <div className={`w-4 h-0.5 flex-shrink-0 ${isPast ? 'bg-cyan-400' : 'bg-gray-300'}`} />
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              )}

              {/* Pending Action highlight */}
              {selectedInstance.pendingAction && (
                <div className={`rounded-lg p-3 border ${
                  selectedInstance.pendingAction.assigneeId === currentUser?.id
                    ? 'bg-cyan-50 border-cyan-200'
                    : 'bg-yellow-50 border-yellow-200'
                }`}>
                  <div className="text-xs text-gray-500 mb-1">アクション待ち</div>
                  <div className="text-sm font-medium text-gray-800">
                    {selectedInstance.pendingAction.label}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    担当: {getUserName(selectedInstance.pendingAction.assigneeId)}
                    {selectedInstance.pendingAction.assigneeId === currentUser?.id && (
                      <span className="ml-2 text-cyan-600 font-semibold">（あなた）</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Panel Actions */}
            <div className="border-t px-6 py-4 space-y-2 bg-gray-50">
              {/* Context-dependent actions */}
              {isAssignee && selectedInstance.status === 'waiting_approval' && (
                <button
                  onClick={() => alert('承認処理を実行します（モック）')}
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  承認する
                </button>
              )}
              {isAssignee && selectedInstance.status === 'waiting_human' && (
                <button
                  onClick={() => alert('タスクを実行します（モック）')}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  実行する / 完了報告
                </button>
              )}
              {isAssignee && selectedInstance.status === 'exception' && (
                <button
                  onClick={() => alert('例外対応を開始します（モック）')}
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  例外対応する
                </button>
              )}

              {/* Navigation actions */}
              <button
                onClick={() => { closePanel(); navigate(`/instances/${selectedInstance.id}`); }}
                className="w-full bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                フロー詳細を見る
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => { closePanel(); navigate(`/workflows/${selectedInstance.workflowId}/edit`); }}
                  className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 py-2 rounded-lg text-sm transition-colors"
                >
                  ワークフローを編集
                </button>
                <button
                  onClick={() => { closePanel(); navigate(`/instances/${selectedInstance.id}`); }}
                  className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 py-2 rounded-lg text-sm transition-colors"
                >
                  作業ログを見る
                </button>
              </div>

              {/* Stop / Resume */}
              {(selectedInstance.status === 'running' || selectedInstance.status === 'waiting_approval' || selectedInstance.status === 'waiting_human') && (
                <button
                  onClick={() => alert('停止依頼を送信します（モック）')}
                  className="w-full bg-white border border-red-300 hover:bg-red-50 text-red-600 py-2 rounded-lg text-sm transition-colors"
                >
                  停止依頼
                </button>
              )}
              {selectedInstance.status === 'stopped' && (
                <button
                  onClick={() => alert('再開依頼を送信します（モック）')}
                  className="w-full bg-white border border-green-300 hover:bg-green-50 text-green-600 py-2 rounded-lg text-sm transition-colors"
                >
                  再開依頼
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
