import { useState, useRef, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  aiAgents,
  dataSources,
  workflows,
  workflowVersions,
  AGENT_STATUS_LABELS,
  AgentStatus,
} from '../data/mockData';

const ALL_CAPABILITIES = ['文書生成', '要約', '判定', 'PC操作', 'API操作', '検索'];

const AVATAR_COLORS = [
  'bg-violet-500',
  'bg-blue-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-500',
];

function getAvatarColor(agentId: string): string {
  const idx = aiAgents.findIndex((a) => a.id === agentId);
  return AVATAR_COLORS[idx >= 0 ? idx % AVATAR_COLORS.length : 0];
}

type Tab = 'playground' | 'settings' | 'training';

interface ChatMessage {
  role: 'user' | 'agent';
  content: string;
}

// Mock responses per agent
function getMockResponse(agentId: string, _userMessage: string): string {
  switch (agentId) {
    case 'ag1':
      return `見積書を生成しました。

【見積書】
件名: システム導入プロジェクト
宛先: 株式会社アルファ 山本 健一様

| 項目 | 数量 | 単価 | 小計 |
|------|------|------|------|
| AIワークステーション Pro | 2台 | ¥498,000 | ¥996,000 |
| データ分析ライセンス | 5本 | ¥120,000 | ¥600,000 |
| セキュリティ監視サービス | 12ヶ月 | ¥50,000 | ¥600,000 |

合計: ¥2,196,000（税別）
有効期限: 2026年4月30日

※ 顧客マスタと商品マスタから自動生成しました。`;

    case 'ag2':
      return `契約書レビューが完了しました。

【リスク評価結果】

リスクレベル: 中程度

指摘事項:
1. 第5条（損害賠償） - 賠償上限額の記載なし → 要修正
2. 第8条（秘密保持） - 秘密保持期間が契約終了後1年は短い → 3年以上を推奨
3. 第12条（契約解除） - 解除通知期間が30日は短い → 60日以上を推奨
4. 第15条（準拠法） - 問題なし

推奨アクション:
- 法務部への確認を推奨します（指摘1, 2）
- 相手方との再交渉を検討してください（指摘3）`;

    case 'ag3':
      return `メール分類が完了しました。

【分類結果】
カテゴリ: 営業関連 / 見積依頼
信頼度: 92%
優先度: 高

振り分け先: 営業部
推奨対応期限: 2営業日以内

関連タグ: #見積依頼 #新規案件 #株式会社ガンマ

補足: 過去の類似メールから、この顧客は迅速な対応を好む傾向があります。`;

    case 'ag4':
      return `議事録の要約が完了しました。

【会議要約】
日時: 2026年3月20日 14:00-15:30
参加者: 田中、佐藤、鈴木、高橋

要点:
1. Q1の売上目標は95%達成。主要因はAI導入プロジェクトの好調。
2. 新規プロダクトのリリースを4月末に前倒し。
3. セキュリティ監査の結果、重大な問題なし。

アクションアイテム:
- [ ] 佐藤: 4月リリーススケジュールの詳細作成（期限: 3/27）
- [ ] 鈴木: AI学習データの品質レポート提出（期限: 3/25）
- [ ] 高橋: 運用マニュアル改訂版の配布（期限: 4/1）

次回会議: 2026年4月3日 14:00`;

    default:
      return `ご質問ありがとうございます。お手伝いできることがあればお知らせください。

現在の対応可能な操作:
- データの検索・分析
- 文書の生成・要約
- 情報の分類・判定

具体的なご要望をお聞かせいただければ、より適切な回答をいたします。`;
  }
}

// Mock training data per agent
function getMockTrainingData(agentId: string): { input: string; output: string }[] {
  switch (agentId) {
    case 'ag1':
      return [
        { input: 'アルファ社にPro2台の見積を作成', output: '見積書PDF生成（合計¥996,000）' },
        { input: 'ベータ商事にライセンス10本', output: '見積書PDF生成（合計¥1,200,000）' },
        { input: 'ガンマ工業にサービス6ヶ月', output: '見積書PDF生成（合計¥300,000）' },
      ];
    case 'ag2':
      return [
        { input: '損害賠償上限なし契約書', output: 'リスク: 高 / 要修正' },
        { input: '秘密保持1年の契約書', output: 'リスク: 中 / 3年以上推奨' },
        { input: '標準契約テンプレート', output: 'リスク: 低 / 問題なし' },
      ];
    case 'ag3':
      return [
        { input: '見積依頼のメール', output: 'カテゴリ: 営業/見積依頼, 優先度: 高' },
        { input: 'セミナー案内メール', output: 'カテゴリ: 情報/セミナー, 優先度: 低' },
        { input: 'クレーム対応メール', output: 'カテゴリ: サポート/苦情, 優先度: 緊急' },
        { input: '社内連絡メール', output: 'カテゴリ: 社内/通知, 優先度: 通常' },
      ];
    case 'ag4':
      return [
        { input: '1時間の営業会議音声', output: '要約: 5項目, AI: 3件' },
        { input: '30分の定例ミーティング', output: '要約: 3項目, AI: 2件' },
        { input: '2時間のプロジェクト会議', output: '要約: 8項目, AI: 5件' },
      ];
    default:
      return [
        { input: 'サンプル入力1', output: 'サンプル出力1' },
        { input: 'サンプル入力2', output: 'サンプル出力2' },
        { input: 'サンプル入力3', output: 'サンプル出力3' },
      ];
  }
}

const MOCK_TRAINING_HISTORY = [
  { date: '2026-03-20 14:30', method: 'ファインチューニング', dataCount: 150, accuracy: 94.2, status: '完了' as const },
  { date: '2026-03-15 10:00', method: 'RAG更新', dataCount: 80, accuracy: 91.8, status: '完了' as const },
  { date: '2026-03-10 09:15', method: 'プロンプト最適化', dataCount: 50, accuracy: 88.5, status: '完了' as const },
];

function getReferencingWorkflows(agentId: string) {
  const wfIds = new Set<string>();
  for (const ver of workflowVersions) {
    for (const node of ver.nodes) {
      if (node.config && (node.config as Record<string, unknown>).agentId === agentId) {
        wfIds.add(ver.workflowId);
      }
    }
  }
  return workflows.filter((wf) => wfIds.has(wf.id));
}

export default function AgentDetail() {
  const { id } = useParams<{ id: string }>();
  const agent = aiAgents.find((a) => a.id === id);

  const [activeTab, setActiveTab] = useState<Tab>('playground');

  // Settings state
  const [name, setName] = useState(agent?.name ?? '');
  const [description, setDescription] = useState(agent?.description ?? '');
  const [instructions, setInstructions] = useState(agent?.instructions ?? '');
  const [capabilities, setCapabilities] = useState<string[]>(agent?.capabilities ?? []);
  const [selectedDataSources, setSelectedDataSources] = useState<string[]>(agent?.dataSourceIds ?? []);
  const [version] = useState(agent?.version ?? 1);
  const [status, setStatus] = useState<AgentStatus>(agent?.status ?? 'draft');

  // Playground state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Training state
  const [trainingMethod, setTrainingMethod] = useState('fine_tuning');
  const [learningRate, setLearningRate] = useState(50);
  const [epochs, setEpochs] = useState(3);
  const [isTraining, setIsTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [trainingResult, setTrainingResult] = useState<string | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  if (!agent) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-gray-500">エージェントが見つかりません (ID: {id})</p>
        <Link to="/agents" className="mt-3 text-sm text-indigo-600 hover:text-indigo-700">
          一覧に戻る
        </Link>
      </div>
    );
  }

  const referencingWorkflows = getReferencingWorkflows(agent.id);
  const avatarColor = getAvatarColor(agent.id);

  const toggleCapability = (cap: string) => {
    setCapabilities((prev) =>
      prev.includes(cap) ? prev.filter((c) => c !== cap) : [...prev, cap]
    );
  };

  const toggleDataSource = (dsId: string) => {
    setSelectedDataSources((prev) =>
      prev.includes(dsId) ? prev.filter((d) => d !== dsId) : [...prev, dsId]
    );
  };

  const handleSendMessage = () => {
    const text = inputValue.trim();
    if (!text || isTyping) return;

    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setInputValue('');
    setIsTyping(true);

    setTimeout(() => {
      const response = getMockResponse(agent.id, text);
      setMessages((prev) => [...prev, { role: 'agent', content: response }]);
      setIsTyping(false);
    }, 1000);
  };

  const handleStartTraining = () => {
    if (isTraining) return;
    setIsTraining(true);
    setTrainingProgress(0);
    setTrainingResult(null);

    const interval = setInterval(() => {
      setTrainingProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsTraining(false);
          setTrainingResult('学習完了！精度: 94.2%');
          return 100;
        }
        return prev + 3.33;
      });
    }, 100);
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'playground', label: 'プレイグラウンド' },
    { key: 'settings', label: '設定' },
    { key: 'training', label: '学習' },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/agents" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-xl text-lg font-bold text-white ${avatarColor}`}
          >
            {agent.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{agent.name}</h1>
            <p className="text-sm text-gray-500">{agent.description}</p>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative pb-3 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'text-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              {activeTab === tab.key && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-indigo-600" />
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}

      {/* ============ PLAYGROUND ============ */}
      {activeTab === 'playground' && (
        <div className="flex flex-col rounded-2xl border border-gray-200 bg-white shadow-sm" style={{ height: '70vh' }}>
          {/* Chat area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div
                  className={`flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-bold text-white ${avatarColor}`}
                >
                  {agent.name.charAt(0)}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">{agent.name}</h3>
                <p className="mt-1 max-w-md text-sm text-gray-500">
                  このエージェントにメッセージを送信してテストできます。何でもお気軽にどうぞ。
                </p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'agent' && (
                  <div
                    className={`mr-2 mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white ${avatarColor}`}
                  >
                    {agent.name.charAt(0)}
                  </div>
                )}
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-md'
                      : 'bg-gray-100 text-gray-800 rounded-bl-md'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div
                  className={`mr-2 mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white ${avatarColor}`}
                >
                  {agent.name.charAt(0)}
                </div>
                <div className="rounded-2xl rounded-bl-md bg-gray-100 px-4 py-3">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                placeholder="メッセージを入力..."
                className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm placeholder:text-gray-400 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
              <button
                onClick={handleSendMessage}
                disabled={isTyping || !inputValue.trim()}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            <div className="mt-3 flex justify-end">
              <Link
                to="/workflows"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                このエージェントをフローに追加
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ============ SETTINGS ============ */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Form */}
          <div className="lg:col-span-2 space-y-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            {/* エージェント名 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">エージェント名</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            {/* 目的 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">目的</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            {/* 指示文 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">指示文</label>
              <textarea
                rows={6}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            {/* 能力タグ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">能力タグ</label>
              <div className="flex flex-wrap gap-3">
                {ALL_CAPABILITIES.map((cap) => (
                  <label key={cap} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={capabilities.includes(cap)}
                      onChange={() => toggleCapability(cap)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    {cap}
                  </label>
                ))}
              </div>
            </div>

            {/* 参照データ元本 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">参照データ元本</label>
              <div className="flex flex-wrap gap-3">
                {dataSources.map((ds) => (
                  <label key={ds.id} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedDataSources.includes(ds.id)}
                      onChange={() => toggleDataSource(ds.id)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    {ds.name}
                  </label>
                ))}
              </div>
            </div>

            {/* バージョン & 状態 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">バージョン</label>
                <input
                  type="text"
                  value={`v${version}`}
                  readOnly
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">状態</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as AgentStatus)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                >
                  {Object.entries(AGENT_STATUS_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 pt-2">
              <button className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors">
                保存
              </button>
              <button className="rounded-xl border border-gray-300 bg-white px-6 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                複製
              </button>
            </div>
          </div>

          {/* 使用中フロー */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">使用中フロー</h2>
              {referencingWorkflows.length === 0 ? (
                <p className="text-sm text-gray-400">使用中のフローはありません</p>
              ) : (
                <ul className="space-y-2">
                  {referencingWorkflows.map((wf) => (
                    <li key={wf.id}>
                      <Link
                        to={`/workflows/${wf.id}`}
                        className="block rounded-xl border border-gray-100 p-3 text-sm hover:bg-gray-50 transition-colors"
                      >
                        <span className="font-medium text-indigo-600">{wf.name}</span>
                        <span className="ml-2 text-xs text-gray-400">v{wf.currentVersion}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============ TRAINING ============ */}
      {activeTab === 'training' && (
        <div className="space-y-6">
          {/* 学習データ */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900 mb-4">学習データ</h2>

            {/* Upload area */}
            <div className="mb-4 flex items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-6 text-center">
              <div>
                <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-8m0 0l-3 3m3-3l3 3M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
                </svg>
                <p className="mt-2 text-sm text-gray-500">ファイルをドラッグ&ドロップ、またはクリックして選択</p>
                <input type="file" className="mt-2 text-xs text-gray-500" />
              </div>
            </div>

            {/* Or paste text */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">またはテキストで学習データを入力</label>
              <textarea
                rows={3}
                placeholder="入力と出力のペアを記述..."
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            {/* Existing training data table */}
            <h3 className="text-sm font-medium text-gray-700 mb-2">既存の学習データ</h3>
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-medium text-gray-600">#</th>
                    <th className="px-4 py-2.5 text-left font-medium text-gray-600">入力</th>
                    <th className="px-4 py-2.5 text-left font-medium text-gray-600">出力</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {getMockTrainingData(agent.id).map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 text-gray-400">{i + 1}</td>
                      <td className="px-4 py-2.5 text-gray-800">{row.input}</td>
                      <td className="px-4 py-2.5 text-gray-800">{row.output}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 学習設定 */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900 mb-4">学習設定</h2>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              {/* トレーニング手法 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">トレーニング手法</label>
                <select
                  value={trainingMethod}
                  onChange={(e) => setTrainingMethod(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="fine_tuning">ファインチューニング</option>
                  <option value="rag">RAG更新</option>
                  <option value="prompt_opt">プロンプト最適化</option>
                </select>
              </div>

              {/* 学習率 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  学習率: {learningRate <= 33 ? '低' : learningRate <= 66 ? '中' : '高'}
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={learningRate}
                  onChange={(e) => setLearningRate(Number(e.target.value))}
                  className="w-full accent-indigo-600 mt-1"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                  <span>低</span>
                  <span>中</span>
                  <span>高</span>
                </div>
              </div>

              {/* エポック数 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">エポック数</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={epochs}
                  onChange={(e) => setEpochs(Number(e.target.value))}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            </div>

            {/* 学習開始 button + progress */}
            <div className="mt-5">
              <button
                onClick={handleStartTraining}
                disabled={isTraining}
                className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isTraining ? '学習中...' : '学習開始'}
              </button>

              {(isTraining || trainingResult) && (
                <div className="mt-4 space-y-2">
                  {/* Progress bar */}
                  <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full rounded-full bg-indigo-600 transition-all duration-100"
                      style={{ width: `${Math.min(trainingProgress, 100)}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-600">
                    {trainingResult ? (
                      <span className="font-semibold text-green-600">{trainingResult}</span>
                    ) : (
                      `進捗: ${Math.min(Math.round(trainingProgress), 100)}%`
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 学習履歴 */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900 mb-4">学習履歴</h2>
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-medium text-gray-600">日時</th>
                    <th className="px-4 py-2.5 text-left font-medium text-gray-600">手法</th>
                    <th className="px-4 py-2.5 text-left font-medium text-gray-600">データ件数</th>
                    <th className="px-4 py-2.5 text-left font-medium text-gray-600">精度</th>
                    <th className="px-4 py-2.5 text-left font-medium text-gray-600">状態</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {MOCK_TRAINING_HISTORY.map((run, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 text-gray-600">{run.date}</td>
                      <td className="px-4 py-2.5 text-gray-800">{run.method}</td>
                      <td className="px-4 py-2.5 text-gray-800">{run.dataCount}件</td>
                      <td className="px-4 py-2.5 text-gray-800">{run.accuracy}%</td>
                      <td className="px-4 py-2.5">
                        <span className="inline-block rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                          {run.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-4 text-xs text-gray-400">
              ※ MVPではダミー実装です。実際のモデル学習は行われません。
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
