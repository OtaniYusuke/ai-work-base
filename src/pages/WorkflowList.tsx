import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  categories,
  workflows,
  workflowVersions,
  WF_STATUS_LABELS,
  WF_STATUS_COLORS,
  TRIGGER_LABELS,
  getUserName,
  NODE_TYPE_COLORS,
  WorkflowNode,
  WorkflowEdge,
  Workflow,
  BusinessCategory,
} from '../data/mockData';

// ---------------------
// Mini flow diagram preview
// ---------------------
function MiniFlowDiagram({ nodes, edges }: { nodes: WorkflowNode[]; edges: WorkflowEdge[] }) {
  if (nodes.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-400">
        フロー未定義
      </div>
    );
  }

  const xs = nodes.map((n) => n.x);
  const ys = nodes.map((n) => n.y);
  const minX = Math.min(...xs) - 30;
  const maxX = Math.max(...xs) + 30;
  const minY = Math.min(...ys) - 30;
  const maxY = Math.max(...ys) + 30;
  const vw = maxX - minX + 60;
  const vh = maxY - minY + 60;

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  return (
    <svg viewBox={`${minX} ${minY} ${vw} ${vh}`} className="h-36 w-full rounded border border-gray-200 bg-white">
      <defs>
        <marker id="mini-arrow" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#94a3b8" />
        </marker>
      </defs>
      {edges.map((e) => {
        const from = nodeMap.get(e.from);
        const to = nodeMap.get(e.to);
        if (!from || !to) return null;
        return (
          <line
            key={e.id}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke="#94a3b8"
            strokeWidth={2}
            markerEnd="url(#mini-arrow)"
          />
        );
      })}
      {nodes.map((n) => (
        <g key={n.id}>
          <circle cx={n.x} cy={n.y} r={14} fill={NODE_TYPE_COLORS[n.type]} opacity={0.85} />
          <text x={n.x} y={n.y + 28} textAnchor="middle" fontSize={10} fill="#475569">
            {n.name.length > 6 ? n.name.slice(0, 6) + '..' : n.name}
          </text>
        </g>
      ))}
    </svg>
  );
}

// ---------------------
// Category tree helpers
// ---------------------
function getChildCategories(parentId: string | null): BusinessCategory[] {
  return categories.filter((c) => c.parentId === parentId);
}

function countWorkflows(categoryId: string | null, list: Workflow[]): number {
  if (categoryId === null) return list.length;
  const childIds = categories.filter((c) => c.parentId === categoryId).map((c) => c.id);
  const allIds = [categoryId, ...childIds];
  return list.filter((w) => allIds.includes(w.categoryId)).length;
}

function CategoryTreeItem({
  cat,
  selected,
  onSelect,
  filteredWorkflows,
}: {
  cat: BusinessCategory;
  selected: string | null;
  onSelect: (id: string) => void;
  filteredWorkflows: Workflow[];
}) {
  const children = getChildCategories(cat.id);
  const count = countWorkflows(cat.id, filteredWorkflows);
  const isSelected = selected === cat.id;

  return (
    <div>
      <button
        onClick={() => onSelect(cat.id)}
        className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${
          isSelected ? 'bg-blue-50 font-semibold text-blue-700' : 'text-gray-700 hover:bg-gray-100'
        }`}
      >
        <span>
          {cat.icon} {cat.name}
        </span>
        <span className="min-w-[1.5rem] rounded-full bg-gray-200 px-1.5 py-0.5 text-center text-xs text-gray-600">
          {count}
        </span>
      </button>
      {children.length > 0 && (
        <div className="ml-4 border-l border-gray-200 pl-2">
          {children.map((child) => (
            <CategoryTreeItem
              key={child.id}
              cat={child}
              selected={selected}
              onSelect={onSelect}
              filteredWorkflows={filteredWorkflows}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------
// Action panel (slide-over)
// ---------------------
function ActionPanel({
  workflow,
  onClose,
}: {
  workflow: Workflow;
  onClose: () => void;
}) {
  const version = workflowVersions.find(
    (v) => v.workflowId === workflow.id && v.versionNo === workflow.currentVersion
  );
  const nodes = version?.nodes ?? [];
  const edges = version?.edges ?? [];
  const category = categories.find((c) => c.id === workflow.categoryId);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      {/* panel */}
      <div className="relative z-10 flex w-full max-w-lg flex-col overflow-y-auto bg-white shadow-xl">
        {/* header */}
        <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-gray-900">{workflow.name}</h2>
            <p className="text-sm text-gray-500">{category ? `${category.icon} ${category.name}` : ''}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="閉じる"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* summary */}
        <div className="space-y-4 border-b border-gray-200 px-6 py-4">
          <p className="text-sm text-gray-700">{workflow.description}</p>
          <div className="flex flex-wrap gap-2">
            <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${WF_STATUS_COLORS[workflow.status]}`}>
              {WF_STATUS_LABELS[workflow.status]}
            </span>
            {workflow.isTemplate && (
              <span className="inline-block rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                テンプレート
              </span>
            )}
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div>
              <dt className="text-gray-500">トリガー</dt>
              <dd className="font-medium text-gray-800">{TRIGGER_LABELS[workflow.triggerType]}</dd>
            </div>
            <div>
              <dt className="text-gray-500">オーナー</dt>
              <dd className="font-medium text-gray-800">{getUserName(workflow.ownerId)}</dd>
            </div>
            <div>
              <dt className="text-gray-500">バージョン</dt>
              <dd className="font-medium text-gray-800">v{workflow.currentVersion}</dd>
            </div>
            <div>
              <dt className="text-gray-500">更新日</dt>
              <dd className="font-medium text-gray-800">{workflow.updatedAt}</dd>
            </div>
          </dl>
        </div>

        {/* mini flow diagram */}
        <div className="border-b border-gray-200 px-6 py-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">フロー図プレビュー</h3>
          <MiniFlowDiagram nodes={nodes} edges={edges} />
        </div>

        {/* actions */}
        <div className="flex-1 px-6 py-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">アクション</h3>
          <div className="space-y-1">
            <ActionLink to={`/workflows/${workflow.id}`} label="詳細を見る" icon="eye" />
            <ActionLink to={`/workflows/${workflow.id}/edit`} label="編集する" icon="pencil" />
            <ActionButton
              label="複製する"
              icon="copy"
              onClick={() => alert(`「${workflow.name}」を複製しました`)}
            />
            <ActionButton
              label="テンプレート化"
              icon="template"
              onClick={() => alert(`「${workflow.name}」をテンプレート化しました`)}
            />
            {workflow.status === 'production' && workflow.triggerType === 'manual' && (
              <ActionButton
                label="実行する"
                icon="play"
                onClick={() => alert('実行を開始しました')}
                accent
              />
            )}
            <ActionLink to={`/workflows/${workflow.id}/versions`} label="バージョン管理" icon="history" />
            {(workflow.status === 'draft' || workflow.status === 'testing') && (
              <ActionButton
                label="本番申請"
                icon="upload"
                onClick={() => alert(`「${workflow.name}」の本番申請を送信しました`)}
              />
            )}
            {workflow.status === 'production' && (
              <ActionButton
                label="停止する"
                icon="stop"
                onClick={() => alert(`「${workflow.name}」を停止しました`)}
                danger
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// action helper components
function ActionLink({ to, label, icon }: { to: string; label: string; icon: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-100"
    >
      <ActionIcon name={icon} />
      {label}
    </Link>
  );
}

function ActionButton({
  label,
  icon,
  onClick,
  accent,
  danger,
}: {
  label: string;
  icon: string;
  onClick: () => void;
  accent?: boolean;
  danger?: boolean;
}) {
  let cls = 'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm w-full text-left hover:bg-gray-100 text-gray-700';
  if (accent) cls = cls.replace('text-gray-700', 'text-blue-700 font-medium');
  if (danger) cls = cls.replace('text-gray-700', 'text-red-600 font-medium');
  return (
    <button onClick={onClick} className={cls}>
      <ActionIcon name={icon} accent={accent} danger={danger} />
      {label}
    </button>
  );
}

function ActionIcon({ name, accent, danger }: { name: string; accent?: boolean; danger?: boolean }) {
  const color = danger ? 'text-red-500' : accent ? 'text-blue-500' : 'text-gray-400';
  const icons: Record<string, React.ReactNode> = {
    eye: (
      <svg className={`h-4 w-4 ${color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
    pencil: (
      <svg className={`h-4 w-4 ${color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
    copy: (
      <svg className={`h-4 w-4 ${color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
    template: (
      <svg className={`h-4 w-4 ${color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 8a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zm10 0a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1h-4a1 1 0 01-1-1v-6z" />
      </svg>
    ),
    play: (
      <svg className={`h-4 w-4 ${color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    history: (
      <svg className={`h-4 w-4 ${color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    upload: (
      <svg className={`h-4 w-4 ${color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
      </svg>
    ),
    stop: (
      <svg className={`h-4 w-4 ${color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
      </svg>
    ),
  };
  return icons[name] ?? null;
}

// ---------------------
// Main component
// ---------------------
type TabKey = 'active' | 'all';

export default function WorkflowList() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('active');
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  // filter by category (include children)
  const categoryFiltered = selectedCategory
    ? (() => {
        const childIds = categories.filter((c) => c.parentId === selectedCategory).map((c) => c.id);
        const allIds = [selectedCategory, ...childIds];
        return workflows.filter((w) => allIds.includes(w.categoryId));
      })()
    : workflows;

  // filter by tab
  const activeStatuses = ['production', 'testing'] as const;
  const tabFiltered =
    activeTab === 'active'
      ? categoryFiltered.filter((w) => (activeStatuses as readonly string[]).includes(w.status))
      : categoryFiltered;

  const rootCategories = getChildCategories(null);

  const openPanel = (wf: Workflow) => {
    setSelectedWorkflow(wf);
    setPanelOpen(true);
  };

  const closePanel = () => {
    setPanelOpen(false);
    setSelectedWorkflow(null);
  };

  return (
    <div className="flex gap-6">
      {/* ===== Left sidebar: category tree ===== */}
      <aside className="w-64 shrink-0">
        <div className="sticky top-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">業務カテゴリ</h2>
          <div className="space-y-0.5">
            {/* All */}
            <button
              onClick={() => setSelectedCategory(null)}
              className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${
                selectedCategory === null
                  ? 'bg-blue-50 font-semibold text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span>全て</span>
              <span className="min-w-[1.5rem] rounded-full bg-gray-200 px-1.5 py-0.5 text-center text-xs text-gray-600">
                {workflows.length}
              </span>
            </button>

            {rootCategories.map((cat) => (
              <CategoryTreeItem
                key={cat.id}
                cat={cat}
                selected={selectedCategory}
                onSelect={setSelectedCategory}
                filteredWorkflows={workflows}
              />
            ))}
          </div>
        </div>
      </aside>

      {/* ===== Right main area ===== */}
      <div className="min-w-0 flex-1 space-y-4">
        {/* header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">ワークフロー一覧</h1>
          <Link
            to="/workflows/new"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            新規作成
          </Link>
        </div>

        {/* tabs */}
        <div className="flex gap-1 border-b border-gray-200">
          {([
            { key: 'active' as TabKey, label: '稼働中' },
            { key: 'all' as TabKey, label: '全てのフロー' },
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              {tab.label}
              <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
                {tab.key === 'active'
                  ? categoryFiltered.filter((w) => (activeStatuses as readonly string[]).includes(w.status)).length
                  : categoryFiltered.length}
              </span>
            </button>
          ))}
        </div>

        {/* workflow rows */}
        <div className="space-y-2">
          {tabFiltered.length === 0 && (
            <div className="rounded-lg border border-dashed border-gray-300 bg-white py-12 text-center text-sm text-gray-400">
              該当するワークフローがありません
            </div>
          )}

          {tabFiltered.map((wf) => {
            const cat = categories.find((c) => c.id === wf.categoryId);
            return (
              <button
                key={wf.id}
                onClick={() => openPanel(wf)}
                className="flex w-full items-center gap-4 rounded-lg border border-gray-200 bg-white px-5 py-4 text-left shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-50/30"
              >
                {/* name + description */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-gray-900">{wf.name}</span>
                    {wf.isTemplate && (
                      <span className="shrink-0 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-medium text-indigo-700">
                        テンプレート
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-gray-500">{wf.description}</p>
                </div>

                {/* status */}
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${WF_STATUS_COLORS[wf.status]}`}
                >
                  {WF_STATUS_LABELS[wf.status]}
                </span>

                {/* trigger */}
                <span className="hidden shrink-0 text-xs text-gray-500 lg:inline">
                  {TRIGGER_LABELS[wf.triggerType].split('（')[0]}
                </span>

                {/* owner */}
                <span className="hidden shrink-0 text-xs text-gray-600 md:inline">
                  {getUserName(wf.ownerId)}
                </span>

                {/* version */}
                <span className="shrink-0 text-xs text-gray-400">v{wf.currentVersion}</span>

                {/* updated */}
                <span className="hidden shrink-0 text-xs text-gray-400 sm:inline">{wf.updatedAt}</span>

                {/* category badge */}
                {cat && (
                  <span className="hidden shrink-0 text-xs text-gray-400 xl:inline">
                    {cat.icon} {cat.name}
                  </span>
                )}

                {/* chevron */}
                <svg className="h-4 w-4 shrink-0 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            );
          })}
        </div>
      </div>

      {/* ===== Action panel slide-over ===== */}
      {panelOpen && selectedWorkflow && (
        <ActionPanel workflow={selectedWorkflow} onClose={closePanel} />
      )}
    </div>
  );
}
