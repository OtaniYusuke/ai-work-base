import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  workflows,
  workflowVersions,
  users,
  aiAgents,
  dataSources,
  categories,
  NODE_TYPE_LABELS,
  NODE_TYPE_COLORS,
  TRIGGER_LABELS,
  getUserName,
  getAgentName,
  WorkflowNode,
  WorkflowEdge,
  NodeType,
  TriggerType,
} from '../data/mockData';
import AIChat from './AIChat';

const NODE_PALETTE: { type: NodeType; label: string }[] = [
  { type: 'start', label: '開始' },
  { type: 'end', label: '終了' },
  { type: 'ai_exec', label: 'AI実行' },
  { type: 'human_task', label: '人間タスク' },
  { type: 'approval', label: '承認' },
  { type: 'condition', label: '条件分岐' },
  { type: 'notification', label: '通知' },
  { type: 'api_exec', label: 'API実行' },
  { type: 'pc_operation', label: 'PC操作' },
  { type: 'exception', label: '例外発火' },
];

const DEFAULT_NEW_NODES: WorkflowNode[] = [
  { id: 'n1', type: 'start', name: '開始', x: 100, y: 250 },
  { id: 'n2', type: 'end', name: '終了', x: 500, y: 250 },
];
const DEFAULT_NEW_EDGES: WorkflowEdge[] = [
  { id: 'e1', from: 'n1', to: 'n2' },
];

const NODE_WIDTH = 160;
const NODE_HEIGHT = 70;
const HEADER_H = 32;

const TRIGGER_OPTIONS: { value: TriggerType; label: string }[] = [
  { value: 'manual', label: '手動' },
  { value: 'scheduled', label: 'スケジュール' },
  { value: 'event', label: 'イベント' },
  { value: 'api', label: 'API' },
];

function getAssigneeLabel(node: WorkflowNode): string {
  if (!node.assignee || !node.assigneeType) return '-';
  if (node.assigneeType === 'agent') return `AI: ${getAgentName(node.assignee)}`;
  return getUserName(node.assignee);
}

function getCategoryOptions() {
  const parents = categories.filter((c) => c.parentId === null);
  const result: { id: string; label: string }[] = [];
  parents.forEach((p) => {
    result.push({ id: p.id, label: `${p.icon} ${p.name}` });
    const children = categories.filter((c) => c.parentId === p.id);
    children.forEach((ch) => {
      result.push({ id: ch.id, label: `  ${ch.icon} ${p.name} > ${ch.name}` });
    });
  });
  return result;
}

export default function WorkflowEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';

  const workflow = isNew ? null : workflows.find((w) => w.id === id);
  const latestVersion = isNew
    ? null
    : workflowVersions
        .filter((v) => v.workflowId === id)
        .sort((a, b) => b.versionNo - a.versionNo)[0];

  const [workflowName, setWorkflowName] = useState(workflow?.name ?? '新規ワークフロー');
  const [triggerType, setTriggerType] = useState<TriggerType>(workflow?.triggerType ?? 'manual');
  const [triggerConfig, setTriggerConfig] = useState(workflow?.triggerConfig ?? '');
  const [categoryId, setCategoryId] = useState(workflow?.categoryId ?? '');
  const [nodes, setNodes] = useState<WorkflowNode[]>(
    latestVersion?.nodes.length ? latestVersion.nodes : DEFAULT_NEW_NODES
  );
  const [edges, setEdges] = useState<WorkflowEdge[]>(
    latestVersion?.edges.length ? latestVersion.edges : DEFAULT_NEW_EDGES
  );
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId]
  );

  const categoryOptions = useMemo(() => getCategoryOptions(), []);

  // --- helpers ---
  const updateNodeField = (field: string, value: unknown) => {
    if (!selectedNodeId) return;
    setNodes((prev) =>
      prev.map((n) => {
        if (n.id !== selectedNodeId) return n;
        if (field === 'name') return { ...n, name: value as string };
        if (field === 'assignee') return { ...n, assignee: value as string };
        if (field === 'assigneeType') return { ...n, assigneeType: value as 'user' | 'agent' };
        return { ...n, config: { ...n.config, [field]: value } };
      })
    );
  };

  const updateAssignee = (assignee: string, assigneeType: 'user' | 'agent') => {
    if (!selectedNodeId) return;
    setNodes((prev) =>
      prev.map((n) => {
        if (n.id !== selectedNodeId) return n;
        return { ...n, assignee, assigneeType };
      })
    );
  };

  const handleSave = () => {
    alert(`ワークフロー「${workflowName}」を保存しました（モック）`);
  };

  // --- SVG helpers ---
  const getNodeCenter = (node: WorkflowNode) => ({
    cx: node.x + NODE_WIDTH / 2,
    cy: node.y + NODE_HEIGHT / 2,
  });

  const svgWidth = useMemo(() => {
    const maxX = Math.max(...nodes.map((n) => n.x + NODE_WIDTH));
    return Math.max(maxX + 80, 800);
  }, [nodes]);

  const svgHeight = useMemo(() => {
    const maxY = Math.max(...nodes.map((n) => n.y + NODE_HEIGHT));
    return Math.max(maxY + 80, 500);
  }, [nodes]);

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      {/* Top bar */}
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-gray-200 bg-white px-4 py-2 shadow-sm">
        <button
          onClick={() => navigate(isNew ? '/workflows' : `/workflows/${id}`)}
          className="rounded px-2 py-1 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700"
        >
          &larr; 戻る
        </button>
        <input
          type="text"
          value={workflowName}
          onChange={(e) => setWorkflowName(e.target.value)}
          className="max-w-md flex-1 rounded border border-gray-300 px-3 py-1 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {/* Category selector */}
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">カテゴリ選択</option>
          {categoryOptions.map((opt) => (
            <option key={opt.id} value={opt.id}>{opt.label}</option>
          ))}
        </select>

        {/* Trigger type */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-gray-500">トリガー:</span>
          <select
            value={triggerType}
            onChange={(e) => setTriggerType(e.target.value as TriggerType)}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {TRIGGER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {(triggerType === 'scheduled' || triggerType === 'event') && (
            <input
              type="text"
              value={triggerConfig}
              onChange={(e) => setTriggerConfig(e.target.value)}
              placeholder={triggerType === 'scheduled' ? '例: 毎月1日 9:00' : '例: メール受信時'}
              className="w-44 rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={handleSave}
            className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            保存
          </button>
          <button
            onClick={() => setChatOpen(true)}
            className="flex items-center gap-1 rounded bg-purple-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-purple-700"
          >
            AIに相談
          </button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel: Node palette */}
        <div className="w-48 shrink-0 overflow-y-auto border-r border-gray-200 bg-white p-3">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">ノードパレット</h3>
          <div className="space-y-1.5">
            {NODE_PALETTE.map(({ type, label }) => (
              <div
                key={type}
                draggable
                className="flex cursor-grab items-center gap-2 rounded border border-gray-200 bg-white px-3 py-2 text-sm transition-all hover:border-gray-400 hover:shadow-sm"
              >
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: NODE_TYPE_COLORS[type] }}
                />
                <span className="text-gray-700">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Center: Canvas */}
        <div className="relative flex-1 overflow-auto bg-gray-100">
          <svg
            width={svgWidth}
            height={svgHeight}
            className="min-h-full min-w-full"
            onClick={() => setSelectedNodeId(null)}
          >
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="10"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="#6b7280" />
              </marker>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e5e7eb" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* Edges */}
            {edges.map((edge) => {
              const fromNode = nodes.find((n) => n.id === edge.from);
              const toNode = nodes.find((n) => n.id === edge.to);
              if (!fromNode || !toNode) return null;
              const from = getNodeCenter(fromNode);
              const to = getNodeCenter(toNode);
              const midX = (from.cx + to.cx) / 2;
              const midY = (from.cy + to.cy) / 2;
              return (
                <g key={edge.id}>
                  <line
                    x1={from.cx}
                    y1={from.cy}
                    x2={to.cx}
                    y2={to.cy}
                    stroke="#6b7280"
                    strokeWidth={1.5}
                    markerEnd="url(#arrowhead)"
                  />
                  {edge.label && (
                    <text
                      x={midX}
                      y={midY - 8}
                      textAnchor="middle"
                      className="text-xs"
                      fill="#6b7280"
                      fontSize={11}
                    >
                      {edge.label}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Nodes */}
            {nodes.map((node) => {
              const isSelected = node.id === selectedNodeId;
              const color = NODE_TYPE_COLORS[node.type];
              const assigneeLabel = getAssigneeLabel(node);
              const isAgent = node.assigneeType === 'agent';
              return (
                <g
                  key={node.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedNodeId(node.id);
                  }}
                  className="cursor-pointer"
                >
                  {/* Selection highlight */}
                  {isSelected && (
                    <rect
                      x={node.x - 3}
                      y={node.y - 3}
                      width={NODE_WIDTH + 6}
                      height={NODE_HEIGHT + 6}
                      rx={11}
                      ry={11}
                      fill="none"
                      stroke="#2563eb"
                      strokeWidth={3}
                      strokeDasharray="6 3"
                    />
                  )}
                  {/* Body */}
                  <rect
                    x={node.x}
                    y={node.y}
                    width={NODE_WIDTH}
                    height={NODE_HEIGHT}
                    rx={8}
                    ry={8}
                    fill="#ffffff"
                    stroke={isSelected ? '#2563eb' : color}
                    strokeWidth={2}
                  />
                  {/* Header bg */}
                  <rect
                    x={node.x}
                    y={node.y}
                    width={NODE_WIDTH}
                    height={HEADER_H}
                    rx={8}
                    ry={8}
                    fill={color}
                  />
                  <rect
                    x={node.x}
                    y={node.y + HEADER_H - 8}
                    width={NODE_WIDTH}
                    height={8}
                    fill={color}
                  />
                  {/* Node name */}
                  <text
                    x={node.x + NODE_WIDTH / 2}
                    y={node.y + HEADER_H / 2 + 1}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#ffffff"
                    fontSize={11}
                    fontWeight={600}
                  >
                    {node.name}
                  </text>
                  {/* Assignee */}
                  <text
                    x={node.x + NODE_WIDTH / 2}
                    y={node.y + HEADER_H + (NODE_HEIGHT - HEADER_H) / 2 + 1}
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
        </div>

        {/* Right panel: Properties + AI Chat */}
        <div className="flex w-80 shrink-0 flex-col overflow-hidden border-l border-gray-200 bg-white">
          {chatOpen ? (
            <AIChat isOpen={chatOpen} onClose={() => setChatOpen(false)} />
          ) : selectedNode ? (
            <NodeProperties
              node={selectedNode}
              onUpdate={updateNodeField}
              onUpdateAssignee={updateAssignee}
              nodes={nodes}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-gray-400">
              ノードを選択してプロパティを編集するか、「AIに相談」でフロー設計の支援を受けられます
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Node Properties Panel ---

function NodeProperties({
  node,
  onUpdate,
  onUpdateAssignee,
  nodes,
}: {
  node: WorkflowNode;
  onUpdate: (field: string, value: unknown) => void;
  onUpdateAssignee: (assignee: string, assigneeType: 'user' | 'agent') => void;
  nodes: WorkflowNode[];
}) {
  const config = node.config ?? {};
  const color = NODE_TYPE_COLORS[node.type];
  const otherNodes = nodes.filter((n) => n.id !== node.id);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="border-b border-gray-200 px-4 py-3" style={{ borderLeftColor: color, borderLeftWidth: 4 }}>
        <h3 className="text-sm font-semibold text-gray-800">ノード設定</h3>
        <span className="text-xs text-gray-500">{NODE_TYPE_LABELS[node.type]}</span>
      </div>

      <div className="space-y-4 p-4">
        {/* Common: name */}
        <Field label="ノード名">
          <input
            type="text"
            value={node.name}
            onChange={(e) => onUpdate('name', e.target.value)}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </Field>

        {/* Current assignee display */}
        {(node.assignee || node.type === 'ai_exec' || node.type === 'human_task' || node.type === 'approval') && (
          <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
            <span className="text-xs font-medium text-gray-500">現在の担当者</span>
            <p className="mt-0.5 text-sm font-medium text-gray-800">
              {node.assignee && node.assigneeType
                ? node.assigneeType === 'agent'
                  ? `AI: ${getAgentName(node.assignee)}`
                  : getUserName(node.assignee)
                : '未設定'}
            </p>
          </div>
        )}

        {/* Type-specific fields */}
        {node.type === 'ai_exec' && (
          <>
            <Field label="使用AIエージェント">
              <select
                value={node.assignee ?? (config.agentId as string) ?? ''}
                onChange={(e) => {
                  const agentId = e.target.value;
                  onUpdate('agentId', agentId);
                  if (agentId) {
                    onUpdateAssignee(agentId, 'agent');
                  }
                }}
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">選択してください</option>
                {aiAgents.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </Field>
            <Field label="指示文">
              <textarea
                value={(config.instruction as string) ?? ''}
                onChange={(e) => onUpdate('instruction', e.target.value)}
                rows={3}
                className="w-full resize-y rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </Field>
            <Field label="参照データ元本">
              <select
                value={(config.dataSourceId as string) ?? ''}
                onChange={(e) => onUpdate('dataSourceId', e.target.value)}
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">なし</option>
                {dataSources.map((ds) => (
                  <option key={ds.id} value={ds.id}>{ds.name}</option>
                ))}
              </select>
            </Field>
            <Field label="成功時遷移先">
              <select
                value={(config.successTarget as string) ?? ''}
                onChange={(e) => onUpdate('successTarget', e.target.value)}
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">選択してください</option>
                {otherNodes.map((n) => (
                  <option key={n.id} value={n.id}>{n.name}</option>
                ))}
              </select>
            </Field>
            <Field label="失敗時遷移先">
              <select
                value={(config.failureTarget as string) ?? ''}
                onChange={(e) => onUpdate('failureTarget', e.target.value)}
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">選択してください</option>
                {otherNodes.map((n) => (
                  <option key={n.id} value={n.id}>{n.name}</option>
                ))}
              </select>
            </Field>
          </>
        )}

        {node.type === 'human_task' && (
          <>
            <Field label="担当者">
              <select
                value={node.assignee ?? (config.assignee as string) ?? ''}
                onChange={(e) => {
                  const userId = e.target.value;
                  onUpdate('assignee', userId);
                  if (userId) {
                    onUpdateAssignee(userId, 'user');
                  }
                }}
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">選択してください</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}（{u.department}）</option>
                ))}
              </select>
            </Field>
            <Field label="作業内容">
              <textarea
                value={(config.description as string) ?? ''}
                onChange={(e) => onUpdate('description', e.target.value)}
                rows={3}
                className="w-full resize-y rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </Field>
            <Field label="完了条件">
              <input
                type="text"
                value={(config.completionCriteria as string) ?? ''}
                onChange={(e) => onUpdate('completionCriteria', e.target.value)}
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </Field>
            <Field label="期限">
              <input
                type="text"
                value={(config.deadline as string) ?? ''}
                onChange={(e) => onUpdate('deadline', e.target.value)}
                placeholder="例: 2日以内"
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </Field>
          </>
        )}

        {node.type === 'approval' && (
          <>
            <Field label="承認種別">
              <select
                value={(config.approvalType as string) ?? ''}
                onChange={(e) => onUpdate('approvalType', e.target.value)}
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">選択してください</option>
                <option value="業務承認">業務承認</option>
                <option value="変更承認">変更承認</option>
                <option value="AI能力変更承認">AI能力変更承認</option>
                <option value="稼働停止承認">稼働停止承認</option>
              </select>
            </Field>
            <Field label="承認者">
              <select
                value={node.assignee ?? (config.approver as string) ?? ''}
                onChange={(e) => {
                  const userId = e.target.value;
                  onUpdate('approver', userId);
                  if (userId) {
                    onUpdateAssignee(userId, 'user');
                  }
                }}
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">選択してください</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}（{u.department}）</option>
                ))}
              </select>
            </Field>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={!!config.allowReturn}
                  onChange={(e) => onUpdate('allowReturn', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                差し戻し可否
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={!!config.commentRequired}
                  onChange={(e) => onUpdate('commentRequired', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                コメント必須
              </label>
            </div>
          </>
        )}

        {node.type === 'condition' && (
          <Field label="分岐条件">
            <textarea
              value={(config.condition as string) ?? ''}
              onChange={(e) => onUpdate('condition', e.target.value)}
              rows={2}
              placeholder="例: リスクスコア > 70"
              className="w-full resize-y rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </Field>
        )}

        {node.type === 'notification' && (
          <>
            <Field label="通知先">
              <input
                type="text"
                value={(config.to as string) ?? ''}
                onChange={(e) => onUpdate('to', e.target.value)}
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </Field>
            <Field label="メッセージ">
              <textarea
                value={(config.message as string) ?? ''}
                onChange={(e) => onUpdate('message', e.target.value)}
                rows={2}
                className="w-full resize-y rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </Field>
          </>
        )}

        {node.type === 'api_exec' && (
          <>
            <Field label="エンドポイントURL">
              <input
                type="text"
                value={(config.url as string) ?? ''}
                onChange={(e) => onUpdate('url', e.target.value)}
                placeholder="https://..."
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </Field>
            <Field label="メソッド">
              <select
                value={(config.method as string) ?? 'GET'}
                onChange={(e) => onUpdate('method', e.target.value)}
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>
            </Field>
          </>
        )}

        {node.type === 'pc_operation' && (
          <>
            <Field label="操作対象アプリ">
              <input
                type="text"
                value={(config.targetApp as string) ?? ''}
                onChange={(e) => onUpdate('targetApp', e.target.value)}
                placeholder="例: Excel, ブラウザ"
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </Field>
            <Field label="操作内容">
              <textarea
                value={(config.operation as string) ?? ''}
                onChange={(e) => onUpdate('operation', e.target.value)}
                rows={2}
                className="w-full resize-y rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </Field>
          </>
        )}

        {node.type === 'exception' && (
          <Field label="例外メッセージ">
            <textarea
              value={(config.errorMessage as string) ?? ''}
              onChange={(e) => onUpdate('errorMessage', e.target.value)}
              rows={2}
              placeholder="例外発生時のメッセージ"
              className="w-full resize-y rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </Field>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-600">{label}</label>
      {children}
    </div>
  );
}
