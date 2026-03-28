import { useState, useMemo, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  workflows,
  workflowComments,
  users,
  getUserName,
  WF_STATUS_LABELS,
  WF_STATUS_COLORS,
} from '../data/mockData';
import type { Workflow, WorkflowComment } from '../data/mockData';

function getUserInitial(userId: string): string {
  return getUserName(userId).charAt(0);
}

function getUserInitialColor(userId: string): string {
  const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500', 'bg-orange-500'];
  return colors[userId.charCodeAt(1) % colors.length];
}

function renderMentionText(content: string) {
  const parts = content.split(/(@[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}A-Za-z\s]+?(?=\s|$|。|、))/u);
  return parts.map((part, i) =>
    part.startsWith('@')
      ? <span key={i} className="text-blue-600 font-medium bg-blue-50 rounded px-0.5">{part}</span>
      : <span key={i}>{part}</span>
  );
}

export default function Conversations() {
  const { currentUser } = useAuth();
  const userId = currentUser?.id ?? 'u1';

  const [selectedWfId, setSelectedWfId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [showMentionSuggest, setShowMentionSuggest] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  // Workflows that have comments, sorted by latest comment
  const wfWithComments = useMemo(() => {
    const wfMap = new Map<string, { wf: Workflow; comments: WorkflowComment[]; latestAt: string }>();
    workflowComments.forEach(c => {
      const existing = wfMap.get(c.workflowId);
      if (existing) {
        existing.comments.push(c);
        if (c.createdAt > existing.latestAt) existing.latestAt = c.createdAt;
      } else {
        const wf = workflows.find(w => w.id === c.workflowId);
        if (wf) wfMap.set(c.workflowId, { wf, comments: [c], latestAt: c.createdAt });
      }
    });
    // Also add workflows without comments
    workflows.forEach(wf => {
      if (!wfMap.has(wf.id)) {
        wfMap.set(wf.id, { wf, comments: [], latestAt: '' });
      }
    });
    return [...wfMap.values()].sort((a, b) => b.latestAt.localeCompare(a.latestAt));
  }, []);

  const activeThread = useMemo(() => {
    if (!selectedWfId) return wfWithComments[0] ?? null;
    return wfWithComments.find(w => w.wf.id === selectedWfId) ?? null;
  }, [selectedWfId, wfWithComments]);

  const activeComments = useMemo(() => {
    if (!activeThread) return [];
    return [...activeThread.comments].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }, [activeThread]);

  // Mention candidates
  const mentionCandidates = useMemo(() => {
    const q = mentionQuery.toLowerCase();
    const userCandidates = users
      .filter(u => u.name.toLowerCase().includes(q) || u.department.toLowerCase().includes(q))
      .map(u => ({ type: 'user' as const, id: u.id, label: u.name, sub: u.department }));
    const depts = [...new Set(users.map(u => u.department))];
    const deptCandidates = depts
      .filter(d => d.toLowerCase().includes(q))
      .map(d => ({ type: 'department' as const, id: d, label: d, sub: '' }));
    return [...userCandidates, ...deptCandidates].slice(0, 8);
  }, [mentionQuery]);

  const handleCommentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setCommentText(val);
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@([^\s@]*)$/);
    if (atMatch) {
      setShowMentionSuggest(true);
      setMentionQuery(atMatch[1]);
    } else {
      setShowMentionSuggest(false);
      setMentionQuery('');
    }
  }, []);

  const insertMention = useCallback((label: string) => {
    const textarea = commentInputRef.current;
    if (!textarea) return;
    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = commentText.slice(0, cursorPos);
    const atIdx = textBeforeCursor.lastIndexOf('@');
    if (atIdx === -1) return;
    const before = commentText.slice(0, atIdx);
    const after = commentText.slice(cursorPos);
    const newText = `${before}@${label} ${after}`;
    setCommentText(newText);
    setShowMentionSuggest(false);
    setMentionQuery('');
    setTimeout(() => {
      textarea.focus();
      const newPos = atIdx + label.length + 2;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  }, [commentText]);

  const handleSend = useCallback(() => {
    if (!commentText.trim()) return;
    alert(`コメントを投稿しました（モック）: ${commentText}`);
    setCommentText('');
  }, [commentText]);

  const activeWfId = activeThread?.wf.id ?? null;

  return (
    <div className="flex h-full">
      {/* Left: Workflow list */}
      <div className="w-80 bg-white border-r flex flex-col flex-shrink-0">
        <div className="px-4 py-3 border-b bg-gray-50">
          <h2 className="text-sm font-bold text-gray-700">会話</h2>
          <p className="text-xs text-gray-400 mt-0.5">ワークフローごとの会話スレッド</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {wfWithComments.map(({ wf, comments, latestAt }) => {
            const isActive = wf.id === activeWfId;
            const lastComment = comments.length > 0
              ? [...comments].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
              : null;
            const unreadHint = lastComment && lastComment.mentions.some(m =>
              (m.type === 'user' && m.value === userId) ||
              (m.type === 'department' && currentUser?.department === m.value)
            );

            return (
              <button
                key={wf.id}
                onClick={() => setSelectedWfId(wf.id)}
                className={`w-full text-left px-4 py-3 border-b border-gray-100 transition-colors ${
                  isActive ? 'bg-blue-50 border-l-2 border-l-blue-500' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm font-medium truncate ${isActive ? 'text-blue-700' : 'text-gray-800'}`}>
                    {wf.name}
                  </span>
                  {comments.length > 0 && (
                    <span className="text-[10px] text-gray-400 flex-shrink-0 ml-2">{comments.length}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${WF_STATUS_COLORS[wf.status]}`}>
                    {WF_STATUS_LABELS[wf.status]}
                  </span>
                  {unreadHint && (
                    <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                  )}
                </div>
                {lastComment && (
                  <div className="mt-1.5 text-xs text-gray-500 truncate">
                    <span className="font-medium">{getUserName(lastComment.authorId)}</span>: {lastComment.content.slice(0, 40)}...
                  </div>
                )}
                {latestAt && <div className="text-[10px] text-gray-400 mt-0.5">{latestAt}</div>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Right: Active conversation thread */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeThread ? (
          <>
            {/* Thread header */}
            <div className="px-6 py-3 border-b bg-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-800">{activeThread.wf.name}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`px-2 py-0.5 rounded text-xs ${WF_STATUS_COLORS[activeThread.wf.status]}`}>
                    {WF_STATUS_LABELS[activeThread.wf.status]}
                  </span>
                  <span className="text-xs text-gray-400">{activeComments.length}件のメッセージ</span>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-gray-50">
              {activeComments.length === 0 && (
                <div className="text-center text-sm text-gray-400 py-12">
                  まだ会話がありません。最初のメッセージを送信してください。
                </div>
              )}
              {activeComments.map(c => {
                const isMe = c.authorId === userId;
                return (
                  <div key={c.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full ${getUserInitialColor(c.authorId)} text-white flex items-center justify-center text-xs font-bold flex-shrink-0`}>
                      {getUserInitial(c.authorId)}
                    </div>
                    <div className={`max-w-[70%] ${isMe ? 'items-end' : ''}`}>
                      <div className={`flex items-center gap-2 mb-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                        <span className="text-xs font-semibold text-gray-700">{getUserName(c.authorId)}</span>
                        <span className="text-[10px] text-gray-400">{c.createdAt}</span>
                      </div>
                      <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        isMe
                          ? 'bg-blue-600 text-white rounded-tr-sm'
                          : 'bg-white border border-gray-200 text-gray-700 rounded-tl-sm'
                      }`}>
                        {isMe
                          ? c.content
                          : renderMentionText(c.content)
                        }
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Message input */}
            <div className="px-6 py-4 bg-white border-t relative">
              {showMentionSuggest && mentionCandidates.length > 0 && (
                <div className="absolute bottom-full left-6 mb-1 w-64 bg-white border rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                  {mentionCandidates.map(mc => (
                    <button key={`${mc.type}-${mc.id}`} onClick={() => insertMention(mc.label)}
                      className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm flex items-center gap-2 border-b border-gray-50 last:border-0">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] text-white font-bold ${mc.type === 'user' ? 'bg-blue-500' : 'bg-gray-500'}`}>
                        {mc.type === 'user' ? mc.label.charAt(0) : '部'}
                      </span>
                      <div>
                        <div className="font-medium text-gray-700">{mc.label}</div>
                        {mc.sub && <div className="text-[10px] text-gray-400">{mc.sub}</div>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <textarea
                  ref={commentInputRef}
                  value={commentText}
                  onChange={handleCommentChange}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); handleSend(); } }}
                  placeholder="メッセージを入力... (@で社員・部署をメンション)"
                  rows={2}
                  className="flex-1 border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none"
                />
                <button onClick={handleSend} disabled={!commentText.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium self-end">
                  送信
                </button>
              </div>
              <div className="text-[10px] text-gray-400 mt-1">Ctrl+Enter で送信 | @で社員・部署をメンション</div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            ワークフローを選択してください
          </div>
        )}
      </div>
    </div>
  );
}
