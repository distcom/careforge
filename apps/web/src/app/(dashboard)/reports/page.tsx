'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/lib/api-client';

export default function ReportsPage() {
  const { accessToken } = useAuthStore();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) return;
    api.get('/reports/dashboard', accessToken)
      .then((res: any) => setReports(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [accessToken]);

  const reportCategories = [
    { name: 'Clinical', icon: '🩺', description: 'Patient census, conditions, quality measures' },
    { name: 'Financial', icon: '💰', description: 'Revenue, A/R aging, collections' },
    { name: 'Operational', icon: '📊', description: 'Scheduling, provider productivity' },
    { name: 'Regulatory', icon: '📋', description: 'CMS quality measures, compliance' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
        <button className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
          + Custom Report
        </button>
      </div>

      {/* Report Categories */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {reportCategories.map((cat) => (
          <div key={cat.name} className="cursor-pointer rounded-lg border bg-white p-4 shadow-sm transition hover:border-indigo-300 hover:shadow-md">
            <span className="text-2xl">{cat.icon}</span>
            <h3 className="mt-2 font-semibold text-gray-900">{cat.name}</h3>
            <p className="mt-1 text-xs text-gray-500">{cat.description}</p>
          </div>
        ))}
      </div>

      {/* Quick Reports */}
      <div className="rounded-lg border bg-white shadow-sm">
        <div className="border-b px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-700">Available Reports</h2>
        </div>
        <div className="divide-y">
          {loading ? (
            <p className="p-4 text-center text-sm text-gray-500">Loading...</p>
          ) : reports.length === 0 ? (
            <div className="p-4">
              <p className="text-sm text-gray-500">Pre-built reports:</p>
              <ul className="mt-2 space-y-2">
                {['Patient Census Report', 'Revenue Summary', 'A/R Aging Report', 'Provider Productivity', 'Appointment No-Show Rate', 'Immunization Compliance', 'Lab Turnaround Time', 'Claims Rejection Rate'].map((r) => (
                  <li key={r} className="flex items-center justify-between rounded-md border px-4 py-3">
                    <span className="text-sm text-gray-700">{r}</span>
                    <div className="flex gap-2">
                      <button className="rounded border px-2 py-1 text-xs text-gray-600 hover:bg-gray-50">PDF</button>
                      <button className="rounded border px-2 py-1 text-xs text-gray-600 hover:bg-gray-50">CSV</button>
                      <button className="rounded bg-indigo-50 px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-100">Run</button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            reports.map((report) => (
              <div key={report.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{report.name}</p>
                  <p className="text-xs text-gray-500">{report.description}</p>
                </div>
                <button className="rounded bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-100">
                  Run Report
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
