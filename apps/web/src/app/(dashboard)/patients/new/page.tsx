'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/lib/api-client';

export default function NewPatientPage() {
  const router = useRouter();
  const { accessToken } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    dateOfBirth: '',
    gender: '',
    ssn: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    preferredLanguage: 'English',
    maritalStatus: '',
    employmentStatus: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
  });

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;
    setSaving(true);
    setError('');
    try {
      const patient = await api.post('/patients', form, accessToken);
      router.push(`/patients/${patient.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create patient');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">New Patient</h1>
        <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700">
          Cancel
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Demographics */}
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Demographics</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className={labelClass}>First Name *</label>
              <input required className={inputClass} value={form.firstName} onChange={(e) => updateField('firstName', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Middle Name</label>
              <input className={inputClass} value={form.middleName} onChange={(e) => updateField('middleName', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Last Name *</label>
              <input required className={inputClass} value={form.lastName} onChange={(e) => updateField('lastName', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Date of Birth *</label>
              <input required type="date" className={inputClass} value={form.dateOfBirth} onChange={(e) => updateField('dateOfBirth', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Gender *</label>
              <select required className={inputClass} value={form.gender} onChange={(e) => updateField('gender', e.target.value)}>
                <option value="">Select...</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
                <option value="UNKNOWN">Unknown</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>SSN</label>
              <input className={inputClass} placeholder="XXX-XX-XXXX" value={form.ssn} onChange={(e) => updateField('ssn', e.target.value)} />
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Contact Information</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Phone</label>
              <input type="tel" className={inputClass} value={form.phone} onChange={(e) => updateField('phone', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input type="email" className={inputClass} value={form.email} onChange={(e) => updateField('email', e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Address</label>
              <input className={inputClass} value={form.address} onChange={(e) => updateField('address', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>City</label>
              <input className={inputClass} value={form.city} onChange={(e) => updateField('city', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>State</label>
                <input className={inputClass} value={form.state} onChange={(e) => updateField('state', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>ZIP</label>
                <input className={inputClass} value={form.zipCode} onChange={(e) => updateField('zipCode', e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Additional Information</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className={labelClass}>Preferred Language</label>
              <input className={inputClass} value={form.preferredLanguage} onChange={(e) => updateField('preferredLanguage', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Marital Status</label>
              <select className={inputClass} value={form.maritalStatus} onChange={(e) => updateField('maritalStatus', e.target.value)}>
                <option value="">Select...</option>
                <option value="SINGLE">Single</option>
                <option value="MARRIED">Married</option>
                <option value="DIVORCED">Divorced</option>
                <option value="WIDOWED">Widowed</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Employment Status</label>
              <select className={inputClass} value={form.employmentStatus} onChange={(e) => updateField('employmentStatus', e.target.value)}>
                <option value="">Select...</option>
                <option value="EMPLOYED">Employed</option>
                <option value="SELF_EMPLOYED">Self-Employed</option>
                <option value="UNEMPLOYED">Unemployed</option>
                <option value="RETIRED">Retired</option>
                <option value="STUDENT">Student</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Emergency Contact Name</label>
              <input className={inputClass} value={form.emergencyContactName} onChange={(e) => updateField('emergencyContactName', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Emergency Contact Phone</label>
              <input type="tel" className={inputClass} value={form.emergencyContactPhone} onChange={(e) => updateField('emergencyContactPhone', e.target.value)} />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => router.back()} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="rounded-md bg-indigo-600 px-6 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
            {saving ? 'Creating...' : 'Create Patient'}
          </button>
        </div>
      </form>
    </div>
  );
}
