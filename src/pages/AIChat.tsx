import { useState, useRef, useEffect } from 'react';

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
  hasSuggestion?: boolean;
}

interface AIChatProps {
  isOpen: boolean;
  onClose: () => void;
}

function generateAIResponse(userMessage: string): { text: string; hasSuggestion: boolean } {
  if (userMessage.includes('見積')) {
    return {
      text: '見積フローについてですね。以下の構成をお勧めします:\n\n1. 開始 → AI実行（見積書生成AI）\n2. 人間タスク（営業担当が内容確認）\n3. 承認（上長承認）\n4. 条件分岐（金額による分岐）\n5. 通知（顧客へメール送信）\n6. 終了\n\n金額が100万円以上の場合は部長承認を追加することも可能です。',
      hasSuggestion: true,
    };
  }
  if (userMessage.includes('契約')) {
    return {
      text: '契約書レビューフローの提案です:\n\n1. 開始 → AI実行（契約書レビューAI）\n2. 条件分岐（リスクスコアで分岐）\n3. リスク高 → 人間タスク（法務確認）→ 承認\n4. リスク低 → 通知（担当者へ結果通知）\n5. 終了\n\nAIがリスク箇所を自動検出し、重要度に応じて法務部門へエスカレーションします。',
      hasSuggestion: true,
    };
  }
  if (userMessage.includes('承認') || userMessage.includes('申請')) {
    return {
      text: '承認フローの設計ポイントです:\n\n- 承認ノードでは「差し戻し可否」と「コメント必須」を設定できます\n- 承認種別は「業務承認」「変更承認」「AI能力変更承認」から選択可能です\n- 却下時のルートも設定しておくと、例外発火ノードで適切に処理できます\n\n具体的なフロー構成をご希望ですか？',
      hasSuggestion: false,
    };
  }
  return {
    text: 'ワークフローの設計についてお手伝いします。以下のようなノードを組み合わせてフローを構築できます:\n\n- **AI実行**: AIエージェントによる自動処理\n- **人間タスク**: 担当者による手動作業\n- **承認**: 上長や責任者による承認ステップ\n- **条件分岐**: 条件に基づくルート分岐\n\n具体的な業務内容を教えていただければ、最適なフロー構成を提案します。',
    hasSuggestion: true,
  };
}

export default function AIChat({ isOpen, onClose }: AIChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init',
      role: 'ai',
      text: 'こんにちは！ワークフロー設計のお手伝いをします。どのような業務フローを作成しますか？',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: trimmed,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    setTimeout(() => {
      const response = generateAIResponse(trimmed);
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'ai',
        text: response.text,
        hasSuggestion: response.hasSuggestion,
      };
      setMessages((prev) => [...prev, aiMsg]);
      setIsLoading(false);
    }, 1000);
  };

  const handleApply = () => {
    alert('フローに反映しました');
  };

  if (!isOpen) return null;

  return (
    <div className="flex flex-col h-full border-l border-gray-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
        <div className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <span className="font-semibold text-gray-800 text-sm">AIアシスタント</span>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded hover:bg-gray-100"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {msg.text}
              {msg.role === 'ai' && msg.hasSuggestion && (
                <button
                  onClick={handleApply}
                  className="mt-2 block w-full text-center bg-purple-600 text-white text-xs py-1.5 px-3 rounded hover:bg-purple-700 transition-colors"
                >
                  フローに反映
                </button>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-500 rounded-lg px-4 py-2 text-sm">
              <span className="inline-flex gap-1">
                <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
                <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
                <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
              </span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="質問を入力..."
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            送信
          </button>
        </div>
      </div>
    </div>
  );
}
