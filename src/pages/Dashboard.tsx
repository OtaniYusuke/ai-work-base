import { useAuth } from '../context/AuthContext';
import {
  ROLE_LABELS,
  workflows,
  notifications,
  WF_STATUS_LABELS,
  WF_STATUS_COLORS,
} from '../data/mockData';
import type { UserRole } from '../data/mockData';

interface KpiItem {
  label: string;
  value: number;
  color: string;
}

function getKpiCards(role: UserRole): KpiItem[] {
  switch (role) {
    case 'business_owner':
      return [
        { label: '承認待ち件数', value: 4, color: 'bg-yellow-500' },
        { label: '実行中フロー件数', value: 2, color: 'bg-blue-500' },
        { label: '例外件数', value: 2, color: 'bg-red-500' },
        { label: '完了件数', value: 2, color: 'bg-green-500' },
      ];
    case 'workflow_owner':
      return [
        { label: '自分のフロー数', value: 6, color: 'bg-cyan-500' },
        { label: '検証中', value: 1, color: 'bg-blue-500' },
        { label: '本番稼働中', value: 2, color: 'bg-green-500' },
        { label: '下書き', value: 1, color: 'bg-gray-500' },
      ];
    case 'operations_supervisor':
      return [
        { label: '実行中', value: 2, color: 'bg-blue-500' },
        { label: '承認待ち', value: 1, color: 'bg-yellow-500' },
        { label: '人間作業待ち', value: 1, color: 'bg-purple-500' },
        { label: '例外発生', value: 1, color: 'bg-red-500' },
        { label: '停滞件数', value: 1, color: 'bg-orange-500' },
      ];
    case 'exception_handler':
      return [
        { label: '未対応例外', value: 1, color: 'bg-red-500' },
        { label: 'アサイン済', value: 1, color: 'bg-yellow-500' },
        { label: '対応中', value: 0, color: 'bg-blue-500' },
      ];
    default:
      return [
        { label: 'アクティブフロー', value: 2, color: 'bg-cyan-500' },
        { label: '通知', value: 1, color: 'bg-blue-500' },
      ];
  }
}

export default function Dashboard() {
  const { currentUser } = useAuth();

  if (!currentUser) return null;

  const kpis = getKpiCards(currentUser.role);

  const userNotifications = notifications
    .filter((n) => n.toUserId === currentUser.id)
    .slice(0, 5);

  const recentWorkflows = [...workflows]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 3);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">
          {currentUser.name} さん
        </h1>
        <p className="text-slate-500 mt-1">
          {ROLE_LABELS[currentUser.role]} / {currentUser.department}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-2.5 h-2.5 rounded-full ${kpi.color}`} />
              <span className="text-sm text-slate-500">{kpi.label}</span>
            </div>
            <div className="text-3xl font-bold text-slate-800">{kpi.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Notifications */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-800">
              最近の通知
            </h2>
          </div>
          <div className="divide-y divide-slate-100">
            {userNotifications.length === 0 ? (
              <div className="px-5 py-8 text-center text-slate-400">
                通知はありません
              </div>
            ) : (
              userNotifications.map((n) => (
                <div key={n.id} className="px-5 py-3 flex items-start gap-3">
                  <span
                    className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${
                      n.read ? 'bg-slate-300' : 'bg-cyan-500'
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">
                      {n.title}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{n.body}</p>
                    <p className="text-xs text-slate-300 mt-1">{n.createdAt}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Workflows */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-800">
              最近更新されたフロー
            </h2>
          </div>
          <div className="divide-y divide-slate-100">
            {recentWorkflows.map((wf) => (
              <div key={wf.id} className="px-5 py-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-slate-700">
                    {wf.name}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      WF_STATUS_COLORS[wf.status]
                    }`}
                  >
                    {WF_STATUS_LABELS[wf.status]}
                  </span>
                </div>
                <p className="text-xs text-slate-400 line-clamp-1">
                  {wf.description}
                </p>
                <p className="text-xs text-slate-300 mt-1">
                  更新: {wf.updatedAt}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
