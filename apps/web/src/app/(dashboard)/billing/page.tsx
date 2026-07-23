'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/lib/api-client';
import { formatDate } from '@/lib/utils';

export default function BillingPage() {
  const { accessToken } = useAuthStore();
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('claims');

  useEffect(() => {
    if (!accessToken) return;
    api.get('/billing/claims?limit=20', accessToken)
      .then((res: any) => setClaims(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [accessToken]);

  const statusColors: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-700',
    SUBMITTED: 'bg-blue-100 text-blue-700',
    ACCEPTED: 'bg-green-100 text-green-700',
    REJECTED: 'bg-red-100 text-red-700',
    PAID: 'bg-emerald-100 text-emerald-700',
    PARTIALLY_PAID: 'bg-yellow-100 text-yellow-700',
  };

  const tabs = ['claims', 'charges', 'payments', 'fee-schedules'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
        <div className="flex gap-2">
          <button className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            New Charge
          </button>
          <button className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
            + New Claim
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Outstanding A/R</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">$0.00</p>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Pending Claims</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{claims.filter(c => c.status === 'SUBMITTED').length}</p>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Rejected Claims</p>
          <p className="mt-1 text-2xl font-bold text-red-600">{claims.filter(c => c.status === 'REJECTED').length}</p>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Payments (30d)</p>
          <p className="mt-1 text-2xl font-bold text-green-600">$0.00</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <nav className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`border-b-2 pb-2 text-sm font-medium capitalize ${
                activeTab === tab
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.replace('-', ' ')}
            </button>
          ))}
        </nav>
      </div>

      {/* Claims Table */}
      {activeTab === 'claims' && (
        <div className="rounded-lg border bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Claim #</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Patient</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Payer</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Amount</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
                ) : claims.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No claims found</td></tr>
                ) : (
                  claims.map((claim) => (
                    <tr key={claim.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-indigo-600">{claim.claimNumber}</td>
                      <td className="px-4 py-3">{claim.patient?.lastName}, {claim.patient?.firstName}</td>
                      <td className="px-4 py-3 text-gray-500">{claim.payerName || '—'}</td>
                      <td className="px-4 py-3">${(claim.totalAmount || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-gray-500">{formatDate(claim.createdAt)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[claim.status] || 'bg-gray-100'}`}>
                          {claim.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'charges' && (
        <div className="rounded-lg border bg-white p-8 text-center text-gray-500 shadow-sm">
          Charge entry and management will be displayed here.
        </div>
      )}
      {activeTab === 'payments' && (
        <div className="rounded-lg border bg-white p-8 text-center text-gray-500 shadow-sm">
          Payment posting and history will be displayed here.
        </div>
      )}
      {activeTab === 'fee-schedules' && (
        <div className="rounded-lg border bg-white p-8 text-center text-gray-500 shadow-sm">
          Fee schedule management will be displayed here.
        </div>
      )}
    </div>
  );
}
