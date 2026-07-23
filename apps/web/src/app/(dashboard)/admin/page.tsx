'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/lib/api-client';
import { formatDate } from '@/lib/utils';

export default function AdminPage() {
  const { accessToken } = useAuthStore();
  const [users, setUsers] = useState<any[]>([]);
  const [facilities, setFacilities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('users');

  useEffect(() => {
    if (!accessToken) return;
    Promise.all([
      api.get('/admin/users?limit=20', accessToken).catch(() => ({ data: [] })),
      api.get('/facilities?limit=20', accessToken).catch(() => ({ data: [] })),
    ]).then(([usersRes, facRes]: any[]) => {
      setUsers(usersRes.data || []);
      setFacilities(facRes.data || []);
    }).finally(() => setLoading(false));
  }, [accessToken]);

  const tabs = ['users', 'roles', 'facilities', 'settings', 'audit-log'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Administration</h1>
        <button className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
          + Add User
        </button>
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

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="rounded-lg border bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Email</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Role</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Last Login</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No users found</td></tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{user.firstName} {user.lastName}</td>
                      <td className="px-4 py-3 text-gray-500">{user.email}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium">
                          {user.roles?.[0]?.role?.name || 'Staff'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Never'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Roles Tab */}
      {activeTab === 'roles' && (
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900">Role Management</h3>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {['Administrator', 'Physician', 'Nurse Practitioner', 'Medical Assistant', 'Front Desk', 'Billing Specialist', 'Lab Technician', 'Patient'].map((role) => (
              <div key={role} className="flex items-center justify-between rounded-md border px-4 py-3">
                <span className="text-sm text-gray-700">{role}</span>
                <button className="text-xs text-indigo-600 hover:underline">Edit</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Facilities Tab */}
      {activeTab === 'facilities' && (
        <div className="rounded-lg border bg-white shadow-sm">
          <div className="divide-y">
            {facilities.length === 0 ? (
              <p className="p-4 text-center text-sm text-gray-500">No facilities configured</p>
            ) : (
              facilities.map((fac) => (
                <div key={fac.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{fac.name}</p>
                    <p className="text-xs text-gray-500">{fac.address}, {fac.city}, {fac.state}</p>
                  </div>
                  <button className="text-xs text-indigo-600 hover:underline">Edit</button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900">System Settings</h3>
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between rounded-md border px-4 py-3">
              <div>
                <p className="text-sm font-medium text-gray-700">Practice Name</p>
                <p className="text-xs text-gray-500">Displayed across the application</p>
              </div>
              <input className="rounded border px-3 py-1 text-sm" defaultValue="CareForge Medical" />
            </div>
            <div className="flex items-center justify-between rounded-md border px-4 py-3">
              <div>
                <p className="text-sm font-medium text-gray-700">Default Facility</p>
                <p className="text-xs text-gray-500">Primary practice location</p>
              </div>
              <select className="rounded border px-3 py-1 text-sm">
                <option>Main Office</option>
              </select>
            </div>
            <div className="flex items-center justify-between rounded-md border px-4 py-3">
              <div>
                <p className="text-sm font-medium text-gray-700">Session Timeout (minutes)</p>
                <p className="text-xs text-gray-500">Auto-logout after inactivity</p>
              </div>
              <input type="number" className="w-20 rounded border px-3 py-1 text-sm" defaultValue={30} />
            </div>
          </div>
        </div>
      )}

      {/* Audit Log Tab */}
      {activeTab === 'audit-log' && (
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900">Audit Trail</h3>
          <p className="mt-2 text-sm text-gray-500">
            HIPAA-compliant audit logging is active. All data access, modifications, and exports are tracked.
          </p>
          <div className="mt-4 flex gap-2">
            <input type="date" className="rounded border px-3 py-1 text-sm" />
            <select className="rounded border px-3 py-1 text-sm">
              <option>All Actions</option>
              <option>Create</option>
              <option>Read</option>
              <option>Update</option>
              <option>Delete</option>
              <option>Export</option>
            </select>
            <button className="rounded bg-indigo-50 px-3 py-1 text-sm text-indigo-600 hover:bg-indigo-100">Filter</button>
          </div>
        </div>
      )}
    </div>
  );
}
