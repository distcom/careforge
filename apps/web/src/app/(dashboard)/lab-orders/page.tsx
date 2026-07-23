'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/lib/api-client';
import { formatDate } from '@/lib/utils';

export default function LabOrdersPage() {
  const { accessToken } = useAuthStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) return;
    api.get('/lab-orders?limit=20', accessToken)
      .then((res: any) => setOrders(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [accessToken]);

  const statusColors: Record<string, string> = {
    ORDERED: 'bg-blue-100 text-blue-700',
    COLLECTED: 'bg-yellow-100 text-yellow-700',
    IN_PROGRESS: 'bg-purple-100 text-purple-700',
    RESULTED: 'bg-green-100 text-green-700',
    REVIEWED: 'bg-emerald-100 text-emerald-700',
    CANCELLED: 'bg-red-100 text-red-700',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Lab Orders</h1>
        <button className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
          + New Lab Order
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Pending</p>
          <p className="mt-1 text-2xl font-bold text-blue-600">{orders.filter(o => o.status === 'ORDERED').length}</p>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">In Progress</p>
          <p className="mt-1 text-2xl font-bold text-purple-600">{orders.filter(o => ['COLLECTED', 'IN_PROGRESS'].includes(o.status)).length}</p>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Resulted</p>
          <p className="mt-1 text-2xl font-bold text-green-600">{orders.filter(o => o.status === 'RESULTED').length}</p>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Needs Review</p>
          <p className="mt-1 text-2xl font-bold text-yellow-600">{orders.filter(o => o.status === 'RESULTED' && !o.reviewedAt).length}</p>
        </div>
      </div>

      {/* Orders Table */}
      <div className="rounded-lg border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Order #</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Patient</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Tests</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Ordered By</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Date</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No lab orders found</td></tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-indigo-600">{order.orderNumber || order.id.slice(0, 8)}</td>
                    <td className="px-4 py-3">
                      {order.patient ? `${order.patient.lastName}, ${order.patient.firstName}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {order.items?.map((i: any) => i.testName).join(', ') || order.labName || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {order.orderedBy ? `Dr. ${order.orderedBy.lastName}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(order.createdAt)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[order.status] || 'bg-gray-100'}`}>
                        {order.status}
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
