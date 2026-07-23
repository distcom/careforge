'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/lib/api-client';
import { formatDate } from '@/lib/utils';

export default function EncountersPage() {
  const { accessToken } = useAuthStore();
  const [encounters, setEncounters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) return;
    api.get('/encounters?limit=20', accessToken)
      .then((res: any) => setEncounters(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [accessToken]);

  const statusColors: Record<string, string> = {
    IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
    COMPLETED: 'bg-green-100 text-green-700',
    SIGNED: 'bg-blue-100 text-blue-700',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Encounters</h1>
        <button className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
          + New Encounter
        </button>
      </div>

      <div className="rounded-lg border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Date</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Patient</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Provider</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Type</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Chief Complaint</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
              ) : encounters.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No encounters found</td></tr>
              ) : (
                encounters.map((enc) => (
                  <tr key={enc.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">{formatDate(enc.createdAt)}</td>
                    <td className="px-4 py-3 font-medium text-indigo-600">
                      {enc.patient ? `${enc.patient.lastName}, ${enc.patient.firstName}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {enc.provider ? `Dr. ${enc.provider.lastName}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{enc.type}</td>
                    <td className="px-4 py-3 text-gray-500">{enc.chiefComplaint || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[enc.status] || 'bg-gray-100'}`}>
                        {enc.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
