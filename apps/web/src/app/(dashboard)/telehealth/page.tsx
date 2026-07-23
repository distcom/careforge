'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/lib/api-client';

interface TelehealthSession {
  id: string;
  roomCode: string;
  status: string;
  scheduledAt: string;
  startedAt?: string;
  endedAt?: string;
  maxDuration: number;
  patient?: { id: string; firstName: string; lastName: string };
}

const statusColors: Record<string, string> = {
  SCHEDULED: 'bg-blue-100 text-blue-800',
  ACTIVE: 'bg-green-100 text-green-800',
  IN_PROGRESS: 'bg-green-100 text-green-800',
  COMPLETED: 'bg-gray-100 text-gray-800',
  CANCELLED: 'bg-red-100 text-red-800',
  WAITING: 'bg-yellow-100 text-yellow-800',
};

export default function TelehealthPage() {
  const { accessToken } = useAuthStore();
  const [sessions, setSessions] = useState<TelehealthSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ patientId: '', scheduledAt: '', maxDurationMinutes: 30 });

  const fetchSessions = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter) params.set('status', filter);
      const res = await api.get<any>(`/telehealth/sessions?${params}`, accessToken);
      setSessions(Array.isArray(res) ? res : res?.data || []);
    } catch {
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [accessToken, filter]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const handleCreate = async () => {
    if (!accessToken || !createForm.patientId) return;
    try {
      await api.post('/telehealth/sessions', {
        patientId: createForm.patientId,
        scheduledAt: createForm.scheduledAt || undefined,
        maxDurationMinutes: createForm.maxDurationMinutes,
      }, accessToken);
      setShowCreate(false);
      setCreateForm({ patientId: '', scheduledAt: '', maxDurationMinutes: 30 });
      fetchSessions();
    } catch (err: any) {
      alert(err.message || 'Failed to create session');
    }
  };

  const handleCancel = async (id: string) => {
    if (!accessToken) return;
    const reason = prompt('Cancellation reason:');
    if (!reason) return;
    try {
      await api.post(`/telehealth/sessions/${id}/cancel`, { reason }, accessToken);
      fetchSessions();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel session');
    }
  };

  const handleStart = async (id: string) => {
    if (!accessToken) return;
    try {
      await api.put(`/telehealth/sessions/${id}/status`, { status: 'ACTIVE' }, accessToken);
      fetchSessions();
    } catch (err: any) {
      alert(err.message || 'Failed to start session');
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Telehealth</h1>
          <p className="text-sm text-gray-500">Manage virtual visit sessions</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          + New Session
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-2">
        {['', 'SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filter === s ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="mb-4 rounded-lg border bg-white p-4 shadow-sm">
          <h3 className="mb-3 font-medium text-gray-900">Schedule Telehealth Session</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input
              type="text"
              placeholder="Patient ID"
              value={createForm.patientId}
              onChange={(e) => setCreateForm({ ...createForm, patientId: e.target.value })}
              className="rounded-md border px-3 py-2 text-sm"
            />
            <input
              type="datetime-local"
              value={createForm.scheduledAt}
              onChange={(e) => setCreateForm({ ...createForm, scheduledAt: e.target.value })}
              className="rounded-md border px-3 py-2 text-sm"
            />
            <select
              value={createForm.maxDurationMinutes}
              onChange={(e) => setCreateForm({ ...createForm, maxDurationMinutes: Number(e.target.value) })}
              className="rounded-md border px-3 py-2 text-sm"
            >
              <option value={15}>15 min</option>
              <option value={30}>30 min</option>
              <option value={45}>45 min</option>
              <option value={60}>60 min</option>
            </select>
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={handleCreate} className="rounded-md bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700">
              Create Session
            </button>
            <button onClick={() => setShowCreate(false)} className="rounded-md border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Sessions Table */}
      <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Room</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Patient</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Scheduled</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Duration</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">Loading sessions...</td></tr>
            ) : sessions.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">No telehealth sessions found</td></tr>
            ) : (
              sessions.map((session) => (
                <tr key={session.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono font-medium text-indigo-600">{session.roomCode}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {session.patient ? `${session.patient.firstName} ${session.patient.lastName}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[session.status] || 'bg-gray-100 text-gray-800'}`}>
                      {session.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(session.scheduledAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{session.maxDuration} min</td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex gap-2">
                      {session.status === 'SCHEDULED' && (
                        <>
                          <button onClick={() => handleStart(session.id)} className="text-green-600 hover:text-green-800">
                            Start
                          </button>
                          <button onClick={() => handleCancel(session.id)} className="text-red-600 hover:text-red-800">
                            Cancel
                          </button>
                        </>
                      )}
                      {session.status === 'ACTIVE' && (
                        <span className="text-xs text-green-600 font-medium">● In Progress</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
