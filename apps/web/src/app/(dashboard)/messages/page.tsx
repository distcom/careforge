'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/lib/api-client';
import { formatDate } from '@/lib/utils';

export default function MessagesPage() {
  const { accessToken } = useAuthStore();
  const [threads, setThreads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedThread, setSelectedThread] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    if (!accessToken) return;
    api.get('/messages/threads?limit=20', accessToken)
      .then((res: any) => setThreads(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [accessToken]);

  const loadThread = (thread: any) => {
    setSelectedThread(thread);
    if (!accessToken) return;
    api.get(`/messages/threads/${thread.id}/messages`, accessToken)
      .then((res: any) => setMessages(res.data || []))
      .catch(() => {});
  };

  const sendReply = async () => {
    if (!replyText.trim() || !selectedThread || !accessToken) return;
    try {
      await api.post(`/messages/threads/${selectedThread.id}/messages`, { body: replyText }, accessToken);
      setReplyText('');
      loadThread(selectedThread);
    } catch {}
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
        <button className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
          + New Message
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Thread List */}
        <div className="rounded-lg border bg-white shadow-sm lg:col-span-1">
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-semibold text-gray-700">Inbox</h2>
          </div>
          <div className="max-h-[500px] overflow-y-auto">
            {loading ? (
              <p className="p-4 text-center text-sm text-gray-500">Loading...</p>
            ) : threads.length === 0 ? (
              <p className="p-4 text-center text-sm text-gray-500">No messages</p>
            ) : (
              threads.map((thread) => (
                <button
                  key={thread.id}
                  onClick={() => loadThread(thread)}
                  className={`w-full border-b px-4 py-3 text-left hover:bg-gray-50 ${
                    selectedThread?.id === thread.id ? 'bg-indigo-50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">{thread.subject}</span>
                    {thread.unreadCount > 0 && (
                      <span className="rounded-full bg-indigo-600 px-1.5 py-0.5 text-xs text-white">{thread.unreadCount}</span>
                    )}
                  </div>
                  <p className="mt-1 truncate text-xs text-gray-500">
                    {thread.participants?.map((p: any) => p.user?.lastName).join(', ') || '—'}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400">{formatDate(thread.updatedAt || thread.createdAt)}</p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Message Thread */}
        <div className="rounded-lg border bg-white shadow-sm lg:col-span-2">
          {selectedThread ? (
            <div className="flex h-[500px] flex-col">
              <div className="border-b px-4 py-3">
                <h2 className="text-sm font-semibold text-gray-900">{selectedThread.subject}</h2>
              </div>
              <div className="flex-1 space-y-4 overflow-y-auto p-4">
                {messages.map((msg) => (
                  <div key={msg.id} className="rounded-lg bg-gray-50 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">
                        {msg.sender?.firstName} {msg.sender?.lastName}
                      </span>
                      <span className="text-xs text-gray-400">{formatDate(msg.createdAt)}</span>
                    </div>
                    <p className="mt-1 text-sm text-gray-700">{msg.body}</p>
                  </div>
                ))}
              </div>
              <div className="border-t p-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendReply()}
                    placeholder="Type a reply..."
                    className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                  <button
                    onClick={sendReply}
                    className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-[500px] items-center justify-center text-sm text-gray-500">
              Select a conversation to view messages
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
