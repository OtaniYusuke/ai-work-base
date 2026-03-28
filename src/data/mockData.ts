// ========================================
// ユーザー
// ========================================
export interface User {
  id: string;
  name: string;
  role: UserRole;
  department: string;
  status: 'active' | 'inactive';
}

export type UserRole =
  | 'business_owner'
  | 'workflow_owner'
  | 'ai_designer'
  | 'operations_supervisor'
  | 'exception_handler'
  | 'field_trigger'
  | 'task_executor';

export const ROLE_LABELS: Record<UserRole, string> = {
  business_owner: '事業責任者',
  workflow_owner: 'ワークフローオーナー',
  ai_designer: 'AI/業務設計者',
  operations_supervisor: '運用監督者',
  exception_handler: '例外対応者',
  field_trigger: '現場トリガー担当',
  task_executor: '対人・物理タスク実行者',
};

export const users: User[] = [
  { id: 'u1', name: '田中 太郎', role: 'business_owner', department: '経営企画部', status: 'active' },
  { id: 'u2', name: '佐藤 花子', role: 'workflow_owner', department: '業務改革部', status: 'active' },
  { id: 'u3', name: '鈴木 一郎', role: 'ai_designer', department: 'DX推進部', status: 'active' },
  { id: 'u4', name: '高橋 美咲', role: 'operations_supervisor', department: '運用管理部', status: 'active' },
  { id: 'u5', name: '伊藤 健太', role: 'exception_handler', department: '運用管理部', status: 'active' },
  { id: 'u6', name: '渡辺 裕子', role: 'field_trigger', department: '営業部', status: 'active' },
  { id: 'u7', name: '山田 誠', role: 'task_executor', department: '総務部', status: 'active' },
];

export function getUserName(id: string): string {
  return users.find(u => u.id === id)?.name ?? id;
}

// ========================================
// 業務カテゴリ（階層構造）
// ========================================
export interface BusinessCategory {
  id: string;
  name: string;
  parentId: string | null;
  icon: string;
}

export const categories: BusinessCategory[] = [
  { id: 'cat1', name: '経理業務', parentId: null, icon: '💰' },
  { id: 'cat1-1', name: '見積・請求', parentId: 'cat1', icon: '📝' },
  { id: 'cat1-2', name: '契約管理', parentId: 'cat1', icon: '📄' },
  { id: 'cat2', name: '総務業務', parentId: null, icon: '🏢' },
  { id: 'cat2-1', name: '文書管理', parentId: 'cat2', icon: '📁' },
  { id: 'cat3', name: '営業業務', parentId: null, icon: '🤝' },
  { id: 'cat3-1', name: '案件管理', parentId: 'cat3', icon: '📊' },
  { id: 'cat3-2', name: '顧客対応', parentId: 'cat3', icon: '💬' },
];

// カテゴリ別権限（3軸: 作成変更 / 承認 / 権限管理）
export type CategoryPermission = 'execute' | 'create_edit' | 'approve' | 'stop' | 'admin';
export const PERMISSION_LABELS: Record<CategoryPermission, string> = {
  execute: '業務実行',
  create_edit: 'WF・エージェント作成変更',
  approve: '承認',
  stop: '稼働停止',
  admin: '権限管理',
};
export const PERMISSION_DESCRIPTIONS: Record<CategoryPermission, string> = {
  execute: 'ワークフローの実行・タスク遂行',
  create_edit: 'ワークフロー・AIエージェントの新規作成・編集',
  approve: '実行承認・変更承認・AI能力変更承認・停止承認',
  stop: '本番稼働中フローの停止指示',
  admin: 'このカテゴリの権限付与・変更（管理者権限）',
};

export interface CategoryPermissionEntry {
  categoryId: string;
  userId: string;
  permissions: CategoryPermission[];
}

export const categoryPermissions: CategoryPermissionEntry[] = [
  { categoryId: 'cat1', userId: 'u1', permissions: ['execute', 'create_edit', 'approve', 'stop', 'admin'] },
  { categoryId: 'cat1', userId: 'u2', permissions: ['execute', 'create_edit'] },
  { categoryId: 'cat1', userId: 'u3', permissions: ['create_edit'] },
  { categoryId: 'cat1', userId: 'u6', permissions: ['execute'] },
  { categoryId: 'cat1-1', userId: 'u6', permissions: ['execute'] },
  { categoryId: 'cat1-2', userId: 'u7', permissions: ['execute'] },
  { categoryId: 'cat2', userId: 'u1', permissions: ['execute', 'create_edit', 'approve', 'stop', 'admin'] },
  { categoryId: 'cat2', userId: 'u2', permissions: ['execute', 'create_edit'] },
  { categoryId: 'cat3', userId: 'u1', permissions: ['execute', 'create_edit', 'approve', 'stop', 'admin'] },
  { categoryId: 'cat3', userId: 'u4', permissions: ['execute', 'approve'] },
  { categoryId: 'cat3', userId: 'u6', permissions: ['execute'] },
];

// ========================================
// 実行パターン
// ========================================
export type TriggerType = 'manual' | 'scheduled' | 'event' | 'api';
export const TRIGGER_LABELS: Record<TriggerType, string> = {
  manual: '手動実行（ボタン押下）',
  scheduled: 'スケジュール（定期実行）',
  event: 'イベントトリガー',
  api: 'API連携トリガー',
};

// ========================================
// ノード種別
// ========================================
export type NodeType = 'start' | 'end' | 'ai_exec' | 'human_task' | 'approval' | 'condition' | 'notification' | 'api_exec' | 'pc_operation' | 'exception';
export const NODE_TYPE_LABELS: Record<NodeType, string> = {
  start: '開始', end: '終了', ai_exec: 'AI実行', human_task: '人間タスク',
  approval: '承認', condition: '条件分岐', notification: '通知',
  api_exec: 'API実行', pc_operation: 'PC操作', exception: '例外発火',
};
export const NODE_TYPE_COLORS: Record<NodeType, string> = {
  start: '#22c55e', end: '#ef4444', ai_exec: '#8b5cf6', human_task: '#3b82f6',
  approval: '#f59e0b', condition: '#06b6d4', notification: '#ec4899',
  api_exec: '#6366f1', pc_operation: '#84cc16', exception: '#f97316',
};

export interface WorkflowNode {
  id: string;
  type: NodeType;
  name: string;
  x: number;
  y: number;
  assignee?: string;       // ユーザーID or AIエージェントID
  assigneeType?: 'user' | 'agent'; // 担当種別
  config?: Record<string, unknown>;
}

export interface WorkflowEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
}

// ========================================
// ワークフロー
// ========================================
export type WorkflowStatus = 'draft' | 'testing' | 'pending_approval' | 'production' | 'stopped' | 'deprecated';
export const WF_STATUS_LABELS: Record<WorkflowStatus, string> = {
  draft: '下書き', testing: '検証中', pending_approval: '承認申請中',
  production: '本番稼働中', stopped: '停止中', deprecated: '廃止',
};
export const WF_STATUS_COLORS: Record<WorkflowStatus, string> = {
  draft: 'bg-gray-100 text-gray-700', testing: 'bg-blue-100 text-blue-700',
  pending_approval: 'bg-yellow-100 text-yellow-700', production: 'bg-green-100 text-green-700',
  stopped: 'bg-red-100 text-red-700', deprecated: 'bg-gray-200 text-gray-500',
};

export interface Workflow {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  categoryId: string;       // 業務カテゴリ
  status: WorkflowStatus;
  triggerType: TriggerType;  // 実行パターン
  triggerConfig?: string;    // スケジュール等の設定
  currentVersion: number;
  isTemplate: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowVersion {
  id: string;
  workflowId: string;
  versionNo: number;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  createdBy: string;
  createdAt: string;
}

// ノードデータ（担当者・AIエージェント明示）
const nodes_estimate: WorkflowNode[] = [
  { id: 'n1', type: 'start', name: '見積依頼受付', x: 50, y: 200 },
  { id: 'n2', type: 'ai_exec', name: '見積書ドラフト生成', x: 250, y: 200, assignee: 'ag1', assigneeType: 'agent', config: { agentId: 'ag1', instruction: '顧客情報を元に見積書を生成' } },
  { id: 'n3', type: 'human_task', name: '見積内容確認・修正', x: 450, y: 200, assignee: 'u6', assigneeType: 'user', config: { description: '生成された見積書の内容を確認し修正' } },
  { id: 'n4', type: 'approval', name: '上長承認', x: 650, y: 200, assignee: 'u1', assigneeType: 'user', config: { type: '業務承認' } },
  { id: 'n5', type: 'notification', name: '顧客へ送信', x: 850, y: 150, config: { to: '顧客', message: '見積書を送信しました' } },
  { id: 'n6', type: 'end', name: '完了', x: 1050, y: 200 },
  { id: 'n7', type: 'exception', name: '却下時例外処理', x: 850, y: 300, assignee: 'u5', assigneeType: 'user' },
];
const edges_estimate: WorkflowEdge[] = [
  { id: 'e1', from: 'n1', to: 'n2' },
  { id: 'e2', from: 'n2', to: 'n3' },
  { id: 'e3', from: 'n3', to: 'n4' },
  { id: 'e4', from: 'n4', to: 'n5', label: '承認' },
  { id: 'e5', from: 'n5', to: 'n6' },
  { id: 'e6', from: 'n4', to: 'n7', label: '却下' },
];

const nodes_contract: WorkflowNode[] = [
  { id: 'n1', type: 'start', name: '契約書受領', x: 50, y: 200 },
  { id: 'n2', type: 'ai_exec', name: '契約書レビュー', x: 250, y: 200, assignee: 'ag2', assigneeType: 'agent' },
  { id: 'n3', type: 'condition', name: 'リスク判定', x: 450, y: 200, config: { condition: 'リスクスコア > 70' } },
  { id: 'n4', type: 'human_task', name: '法務確認', x: 650, y: 100, assignee: 'u7', assigneeType: 'user' },
  { id: 'n5', type: 'approval', name: '法務承認', x: 850, y: 100, assignee: 'u1', assigneeType: 'user' },
  { id: 'n6', type: 'notification', name: '完了通知', x: 650, y: 300 },
  { id: 'n7', type: 'end', name: '完了', x: 1050, y: 200 },
];
const edges_contract: WorkflowEdge[] = [
  { id: 'e1', from: 'n1', to: 'n2' },
  { id: 'e2', from: 'n2', to: 'n3' },
  { id: 'e3', from: 'n3', to: 'n4', label: 'リスク高' },
  { id: 'e4', from: 'n3', to: 'n6', label: 'リスク低' },
  { id: 'e5', from: 'n4', to: 'n5' },
  { id: 'e6', from: 'n5', to: 'n7' },
  { id: 'e7', from: 'n6', to: 'n7' },
];

const nodes_mail: WorkflowNode[] = [
  { id: 'n1', type: 'start', name: 'メール受信検知', x: 50, y: 200 },
  { id: 'n2', type: 'ai_exec', name: 'メール分類', x: 250, y: 200, assignee: 'ag3', assigneeType: 'agent' },
  { id: 'n3', type: 'condition', name: '振り分け判定', x: 450, y: 200 },
  { id: 'n4', type: 'notification', name: '担当者通知', x: 650, y: 200 },
  { id: 'n5', type: 'end', name: '完了', x: 850, y: 200 },
];
const edges_mail: WorkflowEdge[] = [
  { id: 'e1', from: 'n1', to: 'n2' },
  { id: 'e2', from: 'n2', to: 'n3' },
  { id: 'e3', from: 'n3', to: 'n4' },
  { id: 'e4', from: 'n4', to: 'n5' },
];

const nodes_newcase: WorkflowNode[] = [
  { id: 'n1', type: 'start', name: '案件登録', x: 50, y: 200 },
  { id: 'n2', type: 'ai_exec', name: '案件情報解析', x: 250, y: 200, assignee: 'ag4', assigneeType: 'agent' },
  { id: 'n3', type: 'human_task', name: '初期ヒアリング', x: 450, y: 200, assignee: 'u6', assigneeType: 'user' },
  { id: 'n4', type: 'approval', name: '案件受注承認', x: 650, y: 200, assignee: 'u1', assigneeType: 'user' },
  { id: 'n5', type: 'end', name: '受注確定', x: 850, y: 200 },
];
const edges_newcase: WorkflowEdge[] = [
  { id: 'e1', from: 'n1', to: 'n2' },
  { id: 'e2', from: 'n2', to: 'n3' },
  { id: 'e3', from: 'n3', to: 'n4' },
  { id: 'e4', from: 'n4', to: 'n5' },
];

export const workflows: Workflow[] = [
  { id: 'wf1', name: '見積書自動送付フロー', description: '顧客からの見積依頼を受け、AIが見積書を生成し、承認後に送付', ownerId: 'u2', categoryId: 'cat1-1', status: 'production', triggerType: 'manual', currentVersion: 2, isTemplate: false, createdAt: '2026-01-15', updatedAt: '2026-03-10' },
  { id: 'wf2', name: '契約書レビューフロー', description: '契約書をAIレビューし、リスクに応じて法務確認を分岐', ownerId: 'u2', categoryId: 'cat1-2', status: 'production', triggerType: 'manual', currentVersion: 1, isTemplate: false, createdAt: '2026-02-01', updatedAt: '2026-03-05' },
  { id: 'wf3', name: 'メール分類・振り分けフロー', description: '受信メールをAIで分類し、適切な部署に自動振り分け', ownerId: 'u2', categoryId: 'cat3-2', status: 'testing', triggerType: 'event', triggerConfig: 'メール受信時に自動起動', currentVersion: 1, isTemplate: false, createdAt: '2026-03-01', updatedAt: '2026-03-18' },
  { id: 'wf4', name: '月次報告書作成フロー', description: '各部門のデータを集約し、AIが月次報告書を作成', ownerId: 'u2', categoryId: 'cat2-1', status: 'draft', triggerType: 'scheduled', triggerConfig: '毎月1日 9:00', currentVersion: 1, isTemplate: false, createdAt: '2026-03-15', updatedAt: '2026-03-20' },
  { id: 'wf5', name: '見積書送付テンプレート', description: '見積書送付フローのテンプレート（承認者・通知先を差し替え可能）', ownerId: 'u2', categoryId: 'cat1-1', status: 'production', triggerType: 'manual', currentVersion: 1, isTemplate: true, createdAt: '2026-02-20', updatedAt: '2026-03-01' },
  { id: 'wf6', name: '新規案件受付フロー', description: '新規案件の受付から初期対応までの自動化', ownerId: 'u2', categoryId: 'cat3-1', status: 'pending_approval', triggerType: 'manual', currentVersion: 1, isTemplate: false, createdAt: '2026-03-18', updatedAt: '2026-03-22' },
];

export const workflowVersions: WorkflowVersion[] = [
  { id: 'wv1', workflowId: 'wf1', versionNo: 1, nodes: nodes_estimate, edges: edges_estimate, status: 'approved', createdBy: 'u2', createdAt: '2026-01-15' },
  { id: 'wv2', workflowId: 'wf1', versionNo: 2, nodes: nodes_estimate, edges: edges_estimate, status: 'approved', createdBy: 'u2', createdAt: '2026-03-10' },
  { id: 'wv3', workflowId: 'wf2', versionNo: 1, nodes: nodes_contract, edges: edges_contract, status: 'approved', createdBy: 'u2', createdAt: '2026-02-01' },
  { id: 'wv4', workflowId: 'wf3', versionNo: 1, nodes: nodes_mail, edges: edges_mail, status: 'draft', createdBy: 'u3', createdAt: '2026-03-01' },
  { id: 'wv5', workflowId: 'wf4', versionNo: 1, nodes: [], edges: [], status: 'draft', createdBy: 'u2', createdAt: '2026-03-15' },
  { id: 'wv6', workflowId: 'wf5', versionNo: 1, nodes: nodes_estimate, edges: edges_estimate, status: 'approved', createdBy: 'u2', createdAt: '2026-02-20' },
  { id: 'wv7', workflowId: 'wf6', versionNo: 1, nodes: nodes_newcase, edges: edges_newcase, status: 'pending', createdBy: 'u2', createdAt: '2026-03-18' },
];

// ========================================
// AIエージェント
// ========================================
export type AgentStatus = 'draft' | 'pending_approval' | 'available' | 'stopped';
export const AGENT_STATUS_LABELS: Record<AgentStatus, string> = {
  draft: '下書き', pending_approval: '承認申請中', available: '利用可能', stopped: '停止中',
};

export interface AIAgent {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  instructions: string;
  status: AgentStatus;
  version: number;
  dataSourceIds: string[];
}

export const aiAgents: AIAgent[] = [
  { id: 'ag1', name: '見積書生成AI', description: '顧客情報と商品データから見積書を自動生成', capabilities: ['文書生成', '検索'], instructions: '顧客DBと商品マスタを参照し、適切な見積書を生成してください。', status: 'available', version: 2, dataSourceIds: ['ds1', 'ds2'] },
  { id: 'ag2', name: '契約書レビューAI', description: '契約書の内容をチェックし、リスク箇所を指摘', capabilities: ['要約', '判定'], instructions: '契約書を読み込み、法的リスクのある条項を特定してください。', status: 'available', version: 1, dataSourceIds: ['ds3'] },
  { id: 'ag3', name: 'メール分類AI', description: '受信メールを分類し、適切な部署に振り分け', capabilities: ['判定', '検索'], instructions: '受信メールの内容を分析し、カテゴリを判定してください。', status: 'draft', version: 1, dataSourceIds: [] },
  { id: 'ag4', name: '議事録要約AI', description: '会議の議事録を要約し、アクションアイテムを抽出', capabilities: ['要約', '文書生成'], instructions: '議事録を読み込み、要点とアクションアイテムを抽出してください。', status: 'available', version: 3, dataSourceIds: [] },
];

export function getAgentName(id: string): string {
  return aiAgents.find(a => a.id === id)?.name ?? id;
}

// ========================================
// データ元本
// ========================================
export interface DataSource {
  id: string;
  name: string;
  type: string;
  schemaDescription: string;
  records: Record<string, unknown>[];
}

export const dataSources: DataSource[] = [
  {
    id: 'ds1', name: '顧客マスタ', type: 'マスタデータ', schemaDescription: '顧客ID, 会社名, 担当者, 連絡先, 契約状況',
    records: [
      { id: 'C001', company: '株式会社アルファ', contact: '山本 健一', email: 'yamamoto@alpha.co.jp', status: '契約中' },
      { id: 'C002', company: 'ベータ商事株式会社', contact: '中村 優子', email: 'nakamura@beta.co.jp', status: '契約中' },
      { id: 'C003', company: 'ガンマ工業株式会社', contact: '小林 洋介', email: 'kobayashi@gamma.co.jp', status: '検討中' },
      { id: 'C004', company: 'デルタ物流株式会社', contact: '加藤 真理', email: 'kato@delta.co.jp', status: '契約終了' },
    ],
  },
  {
    id: 'ds2', name: '商品マスタ', type: 'マスタデータ', schemaDescription: '商品ID, 商品名, カテゴリ, 単価, 在庫',
    records: [
      { id: 'P001', name: 'AIワークステーション Pro', category: 'ハードウェア', price: 498000, stock: 15 },
      { id: 'P002', name: 'データ分析ライセンス', category: 'ソフトウェア', price: 120000, stock: 999 },
      { id: 'P003', name: 'セキュリティ監視サービス', category: 'サービス', price: 50000, stock: 999 },
    ],
  },
  {
    id: 'ds3', name: '契約書テンプレート', type: '文書データ', schemaDescription: '契約ID, 契約種別, テンプレート名, 最終更新日',
    records: [
      { id: 'T001', type: '業務委託契約', name: '標準業務委託契約書', updatedAt: '2026-01-15' },
      { id: 'T002', type: '秘密保持契約', name: 'NDA標準テンプレート', updatedAt: '2026-02-01' },
      { id: 'T003', type: '売買契約', name: '商品売買契約書', updatedAt: '2025-12-20' },
    ],
  },
];

// ========================================
// 実行インスタンス
// ========================================
export type InstanceStatus = 'running' | 'waiting_approval' | 'waiting_human' | 'exception' | 'completed' | 'stopped';
export const INSTANCE_STATUS_LABELS: Record<InstanceStatus, string> = {
  running: '実行中', waiting_approval: '承認待ち', waiting_human: '人間作業待ち',
  exception: '例外発生', completed: '完了', stopped: '停止',
};
export const INSTANCE_STATUS_COLORS: Record<InstanceStatus, string> = {
  running: 'bg-blue-100 text-blue-700', waiting_approval: 'bg-yellow-100 text-yellow-700',
  waiting_human: 'bg-purple-100 text-purple-700', exception: 'bg-red-100 text-red-700',
  completed: 'bg-green-100 text-green-700', stopped: 'bg-gray-100 text-gray-700',
};

// ========================================
// バッチアイテム（リスト処理の各件）
// ========================================
export type BatchItemStatus = 'pending' | 'running' | 'waiting_approval' | 'waiting_human' | 'completed' | 'error' | 'skipped';
export const BATCH_ITEM_STATUS_LABELS: Record<BatchItemStatus, string> = {
  pending: '待機中', running: '処理中', waiting_approval: '承認待ち',
  waiting_human: '作業待ち', completed: '完了', error: 'エラー', skipped: 'スキップ',
};
export const BATCH_ITEM_STATUS_COLORS: Record<BatchItemStatus, string> = {
  pending: 'bg-gray-100 text-gray-600', running: 'bg-blue-100 text-blue-700',
  waiting_approval: 'bg-yellow-100 text-yellow-700', waiting_human: 'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700', error: 'bg-red-100 text-red-700',
  skipped: 'bg-gray-50 text-gray-400',
};

export interface BatchItem {
  id: string;
  label: string;           // e.g. "株式会社アルファ"
  status: BatchItemStatus;
  currentNodeId?: string;
  currentNode?: string;
  progress: number;         // 0-100
  detail?: string;          // e.g. "見積書生成中..."
  startedAt?: string;
  completedAt?: string;
  outputDocumentId?: string; // 生成された成果物への参照
}

// ========================================
// 成果物ドキュメント（各プロセスの出力物）
// ========================================
export interface OutputDocument {
  id: string;
  instanceId: string;
  batchItemId?: string;
  type: 'estimate' | 'contract_review' | 'report' | 'email_classification';
  title: string;
  status: 'generating' | 'draft' | 'reviewed' | 'approved' | 'sent' | 'error';
  createdAt: string;
  updatedAt: string;
  content: Record<string, unknown>;
}

export const OUTPUT_DOC_STATUS_LABELS: Record<OutputDocument['status'], string> = {
  generating: '生成中', draft: '下書き', reviewed: '確認済', approved: '承認済', sent: '送付済', error: 'エラー',
};
export const OUTPUT_DOC_STATUS_COLORS: Record<OutputDocument['status'], string> = {
  generating: 'bg-blue-100 text-blue-700', draft: 'bg-gray-100 text-gray-700',
  reviewed: 'bg-cyan-100 text-cyan-700', approved: 'bg-green-100 text-green-700',
  sent: 'bg-emerald-100 text-emerald-800', error: 'bg-red-100 text-red-700',
};

export const outputDocuments: OutputDocument[] = [
  // inst7 バッチ: 4社への見積書
  {
    id: 'doc1', instanceId: 'inst7', batchItemId: 'bi1', type: 'estimate',
    title: '見積書 - 株式会社アルファ', status: 'sent', createdAt: '2026-03-23 11:05', updatedAt: '2026-03-23 11:25',
    content: {
      estimateNo: 'EST-2026-0042',
      customerName: '株式会社アルファ',
      customerContact: '山本 健一',
      date: '2026年3月23日',
      validUntil: '2026年4月22日',
      items: [
        { name: 'AIワークステーション Pro', quantity: 3, unitPrice: 498000, amount: 1494000 },
        { name: 'データ分析ライセンス', quantity: 5, unitPrice: 120000, amount: 600000 },
        { name: 'セキュリティ監視サービス（年間）', quantity: 1, unitPrice: 600000, amount: 600000 },
      ],
      subtotal: 2694000,
      tax: 269400,
      total: 2963400,
      notes: '納期: ご発注後2週間\nお支払条件: 月末締め翌月末払い',
      aiConfidence: 0.94,
      aiNotes: '過去取引履歴から最適な商品構成を提案。前回見積比+15%。',
    },
  },
  {
    id: 'doc2', instanceId: 'inst7', batchItemId: 'bi2', type: 'estimate',
    title: '見積書 - ベータ商事株式会社', status: 'reviewed', createdAt: '2026-03-23 11:08', updatedAt: '2026-03-23 11:20',
    content: {
      estimateNo: 'EST-2026-0043',
      customerName: 'ベータ商事株式会社',
      customerContact: '中村 優子',
      date: '2026年3月23日',
      validUntil: '2026年4月22日',
      items: [
        { name: 'データ分析ライセンス', quantity: 10, unitPrice: 120000, amount: 1200000 },
        { name: 'セキュリティ監視サービス（年間）', quantity: 2, unitPrice: 600000, amount: 1200000 },
      ],
      subtotal: 2400000,
      tax: 240000,
      total: 2640000,
      notes: '納期: ご発注後1週間\nお支払条件: 月末締め翌月末払い\n※ボリュームディスカウント適用済み',
      aiConfidence: 0.91,
      aiNotes: '大口ライセンス契約のため10%割引を自動適用。',
    },
  },
  {
    id: 'doc3', instanceId: 'inst7', batchItemId: 'bi3', type: 'estimate',
    title: '見積書 - ガンマ工業株式会社', status: 'generating', createdAt: '2026-03-23 11:12', updatedAt: '2026-03-23 11:12',
    content: {
      estimateNo: 'EST-2026-0044',
      customerName: 'ガンマ工業株式会社',
      customerContact: '小林 洋介',
      date: '2026年3月23日',
      validUntil: '',
      items: [
        { name: 'AIワークステーション Pro', quantity: 1, unitPrice: 498000, amount: 498000 },
      ],
      subtotal: 498000,
      tax: 49800,
      total: 547800,
      notes: '※ 生成中...',
      aiConfidence: 0.72,
      aiNotes: '新規顧客のため過去データなし。業種平均から推定。要確認。',
    },
  },
  // inst8 バッチ: 契約書レビュー
  {
    id: 'doc4', instanceId: 'inst8', batchItemId: 'bi5', type: 'contract_review',
    title: '契約書レビュー - 業務委託契約書（アルファ社）', status: 'approved', createdAt: '2026-03-23 08:05', updatedAt: '2026-03-23 08:15',
    content: {
      contractTitle: '業務委託契約書',
      parties: '株式会社アルファ ↔ 当社',
      riskScore: 25,
      riskLevel: '低',
      findings: [
        { severity: 'info', clause: '第3条（委託料）', comment: '標準的な金額設定。問題なし。' },
        { severity: 'info', clause: '第7条（秘密保持）', comment: '標準NDA条項に準拠。' },
      ],
      recommendation: '特段のリスクなし。自動承認済み。',
      aiConfidence: 0.96,
    },
  },
  {
    id: 'doc5', instanceId: 'inst8', batchItemId: 'bi6', type: 'contract_review',
    title: '契約書レビュー - NDA（ベータ商事）', status: 'draft', createdAt: '2026-03-23 08:18', updatedAt: '2026-03-23 08:25',
    content: {
      contractTitle: '秘密保持契約書',
      parties: 'ベータ商事株式会社 ↔ 当社',
      riskScore: 78,
      riskLevel: '高',
      findings: [
        { severity: 'high', clause: '第5条（損害賠償）', comment: '損害賠償上限の定めがありません。上限条項の追加を推奨。' },
        { severity: 'medium', clause: '第8条（有効期間）', comment: '自動更新条項あり。解約通知期間が90日と長い。' },
        { severity: 'low', clause: '第2条（秘密情報の定義）', comment: '定義が広範。口頭情報も含む。実務上の運用に注意。' },
      ],
      recommendation: '法務部での確認を推奨。特に損害賠償条項の修正が必要。',
      aiConfidence: 0.88,
    },
  },
  // 単体実行 inst1 の見積書
  {
    id: 'doc6', instanceId: 'inst1', type: 'estimate',
    title: '見積書 - 株式会社アルファ（単体）', status: 'reviewed', createdAt: '2026-03-23 09:05', updatedAt: '2026-03-23 09:20',
    content: {
      estimateNo: 'EST-2026-0041',
      customerName: '株式会社アルファ',
      customerContact: '山本 健一',
      date: '2026年3月23日',
      validUntil: '2026年4月22日',
      items: [
        { name: 'AIワークステーション Pro', quantity: 2, unitPrice: 498000, amount: 996000 },
        { name: 'データ分析ライセンス', quantity: 3, unitPrice: 120000, amount: 360000 },
      ],
      subtotal: 1356000,
      tax: 135600,
      total: 1491600,
      notes: '納期: ご発注後2週間\nお支払条件: 月末締め翌月末払い',
      aiConfidence: 0.93,
      aiNotes: '追加発注案件。既存契約ベースで見積生成。',
    },
  },
];

export interface ExecutionInstance {
  id: string;
  workflowId: string;
  versionId: string;
  status: InstanceStatus;
  startedBy: string;
  startedAt: string;
  currentNodeId: string;
  currentNode: string;
  endedAt?: string;
  progress: number;
  // バッチ処理
  executionMode?: 'single' | 'batch_sequential' | 'batch_parallel';
  batchItems?: BatchItem[];
  batchTotalCount?: number;
  batchCompletedCount?: number;
  // 自分がアクションすべきか
  pendingAction?: {
    type: 'approve' | 'execute_task' | 'handle_exception' | 'confirm' | 'trigger';
    label: string;
    assigneeId: string;
  };
}

export const instances: ExecutionInstance[] = [
  // --- 単体実行 ---
  {
    id: 'inst1', workflowId: 'wf1', versionId: 'wv2', status: 'waiting_approval',
    startedBy: 'u6', startedAt: '2026-03-23 09:00', currentNodeId: 'n4', currentNode: '上長承認', progress: 60,
    executionMode: 'single',
    pendingAction: { type: 'approve', label: '承認する', assigneeId: 'u1' },
  },
  {
    id: 'inst2', workflowId: 'wf1', versionId: 'wv2', status: 'running',
    startedBy: 'u6', startedAt: '2026-03-23 10:30', currentNodeId: 'n2', currentNode: '見積書ドラフト生成', progress: 30,
    executionMode: 'single',
  },
  // --- バッチ並列実行（4社に見積書一括送付）---
  {
    id: 'inst7', workflowId: 'wf1', versionId: 'wv2', status: 'running',
    startedBy: 'u6', startedAt: '2026-03-23 11:00', currentNodeId: 'n2', currentNode: '見積書ドラフト生成（並列）', progress: 50,
    executionMode: 'batch_parallel',
    batchTotalCount: 4,
    batchCompletedCount: 1,
    batchItems: [
      { id: 'bi1', label: '株式会社アルファ', status: 'completed', currentNodeId: 'n6', currentNode: '完了', progress: 100, detail: '送付完了', startedAt: '2026-03-23 11:00', completedAt: '2026-03-23 11:25' },
      { id: 'bi2', label: 'ベータ商事株式会社', status: 'waiting_approval', currentNodeId: 'n4', currentNode: '上長承認', progress: 60, detail: '承認待ち', startedAt: '2026-03-23 11:00' },
      { id: 'bi3', label: 'ガンマ工業株式会社', status: 'running', currentNodeId: 'n2', currentNode: '見積書ドラフト生成', progress: 30, detail: 'AI生成中...', startedAt: '2026-03-23 11:02' },
      { id: 'bi4', label: 'デルタ物流株式会社', status: 'pending', progress: 0, detail: '順番待ち' },
    ],
    pendingAction: { type: 'approve', label: 'ベータ商事の見積承認', assigneeId: 'u1' },
  },
  // --- バッチ順次実行（契約書3件レビュー）---
  {
    id: 'inst8', workflowId: 'wf2', versionId: 'wv3', status: 'running',
    startedBy: 'u6', startedAt: '2026-03-23 08:00', currentNodeId: 'n2', currentNode: '契約書レビュー（順次）', progress: 40,
    executionMode: 'batch_sequential',
    batchTotalCount: 3,
    batchCompletedCount: 1,
    batchItems: [
      { id: 'bi5', label: '業務委託契約書（アルファ社）', status: 'completed', currentNodeId: 'n7', currentNode: '完了', progress: 100, detail: 'リスク低 - 自動完了', startedAt: '2026-03-23 08:00', completedAt: '2026-03-23 08:15' },
      { id: 'bi6', label: 'NDA（ベータ商事）', status: 'waiting_human', currentNodeId: 'n4', currentNode: '法務確認', progress: 50, detail: '法務確認中', startedAt: '2026-03-23 08:15' },
      { id: 'bi7', label: '売買契約書（ガンマ工業）', status: 'pending', progress: 0, detail: '前件完了待ち' },
    ],
    pendingAction: { type: 'execute_task', label: 'NDAの法務確認', assigneeId: 'u7' },
  },
  // --- 既存の単体 ---
  {
    id: 'inst3', workflowId: 'wf2', versionId: 'wv3', status: 'waiting_human',
    startedBy: 'u6', startedAt: '2026-03-22 14:00', currentNodeId: 'n4', currentNode: '法務確認', progress: 50,
    executionMode: 'single',
    pendingAction: { type: 'execute_task', label: '作業を開始する', assigneeId: 'u7' },
  },
  {
    id: 'inst4', workflowId: 'wf1', versionId: 'wv2', status: 'completed',
    startedBy: 'u6', startedAt: '2026-03-21 08:00', currentNodeId: 'n6', currentNode: '完了', endedAt: '2026-03-21 16:30', progress: 100,
    executionMode: 'single',
  },
  {
    id: 'inst5', workflowId: 'wf2', versionId: 'wv3', status: 'exception',
    startedBy: 'u6', startedAt: '2026-03-22 16:00', currentNodeId: 'n2', currentNode: '契約書レビュー', progress: 25,
    executionMode: 'single',
    pendingAction: { type: 'handle_exception', label: '例外対応する', assigneeId: 'u5' },
  },
  {
    id: 'inst6', workflowId: 'wf1', versionId: 'wv2', status: 'completed',
    startedBy: 'u6', startedAt: '2026-03-20 09:00', currentNodeId: 'n6', currentNode: '完了', endedAt: '2026-03-20 17:00', progress: 100,
    executionMode: 'single',
  },
];

// ========================================
// 承認要求
// ========================================
export type ApprovalType = 'execution' | 'change' | 'ai_capability' | 'stop';
export const APPROVAL_TYPE_LABELS: Record<ApprovalType, string> = {
  execution: '実行承認', change: '変更承認', ai_capability: 'AI能力変更承認', stop: '稼働停止承認',
};
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'returned';
export const APPROVAL_STATUS_LABELS: Record<ApprovalStatus, string> = {
  pending: '承認待ち', approved: '承認済', rejected: '却下', returned: '差し戻し',
};

export interface ApprovalRequest {
  id: string;
  targetType: string;
  targetId: string;
  targetName: string;
  approvalType: ApprovalType;
  requesterId: string;
  approverId: string;
  status: ApprovalStatus;
  reason: string;
  comment?: string;
  createdAt: string;
}

export const approvalRequests: ApprovalRequest[] = [
  { id: 'ar1', targetType: 'workflow', targetId: 'wf6', targetName: '新規案件受付フロー', approvalType: 'execution', requesterId: 'u2', approverId: 'u1', status: 'pending', reason: '新規案件受付の自動化を開始するため', createdAt: '2026-03-22 15:00' },
  { id: 'ar2', targetType: 'instance', targetId: 'inst1', targetName: '見積書自動送付フロー #inst1', approvalType: 'execution', requesterId: 'u6', approverId: 'u1', status: 'pending', reason: '株式会社アルファ向け見積書の送付承認', createdAt: '2026-03-23 09:30' },
  { id: 'ar3', targetType: 'workflow', targetId: 'wf1', targetName: '見積書自動送付フロー v3変更', approvalType: 'change', requesterId: 'u2', approverId: 'u1', status: 'pending', reason: '承認ステップにコメント必須を追加', createdAt: '2026-03-22 10:00' },
  { id: 'ar4', targetType: 'agent', targetId: 'ag1', targetName: '見積書生成AI 能力変更', approvalType: 'ai_capability', requesterId: 'u3', approverId: 'u1', status: 'pending', reason: 'RAG参照先の追加', createdAt: '2026-03-21 16:00' },
  { id: 'ar5', targetType: 'workflow', targetId: 'wf2', targetName: '契約書レビューフロー', approvalType: 'execution', requesterId: 'u2', approverId: 'u1', status: 'approved', reason: '契約書レビューの自動化', comment: '問題なし。稼働を承認します。', createdAt: '2026-01-30 09:00' },
];

// ========================================
// 例外
// ========================================
export type ExceptionStatus = 'open' | 'assigned' | 'in_progress' | 'resolved' | 'closed';
export const EXCEPTION_STATUS_LABELS: Record<ExceptionStatus, string> = {
  open: '未対応', assigned: 'アサイン済', in_progress: '対応中', resolved: '解決済', closed: 'クローズ',
};

export interface Exception {
  id: string;
  instanceId: string;
  workflowName: string;
  node: string;
  type: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  status: ExceptionStatus;
  assigneeId?: string;
  memo?: string;
  createdAt: string;
}

export const exceptions: Exception[] = [
  { id: 'ex1', instanceId: 'inst5', workflowName: '契約書レビューフロー', node: '契約書レビュー', type: 'AI処理エラー', description: 'AIエージェントが契約書の解析に失敗。文書フォーマットが想定外。', priority: 'high', status: 'open', createdAt: '2026-03-22 16:30' },
  { id: 'ex2', instanceId: 'inst3', workflowName: '契約書レビューフロー', node: '法務確認', type: 'タイムアウト', description: '法務確認タスクが48時間以上滞留。', priority: 'medium', status: 'assigned', assigneeId: 'u5', createdAt: '2026-03-22 14:00' },
  { id: 'ex3', instanceId: 'inst4', workflowName: '見積書自動送付フロー', node: '顧客へ送信', type: '送信エラー', description: '顧客メールアドレスが無効で通知送信に失敗', priority: 'low', status: 'resolved', assigneeId: 'u5', memo: 'メールアドレスを修正して再送信済み', createdAt: '2026-03-21 15:00' },
];

// ========================================
// 通知
// ========================================
export interface Notification {
  id: string;
  toUserId: string;
  type: 'approval_request' | 'exception' | 'completed' | 'failed' | 'returned' | 'stop_request';
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

export const notifications: Notification[] = [
  { id: 'nt1', toUserId: 'u1', type: 'approval_request', title: '承認依頼: 新規案件受付フロー', body: '佐藤花子さんから実行承認の依頼があります。', read: false, createdAt: '2026-03-22 15:00' },
  { id: 'nt2', toUserId: 'u1', type: 'approval_request', title: '承認依頼: 見積書送付 #inst1', body: '渡辺裕子さんが開始した見積書送付フローの承認が必要です。', read: false, createdAt: '2026-03-23 09:30' },
  { id: 'nt3', toUserId: 'u5', type: 'exception', title: '例外発生: 契約書レビューフロー', body: 'AI処理エラーが発生しました。対応が必要です。', read: false, createdAt: '2026-03-22 16:30' },
  { id: 'nt4', toUserId: 'u4', type: 'exception', title: '滞留アラート: 法務確認タスク', body: '法務確認タスクが48時間以上滞留しています。', read: true, createdAt: '2026-03-22 14:00' },
  { id: 'nt5', toUserId: 'u6', type: 'completed', title: '完了: 見積書自動送付フロー', body: '見積書の送付が完了しました。', read: true, createdAt: '2026-03-21 16:30' },
  { id: 'nt6', toUserId: 'u1', type: 'approval_request', title: '変更承認依頼: 見積書自動送付フロー', body: '佐藤花子さんからフロー変更の承認依頼があります。', read: false, createdAt: '2026-03-22 10:00' },
  { id: 'nt7', toUserId: 'u1', type: 'approval_request', title: 'AI能力変更承認: 見積書生成AI', body: '鈴木一郎さんからAIエージェントの能力変更承認依頼があります。', read: false, createdAt: '2026-03-21 16:00' },
  { id: 'nt8', toUserId: 'u7', type: 'approval_request', title: 'タスク割当: 法務確認', body: '契約書レビューフローの法務確認タスクが割り当てられました。', read: false, createdAt: '2026-03-22 14:00' },
];

// ========================================
// ログ（ワークフロー単位でも引けるように）
// ========================================
export type LogType = 'execution' | 'approval' | 'change' | 'notification' | 'exception';
export const LOG_TYPE_LABELS: Record<LogType, string> = {
  execution: '実行ログ', approval: '承認ログ', change: '変更ログ', notification: '通知ログ', exception: '例外ログ',
};

export interface LogEntry {
  id: string;
  type: LogType;
  workflowId: string;
  targetName: string;
  instanceId?: string;
  actor: string;
  eventType: string;
  content: string;
  timestamp: string;
}

export const logs: LogEntry[] = [
  { id: 'log1', type: 'execution', workflowId: 'wf1', targetName: '見積書自動送付フロー', instanceId: 'inst2', actor: '渡辺 裕子', eventType: '実行開始', content: 'フロー実行を開始しました', timestamp: '2026-03-23 10:30:00' },
  { id: 'log2', type: 'execution', workflowId: 'wf1', targetName: '見積書自動送付フロー', instanceId: 'inst1', actor: '渡辺 裕子', eventType: '実行開始', content: 'フロー実行を開始しました', timestamp: '2026-03-23 09:00:00' },
  { id: 'log3', type: 'approval', workflowId: 'wf2', targetName: '契約書レビューフロー', actor: '田中 太郎', eventType: '承認', content: '実行承認を行いました', timestamp: '2026-01-30 09:00:00' },
  { id: 'log4', type: 'change', workflowId: 'wf1', targetName: '見積書自動送付フロー', actor: '佐藤 花子', eventType: 'バージョン更新', content: 'v1 → v2 へ更新しました', timestamp: '2026-03-10 11:00:00' },
  { id: 'log5', type: 'exception', workflowId: 'wf2', targetName: '契約書レビューフロー', instanceId: 'inst5', actor: 'システム', eventType: '例外発生', content: 'AI処理エラー: 文書フォーマット異常', timestamp: '2026-03-22 16:30:00' },
  { id: 'log6', type: 'notification', workflowId: 'wf1', targetName: '見積書自動送付フロー', actor: 'システム', eventType: '通知送信', content: '完了通知を渡辺裕子さんに送信しました', timestamp: '2026-03-21 16:30:00' },
  { id: 'log7', type: 'execution', workflowId: 'wf1', targetName: '見積書自動送付フロー', instanceId: 'inst4', actor: '渡辺 裕子', eventType: '実行完了', content: 'フロー実行が正常に完了しました', timestamp: '2026-03-21 16:30:00' },
  { id: 'log8', type: 'approval', workflowId: 'wf6', targetName: '新規案件受付フロー', actor: '佐藤 花子', eventType: '承認申請', content: '実行承認を申請しました', timestamp: '2026-03-22 15:00:00' },
  { id: 'log9', type: 'execution', workflowId: 'wf1', targetName: '見積書自動送付フロー', instanceId: 'inst1', actor: '見積書生成AI', eventType: 'AI処理完了', content: '見積書ドラフトの生成が完了しました', timestamp: '2026-03-23 09:05:00' },
  { id: 'log10', type: 'execution', workflowId: 'wf1', targetName: '見積書自動送付フロー', instanceId: 'inst1', actor: '渡辺 裕子', eventType: 'タスク完了', content: '見積内容確認・修正を完了しました', timestamp: '2026-03-23 09:25:00' },
];
