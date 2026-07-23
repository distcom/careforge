'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/lib/api-client';
import { formatDate } from '@/lib/utils';

export default function EncounterWorkspacePage() {
  const params = useParams();
  const { accessToken } = useAuthStore();
  const [encounter, setEncounter] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('soap');
  const [soap, setSoap] = useState({ subjective: '', objective: '', assessment: '', plan: '' });

  useEffect(() => {
    if (!accessToken || !params.id) return;
    api.get(`/encounters/${params.id}`, accessToken)
      .then((enc: any) => {
        setEncounter(enc);
        setSoap({
          subjective: enc.chiefComplaint ? `${enc.chiefComplaint}\n${enc.hpi || ''}` : '',
          objective: enc.physicalExam ? `${enc.ros || ''}\n${enc.physicalExam || ''}` : '',
          assessment: enc.assessment || '',
          plan: enc.plan || '',
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [accessToken, params.id]);

  if (loading) return <div className="p-8 text-center text-gray-500">Loading encounter...</div>;
  if (!encounter) return <div className="p-8 text-center text-gray-500">Encounter not found</div>;

  const sections = [
    { id: 'soap', label: 'SOAP Note' },
    { id: 'vitals', label: 'Vitals' },
    { id: 'diagnoses', label: 'Diagnoses' },
    { id: 'orders', label: 'Orders' },
    { id: 'medications', label: 'Medications' },
    { id: 'procedures', label: 'Procedures' },
  ];

  const saveSoap = async () => {
    if (!accessToken) return;
    try {
      await api.put(`/encounters/${params.id}`, {
        chiefComplaint: soap.subjective.split('\n')[0] || soap.subjective,
        hpi: soap.subjective.split('\n').slice(1).join('\n') || undefined,
        physicalExam: soap.objective,
        assessment: soap.assessment,
        plan: soap.plan,
      }, accessToken);
    } catch {}
  };

  return (
    <div className="space-y-6">
      {/* Encounter Header */}
      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {encounter.patient ? `${encounter.patient.lastName}, ${encounter.patient.firstName}` : 'Patient'}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {encounter.type} • {formatDate(encounter.createdAt)} • {encounter.chiefComplaint || 'No chief complaint'}
            </p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${
            encounter.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-700' :
            encounter.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
          }`}>
            {encounter.status}
          </span>
        </div>
      </div>

      {/* Section Navigation */}
      <div className="flex gap-2 overflow-x-auto">
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium ${
              activeSection === s.id ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* SOAP Note Section */}
      {activeSection === 'soap' && (
        <div className="space-y-4">
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h3 className="mb-3 font-semibold text-blue-700">S - Subjective</h3>
            <textarea
              className="w-full rounded-md border border-gray-300 p-3 text-sm focus:border-indigo-500 focus:outline-none"
              rows={4}
              placeholder="Patient's reported symptoms, history of present illness, review of systems..."
              value={soap.subjective}
              onChange={(e) => setSoap({ ...soap, subjective: e.target.value })}
            />
          </div>
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h3 className="mb-3 font-semibold text-green-700">O - Objective</h3>
            <textarea
              className="w-full rounded-md border border-gray-300 p-3 text-sm focus:border-indigo-500 focus:outline-none"
              rows={4}
              placeholder="Physical exam findings, vital signs, lab results..."
              value={soap.objective}
              onChange={(e) => setSoap({ ...soap, objective: e.target.value })}
            />
          </div>
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h3 className="mb-3 font-semibold text-purple-700">A - Assessment</h3>
            <textarea
              className="w-full rounded-md border border-gray-300 p-3 text-sm focus:border-indigo-500 focus:outline-none"
              rows={3}
              placeholder="Diagnosis, differential diagnosis, clinical impression..."
              value={soap.assessment}
              onChange={(e) => setSoap({ ...soap, assessment: e.target.value })}
            />
          </div>
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h3 className="mb-3 font-semibold text-orange-700">P - Plan</h3>
            <textarea
              className="w-full rounded-md border border-gray-300 p-3 text-sm focus:border-indigo-500 focus:outline-none"
              rows={4}
              placeholder="Treatment plan, medications ordered, follow-up instructions, patient education..."
              value={soap.plan}
              onChange={(e) => setSoap({ ...soap, plan: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={saveSoap} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
              Save Note
            </button>
          </div>
        </div>
      )}

      {/* Vitals Section */}
      {activeSection === 'vitals' && (
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900">Vital Signs</h3>
          <p className="mt-2 text-sm text-gray-500">Record and view vital signs for this encounter.</p>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {['BP', 'HR', 'Temp', 'RR', 'SpO2', 'Weight', 'Height', 'BMI'].map((v) => (
              <div key={v} className="rounded-md border p-3 text-center">
                <p className="text-xs text-gray-500">{v}</p>
                <p className="mt-1 text-lg font-semibold text-gray-900">—</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Diagnoses Section */}
      {activeSection === 'diagnoses' && (
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Encounter Diagnoses</h3>
            <button className="rounded-md bg-indigo-50 px-3 py-1 text-sm text-indigo-600 hover:bg-indigo-100">+ Add Diagnosis</button>
          </div>
          <p className="mt-2 text-sm text-gray-500">Link ICD-10 coded diagnoses to this encounter.</p>
        </div>
      )}

      {/* Orders Section */}
      {activeSection === 'orders' && (
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Orders</h3>
            <button className="rounded-md bg-indigo-50 px-3 py-1 text-sm text-indigo-600 hover:bg-indigo-100">+ New Order</button>
          </div>
          <p className="mt-2 text-sm text-gray-500">Lab orders, imaging, and referrals for this encounter.</p>
        </div>
      )}

      {/* Medications Section */}
      {activeSection === 'medications' && (
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Medications & Prescriptions</h3>
            <button className="rounded-md bg-indigo-50 px-3 py-1 text-sm text-indigo-600 hover:bg-indigo-100">+ Prescribe</button>
          </div>
          <p className="mt-2 text-sm text-gray-500">Prescribe medications and manage current medication list.</p>
        </div>
      )}

      {/* Procedures Section */}
      {activeSection === 'procedures' && (
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Procedures</h3>
            <button className="rounded-md bg-indigo-50 px-3 py-1 text-sm text-indigo-600 hover:bg-indigo-100">+ Add Procedure</button>
          </div>
          <p className="mt-2 text-sm text-gray-500">Document CPT-coded procedures performed during this encounter.</p>
        </div>
      )}
    </div>
  );
}
