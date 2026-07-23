'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/lib/api-client';
import { calculateAge, formatDate } from '@/lib/utils';

function usePatientData(patientId: string, accessToken: string | null) {
  const [patient, setPatient] = useState<any>(null);
  const [encounters, setEncounters] = useState<any[]>([]);
  const [vitals, setVitals] = useState<any[]>([]);
  const [conditions, setConditions] = useState<any[]>([]);
  const [medications, setMedications] = useState<any[]>([]);
  const [allergies, setAllergies] = useState<any[]>([]);
  const [labs, setLabs] = useState<any[]>([]);
  const [billing, setBilling] = useState<any>({ charges: [], claims: [], payments: [] });
  const [immunizations, setImmunizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!accessToken || !patientId) return;
    setLoading(true);
    try {
      const [pt, enc, vit, cond, meds, alg, lab, bill, imm] = await Promise.allSettled([
        api.get(`/patients/${patientId}`, accessToken),
        api.get(`/encounters?patientId=${patientId}`, accessToken),
        api.get(`/patients/${patientId}/vitals`, accessToken),
        api.get(`/patients/${patientId}/conditions`, accessToken),
        api.get(`/patients/${patientId}/medications`, accessToken),
        api.get(`/patients/${patientId}/allergies`, accessToken),
        api.get(`/lab-orders?patientId=${patientId}`, accessToken),
        api.get(`/billing/charges?patientId=${patientId}`, accessToken),
        api.get(`/patients/${patientId}/immunizations`, accessToken),
      ]);
      if (pt.status === 'fulfilled') setPatient(pt.value);
      if (enc.status === 'fulfilled') setEncounters(Array.isArray(enc.value) ? enc.value : enc.value?.data || []);
      if (vit.status === 'fulfilled') setVitals(Array.isArray(vit.value) ? vit.value : vit.value?.data || []);
      if (cond.status === 'fulfilled') setConditions(Array.isArray(cond.value) ? cond.value : cond.value?.data || []);
      if (meds.status === 'fulfilled') setMedications(Array.isArray(meds.value) ? meds.value : meds.value?.data || []);
      if (alg.status === 'fulfilled') setAllergies(Array.isArray(alg.value) ? alg.value : alg.value?.data || []);
      if (lab.status === 'fulfilled') setLabs(Array.isArray(lab.value) ? lab.value : lab.value?.data || []);
      if (bill.status === 'fulfilled') setBilling(bill.value || { charges: [], claims: [], payments: [] });
      if (imm.status === 'fulfilled') setImmunizations(Array.isArray(imm.value) ? imm.value : imm.value?.data || []);
    } finally {
      setLoading(false);
    }
  }, [accessToken, patientId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { patient, encounters, vitals, conditions, medications, allergies, labs, billing, immunizations, loading, refetch: fetchData };
}

export default function PatientDetailPage() {
  const params = useParams();
  const { accessToken } = useAuthStore();
  const [activeTab, setActiveTab] = useState('summary');
  const { patient, encounters, vitals, conditions, medications, allergies, labs, billing, immunizations, loading } = usePatientData(params.id as string, accessToken);

  if (loading) return <div className="p-8 text-center text-gray-500">Loading patient...</div>;
  if (!patient) return <div className="p-8 text-center text-gray-500">Patient not found</div>;

  const tabs = ['summary', 'encounters', 'vitals', 'conditions', 'medications', 'allergies', 'labs', 'immunizations', 'billing'];

  return (
    <div className="space-y-6">
      {/* Patient Header */}
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {patient.lastName}, {patient.firstName} {patient.middleName || ''}
            </h1>
            <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-500">
              <span>MRN: {patient.medicalRecordNumber || '—'}</span>
              <span>DOB: {formatDate(patient.dateOfBirth)} ({calculateAge(patient.dateOfBirth)}y)</span>
              <span>Gender: {patient.gender}</span>
              <span>Phone: {patient.phone || '—'}</span>
              <span>Email: {patient.email || '—'}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${
              patient.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
            }`}>
              {patient.status}
            </span>
            <a href={`/encounters/new?patientId=${patient.id}`} className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700">
              New Encounter
            </a>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <nav className="flex gap-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`whitespace-nowrap border-b-2 pb-2 text-sm font-medium capitalize ${
                activeTab === tab
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        {activeTab === 'summary' && <SummaryTab patient={patient} conditions={conditions} allergies={allergies} medications={medications} />}
        {activeTab === 'encounters' && <EncountersTab encounters={encounters} />}
        {activeTab === 'vitals' && <VitalsTab vitals={vitals} />}
        {activeTab === 'conditions' && <ConditionsTab conditions={conditions} />}
        {activeTab === 'medications' && <MedicationsTab medications={medications} />}
        {activeTab === 'allergies' && <AllergiesTab allergies={allergies} />}
        {activeTab === 'labs' && <LabsTab labs={labs} />}
        {activeTab === 'immunizations' && <ImmunizationsTab immunizations={immunizations} />}
        {activeTab === 'billing' && <BillingTab billing={billing} />}
      </div>
    </div>
  );
}

// --- Tab Components ---

function SummaryTab({ patient, conditions, allergies, medications }: any) {
  const activeConditions = conditions.filter((c: any) => c.status === 'ACTIVE');
  const activeMeds = medications.filter((m: any) => m.status === 'ACTIVE');
  const activeAllergies = allergies.filter((a: any) => a.status === 'ACTIVE');

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      <div>
        <h3 className="font-semibold text-gray-900">Demographics</h3>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between"><dt className="text-gray-500">Address</dt><dd>{patient.address || '—'}</dd></div>
          <div className="flex justify-between"><dt className="text-gray-500">City/State</dt><dd>{[patient.city, patient.state, patient.zipCode].filter(Boolean).join(', ') || '—'}</dd></div>
          <div className="flex justify-between"><dt className="text-gray-500">SSN</dt><dd>{patient.ssn ? `***-**-${patient.ssn.slice(-4)}` : '—'}</dd></div>
          <div className="flex justify-between"><dt className="text-gray-500">Language</dt><dd>{patient.preferredLanguage || 'English'}</dd></div>
          <div className="flex justify-between"><dt className="text-gray-500">Marital Status</dt><dd>{patient.maritalStatus || '—'}</dd></div>
          <div className="flex justify-between"><dt className="text-gray-500">Employment</dt><dd>{patient.employmentStatus || '—'}</dd></div>
          <div className="flex justify-between"><dt className="text-gray-500">Emergency Contact</dt><dd>{patient.emergencyContactName || '—'}</dd></div>
        </dl>
      </div>
      <div>
        <h3 className="font-semibold text-gray-900">Active Conditions ({activeConditions.length})</h3>
        <ul className="mt-3 space-y-1.5 text-sm">
          {activeConditions.length ? activeConditions.map((c: any) => (
            <li key={c.id} className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-red-400"></span>
              <span>{c.name} {c.icd10Code && <span className="text-gray-400">({c.icd10Code})</span>}</span>
            </li>
          )) : <li className="text-gray-400">No active conditions</li>}
        </ul>
        <h3 className="mt-4 font-semibold text-gray-900">Allergies ({activeAllergies.length})</h3>
        <ul className="mt-3 space-y-1.5 text-sm">
          {activeAllergies.length ? activeAllergies.map((a: any) => (
            <li key={a.id} className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${a.severity === 'SEVERE' || a.severity === 'LIFE_THREATENING' ? 'bg-red-600' : 'bg-yellow-400'}`}></span>
              <span>{a.allergen} <span className="text-gray-400">({a.severity || 'unknown'})</span></span>
            </li>
          )) : <li className="text-gray-400">No known allergies</li>}
        </ul>
      </div>
      <div>
        <h3 className="font-semibold text-gray-900">Active Medications ({activeMeds.length})</h3>
        <ul className="mt-3 space-y-1.5 text-sm">
          {activeMeds.length ? activeMeds.map((m: any) => (
            <li key={m.id} className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-400"></span>
              <span>{m.name} {m.dosage && <span className="text-gray-400">{m.dosage} {m.frequency}</span>}</span>
            </li>
          )) : <li className="text-gray-400">No active medications</li>}
        </ul>
      </div>
    </div>
  );
}

function EncountersTab({ encounters }: { encounters: any[] }) {
  if (!encounters.length) return <p className="text-sm text-gray-500">No encounters recorded.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="border-b text-left text-gray-500">
          <th className="pb-2 pr-4">Date</th><th className="pb-2 pr-4">Type</th><th className="pb-2 pr-4">Chief Complaint</th><th className="pb-2 pr-4">Provider</th><th className="pb-2">Status</th>
        </tr></thead>
        <tbody>
          {encounters.map((e: any) => (
            <tr key={e.id} className="border-b last:border-0 hover:bg-gray-50">
              <td className="py-2 pr-4">{formatDate(e.startTime || e.createdAt)}</td>
              <td className="py-2 pr-4">{e.type}</td>
              <td className="py-2 pr-4">{e.chiefComplaint || '—'}</td>
              <td className="py-2 pr-4">{e.provider?.firstName} {e.provider?.lastName}</td>
              <td className="py-2">
                <span className={`rounded-full px-2 py-0.5 text-xs ${e.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : e.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{e.status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function VitalsTab({ vitals }: { vitals: any[] }) {
  if (!vitals.length) return <p className="text-sm text-gray-500">No vital signs recorded.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="border-b text-left text-gray-500">
          <th className="pb-2 pr-3">Date</th><th className="pb-2 pr-3">BP</th><th className="pb-2 pr-3">HR</th><th className="pb-2 pr-3">Temp</th><th className="pb-2 pr-3">RR</th><th className="pb-2 pr-3">SpO2</th><th className="pb-2 pr-3">Wt</th><th className="pb-2 pr-3">Ht</th><th className="pb-2">BMI</th>
        </tr></thead>
        <tbody>
          {vitals.map((v: any) => (
            <tr key={v.id} className="border-b last:border-0 hover:bg-gray-50">
              <td className="py-2 pr-3">{formatDate(v.recordedAt)}</td>
              <td className="py-2 pr-3">{v.systolic && v.diastolic ? `${v.systolic}/${v.diastolic}` : '—'}</td>
              <td className="py-2 pr-3">{v.heartRate || '—'}</td>
              <td className="py-2 pr-3">{v.temperature || '—'}</td>
              <td className="py-2 pr-3">{v.respiratoryRate || '—'}</td>
              <td className="py-2 pr-3">{v.oxygenSat ? `${v.oxygenSat}%` : '—'}</td>
              <td className="py-2 pr-3">{v.weight ? `${v.weight}kg` : '—'}</td>
              <td className="py-2 pr-3">{v.height ? `${v.height}cm` : '—'}</td>
              <td className="py-2">{v.bmi || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ConditionsTab({ conditions }: { conditions: any[] }) {
  if (!conditions.length) return <p className="text-sm text-gray-500">No conditions recorded.</p>;
  return (
    <div className="space-y-3">
      {conditions.map((c: any) => (
        <div key={c.id} className="flex items-center justify-between rounded-md border p-3">
          <div>
            <p className="font-medium text-gray-900">{c.name}</p>
            <p className="text-xs text-gray-500">{c.icd10Code && `ICD-10: ${c.icd10Code} · `}Onset: {c.onsetDate ? formatDate(c.onsetDate) : 'Unknown'}</p>
          </div>
          <span className={`rounded-full px-2 py-0.5 text-xs ${c.status === 'ACTIVE' ? 'bg-red-100 text-red-700' : c.status === 'RESOLVED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{c.status}</span>
        </div>
      ))}
    </div>
  );
}

function MedicationsTab({ medications }: { medications: any[] }) {
  if (!medications.length) return <p className="text-sm text-gray-500">No medications recorded.</p>;
  return (
    <div className="space-y-3">
      {medications.map((m: any) => (
        <div key={m.id} className="flex items-center justify-between rounded-md border p-3">
          <div>
            <p className="font-medium text-gray-900">{m.name} {m.dosage && <span className="font-normal text-gray-500">{m.dosage}</span>}</p>
            <p className="text-xs text-gray-500">{m.frequency || ''} {m.route ? `· ${m.route}` : ''} {m.prescriber ? `· Rx: ${m.prescriber.firstName} ${m.prescriber.lastName}` : ''}</p>
          </div>
          <span className={`rounded-full px-2 py-0.5 text-xs ${m.status === 'ACTIVE' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{m.status}</span>
        </div>
      ))}
    </div>
  );
}

function AllergiesTab({ allergies }: { allergies: any[] }) {
  if (!allergies.length) return <p className="text-sm text-gray-500">No known allergies.</p>;
  return (
    <div className="space-y-3">
      {allergies.map((a: any) => (
        <div key={a.id} className={`flex items-center justify-between rounded-md border p-3 ${a.severity === 'SEVERE' || a.severity === 'LIFE_THREATENING' ? 'border-red-200 bg-red-50' : ''}`}>
          <div>
            <p className="font-medium text-gray-900">{a.allergen}</p>
            <p className="text-xs text-gray-500">{a.type && `Type: ${a.type} · `}{a.reaction && `Reaction: ${a.reaction}`}</p>
          </div>
          <span className={`rounded-full px-2 py-0.5 text-xs ${a.severity === 'SEVERE' || a.severity === 'LIFE_THREATENING' ? 'bg-red-100 text-red-700' : a.severity === 'MODERATE' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>{a.severity || 'Unknown'}</span>
        </div>
      ))}
    </div>
  );
}

function LabsTab({ labs }: { labs: any[] }) {
  if (!labs.length) return <p className="text-sm text-gray-500">No lab orders.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="border-b text-left text-gray-500">
          <th className="pb-2 pr-4">Order Date</th><th className="pb-2 pr-4">Test</th><th className="pb-2 pr-4">Status</th><th className="pb-2 pr-4">Result Date</th><th className="pb-2">Abnormal</th>
        </tr></thead>
        <tbody>
          {labs.map((l: any) => (
            <tr key={l.id} className="border-b last:border-0 hover:bg-gray-50">
              <td className="py-2 pr-4">{formatDate(l.orderedAt)}</td>
              <td className="py-2 pr-4">{l.testName}</td>
              <td className="py-2 pr-4">
                <span className={`rounded-full px-2 py-0.5 text-xs ${l.status === 'RESULTED' ? 'bg-green-100 text-green-700' : l.status === 'ORDERED' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{l.status}</span>
              </td>
              <td className="py-2 pr-4">{l.resultedAt ? formatDate(l.resultedAt) : '—'}</td>
              <td className="py-2">{l.isAbnormal ? <span className="font-medium text-red-600">YES</span> : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ImmunizationsTab({ immunizations }: { immunizations: any[] }) {
  if (!immunizations.length) return <p className="text-sm text-gray-500">No immunizations recorded.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="border-b text-left text-gray-500">
          <th className="pb-2 pr-4">Vaccine</th><th className="pb-2 pr-4">CVX</th><th className="pb-2 pr-4">Date</th><th className="pb-2 pr-4">Lot #</th><th className="pb-2">Site</th>
        </tr></thead>
        <tbody>
          {immunizations.map((i: any) => (
            <tr key={i.id} className="border-b last:border-0 hover:bg-gray-50">
              <td className="py-2 pr-4">{i.vaccineName}</td>
              <td className="py-2 pr-4">{i.cvxCode || '—'}</td>
              <td className="py-2 pr-4">{i.administeredDate ? formatDate(i.administeredDate) : '—'}</td>
              <td className="py-2 pr-4">{i.lotNumber || '—'}</td>
              <td className="py-2">{i.site || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BillingTab({ billing }: { billing: any }) {
  const charges = billing.charges || billing.data || [];
  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 font-semibold text-gray-900">Charges</h3>
        {Array.isArray(charges) && charges.length > 0 ? (
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-gray-500">
              <th className="pb-2 pr-4">Date</th><th className="pb-2 pr-4">CPT</th><th className="pb-2 pr-4">Description</th><th className="pb-2 pr-4">Fee</th><th className="pb-2">Status</th>
            </tr></thead>
            <tbody>
              {charges.map((c: any) => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-2 pr-4">{formatDate(c.serviceDate || c.createdAt)}</td>
                  <td className="py-2 pr-4">{c.cptCode}</td>
                  <td className="py-2 pr-4">{c.description || '—'}</td>
                  <td className="py-2 pr-4">${Number(c.fee || 0).toFixed(2)}</td>
                  <td className="py-2"><span className="rounded-full px-2 py-0.5 text-xs bg-gray-100 text-gray-600">{c.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="text-sm text-gray-500">No charges recorded.</p>}
      </div>
    </div>
  );
}
