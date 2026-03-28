import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  aiAgents,
  workflowVersions,
  AGENT_STATUS_LABELS,
  AgentStatus,
} from '../data/mockData';

const STATUS_DOT_COLORS: Record<AgentStatus, string> = {
  available: 'bg-green-500',
  draft: 'bg-gray-400',
  pending_approval: 'bg-yellow-500',
  stopped: 'bg-red-500',
};

const AVATAR_COLORS = [
  'bg-violet-500',
  'bg-blue-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-500',
];

function getAvatarColor(index: number): string {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

function getWorkflowCountForAgent(agentId: string): number {
  const wfIds = new Set<string>();
  for (const ver of workflowVersions) {
    for (const node of ver.nodes) {
      if (node.config && (node.config as Record<string, unknown>).agentId === agentId) {
        wfIds.add(ver.workflowId);
      }
    }
  }
  return wfIds.size;
}

export default function AgentList() {
  const [search, setSearch] = useState('');

  const filtered = aiAgents.filter(
    (agent) =>
      agent.name.toLowerCase().includes(search.toLowerCase()) ||
      agent.description.toLowerCase().includes(search.toLowerCase()) ||
      agent.capabilities.some((c) => c.includes(search))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AIエージェント</h1>
          <p className="mt-1 text-sm text-gray-500">
            業務を自動化するAIエージェントを探索・管理できます
          </p>
        </div>
        <Link
          to="/agents/new"
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          新規作成
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <svg
          className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
        </svg>
        <input
          type="text"
          placeholder="エージェントを検索..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((agent, idx) => {
          const wfCount = getWorkflowCountForAgent(agent.id);
          return (
            <div
              key={agent.id}
              className="group relative flex flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-lg transition-all duration-200"
            >
              {/* Status dot */}
              <div className="absolute right-5 top-5 flex items-center gap-1.5">
                <span className={`inline-block h-2.5 w-2.5 rounded-full ${STATUS_DOT_COLORS[agent.status]}`} />
                <span className="text-xs text-gray-500">{AGENT_STATUS_LABELS[agent.status]}</span>
              </div>

              {/* Avatar + Name */}
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-xl font-bold text-white shadow-inner ${getAvatarColor(idx)}`}
                >
                  {agent.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-bold text-gray-900">{agent.name}</h2>
                  <span className="text-xs text-gray-400">v{agent.version}</span>
                </div>
              </div>

              {/* Description */}
              <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-gray-600">
                {agent.description}
              </p>

              {/* Capability tags */}
              <div className="mt-4 flex flex-wrap gap-1.5">
                {agent.capabilities.map((cap) => (
                  <span
                    key={cap}
                    className="inline-block rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-600"
                  >
                    {cap}
                  </span>
                ))}
              </div>

              {/* Footer */}
              <div className="mt-auto pt-5 flex items-center justify-between border-t border-gray-100 mt-5">
                <span className="text-xs text-gray-400">
                  {wfCount > 0 ? `${wfCount}件のフローで使用中` : '未使用'}
                </span>
                <Link
                  to={`/agents/${agent.id}`}
                  className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
                >
                  使ってみる
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <svg className="h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
          </svg>
          <p className="mt-3 text-sm text-gray-500">該当するエージェントが見つかりません</p>
        </div>
      )}
    </div>
  );
}
