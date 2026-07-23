'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/lib/api-client';

interface DashboardStats {
  totalPatients: number;
  todayAppointments: number;
  pendingClaims: number;
  unreadMessages: number;
}

export default function DashboardPage() {
  const { accessToken, user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) return;
    api.get<DashboardStats>('/reports/dashboard', accessToken)
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [accessToken]);

  const cards = [
    { label: 'Total Patients', value: stats?.totalPatients ?? 0, color: 'bg-blue-500' },
    { label: "Today's Appointments", value: stats?.todayAppointments ?? 0, color: 'bg-green-500' },
    { label: 'Pending Claims', value: stats?.pendingClaims ?? 0, color: 'bg-yellow-500' },
    { label: 'Unread Messages', value: stats?.unreadMessages ?? 0, color: 'bg-purple-500' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.firstName || 'Provider'}
        </h1>
        <p className="mt-1 text-sm text-gray-500">Here&apos;s what&apos;s happening today.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-lg border bg-white p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className={`h-12 w-12 rounded-lg ${card.color} flex items-center justify-center text-white text-lg font-bold`}>
                {loading ? '...' : card.value}
              </div>
              <div>
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {loading ? '—' : card.value}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <a href="/patients" className="rounded-md border p-3 text-center text-sm hover:bg-gray-50">
              New Patient
            </a>
            <a href="/scheduling" className="rounded-md border p-3 text-center text-sm hover:bg-gray-50">
              Schedule Appointment
            </a>
            <a href="/encounters" className="rounded-md border p-3 text-center text-sm hover:bg-gray-50">
              New Encounter
            </a>
            <a href="/billing" className="rounded-md border p-3 text-center text-sm hover:bg-gray-50">
              Enter Charge
            </a>
          </div>
        </div>

        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
          <div className="mt-4 space-y-3">
            <p className="text-sm text-gray-500">No recent activity to display.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
