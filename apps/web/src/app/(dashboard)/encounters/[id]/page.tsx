'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/lib/api-client';
import { formatDate } from '@/lib/utils';

interface ClinicalNote {
  id: string;
  noteType: string;
  title?: string;
  content: string;
  status: string;
  author?: { id: string; firstName: string; lastName: string };
  attestedBy?: { id: string; firstName: string; lastName: string };
  attestedAt?: string;
  isAmendment?: boolean;
  amendmentReason?: string;
  amendments?: { id: string; content: string; amendmentReason: string; createdAt: string }[];
  createdAt: string;
}

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
  PENDING_REVIEW: 'bg-orange-100 text-orange-700',
  SIGNED: 'bg-green-100 text-green-700',
  AMENDED: 'bg-blue-100 text-blue-700',
  ENTERED_IN_ERROR: 'bg-red-100 text-red-700',
};

export default function EncounterWorkspacePage() {
  const params = useParams();
  const { accessToken } = useAuthStore();
  const [encounter, setEncounter] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('soap');
  const [soap, setSoap] = useState({ subjective: '', objective: '', assessment: '', plan: '' });
  const [notes, setNotes] = useState<ClinicalNote[]>([]);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showSignModal, setShowSignModal] = useState(false);
  const [showAmendModal, setShowAmendModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadEncounter = useCallback(async () => {
    if (!accessToken || !params.id) return;
    try {
      const enc: any = await api.get(`/encounters/${params.id}`, accessToken);
      setEncounter(enc);
      setNotes(enc.clinicalNotes || []);
      setSoap({
        subjective: enc.chiefComplaint ? `${enc.chiefComplaint}\n${enc.hpi || ''}` : '',
        objective: enc.physicalExam ? `${enc.ros || ''}\n${enc.physicalExam || ''}` : '',
        assessment: enc.assessment || '',
        plan: enc.plan || '',
      });
    } catch (err) {
      console.error('Failed to load encounter:', err);
    } finally {
      setLoading(false);
    }
  }, [accessToken, params.id]);

  useEffect(() => {
    loadEncounter();
  }, [loadEncounter]);

  if (loading) return <div className="p-8 text-center text-gray-500">Loading encounter...</div>;
  if (!encounter) return <div className="p-8 text-center text-gray-500">Encounter not found</div>;

  const isEditable = !['SIGNED', 'AMENDED', 'ENTERED_IN_ERROR'].includes(encounter.status);

  const sections = [
    { id: 'soap', label: 'SOAP Note' },
    { id: 'notes', label: `Clinical Notes (${notes.length})` },
    { id: 'vitals', label: 'Vitals' },
    { id: 'diagnoses', label: `Diagnoses (${encounter.diagnoses?.length || 0})` },
    { id: 'procedures', label: `Procedures (${encounter.procedures?.length || 0})` },
  ];

  const saveSoap = async () => {
    if (!accessToken || !isEditable) return;
    setSaving(true);
    try {
      await api.put(`/encounters/${params.id}`, {
        chiefComplaint: soap.subjective.split('\n')[0] || soap.subjective,
        hpi: soap.subjective.split('\n').slice(1).join('\n') || undefined,
        physicalExam: soap.objective,
        assessment: soap.assessment,
        plan: soap.plan,
      }, accessToken);
      await loadEncounter();
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setSaving(false);
    }
  };

  const signEncounter = async () => {
    if (!accessToken) return;
    try {
      await api.post(`/encounters/${params.id}/sign`, {}, accessToken);
      setShowSignModal(false);
      await loadEncounter();
    } catch (err) {
      console.error('Failed to sign:', err);
    }
  };

  const amendEncounter = async (reason: string) => {
    if (!accessToken) return;
    try {
      await api.post(`/encounters/${params.id}/amend`, { reason }, accessToken);
      setShowAmendModal(false);
      await loadEncounter();
    } catch (err) {
      console.error('Failed to amend:', err);
    }
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
            {encounter.amendmentReason && (
              <p className="mt-1 text-sm text-blue-600">Amended: {encounter.amendmentReason}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusColors[encounter.status] || 'bg-gray-100'}`}>
              {encounter.status}
            </span>
            {isEditable && (
              <button
                onClick={() => setShowSignModal(true)}
                className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
              >
                Sign Encounter
              </button>
            )}
            {encounter.status === 'SIGNED' && (
              <button
                onClick={() => setShowAmendModal(true)}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Amend
              </button>
            )}
          </div>
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
          {!isEditable && (
            <div className="rounded-md bg-yellow-50 p-3 text-sm text-yellow-700">
              This encounter is {encounter.status.toLowerCase()}. Documentation is read-only.
            </div>
          )}
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h3 className="mb-3 font-semibold text-blue-700">S - Subjective</h3>
            <textarea
              className="w-full rounded-md border border-gray-300 p-3 text-sm focus:border-indigo-500 focus:outline-none disabled:bg-gray-50"
              rows={4}
              placeholder="Patient's reported symptoms, history of present illness, review of systems..."
              value={soap.subjective}
              onChange={(e) => setSoap({ ...soap, subjective: e.target.value })}
              disabled={!isEditable}
            />
          </div>
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h3 className="mb-3 font-semibold text-green-700">O - Objective</h3>
            <textarea
              className="w-full rounded-md border border-gray-300 p-3 text-sm focus:border-indigo-500 focus:outline-none disabled:bg-gray-50"
              rows={4}
              placeholder="Physical exam findings, vital signs, lab results..."
              value={soap.objective}
              onChange={(e) => setSoap({ ...soap, objective: e.target.value })}
              disabled={!isEditable}
            />
          </div>
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h3 className="mb-3 font-semibold text-purple-700">A - Assessment</h3>
            <textarea
              className="w-full rounded-md border border-gray-300 p-3 text-sm focus:border-indigo-500 focus:outline-none disabled:bg-gray-50"
              rows={3}
              placeholder="Diagnosis, differential diagnosis, clinical impression..."
              value={soap.assessment}
              onChange={(e) => setSoap({ ...soap, assessment: e.target.value })}
              disabled={!isEditable}
            />
          </div>
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h3 className="mb-3 font-semibold text-orange-700">P - Plan</h3>
            <textarea
              className="w-full rounded-md border border-gray-300 p-3 text-sm focus:border-indigo-500 focus:outline-none disabled:bg-gray-50"
              rows={4}
              placeholder="Treatment plan, medications ordered, follow-up instructions, patient education..."
              value={soap.plan}
              onChange={(e) => setSoap({ ...soap, plan: e.target.value })}
              disabled={!isEditable}
            />
          </div>
          {isEditable && (
            <div className="flex justify-end gap-3">
              <button
                onClick={saveSoap}
                disabled={saving}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Note'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Clinical Notes Section */}
      {activeSection === 'notes' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">Clinical Notes</h3>
            {isEditable && (
              <button
                onClick={() => setShowNoteModal(true)}
                className="rounded-md bg-indigo-50 px-3 py-1 text-sm text-indigo-600 hover:bg-indigo-100"
              >
                + New Note
              </button>
            )}
          </div>
          {notes.length === 0 ? (
            <div className="rounded-lg border bg-white p-6 text-center text-gray-500">
              No clinical notes yet
            </div>
          ) : (
            notes.map((note) => (
              <div key={note.id} className="rounded-lg border bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{note.title || note.noteType}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${
                      note.status === 'FINAL' ? 'bg-green-100 text-green-700' :
                      note.status === 'AMENDED' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {note.status}
                    </span>
                    {note.isAmendment && (
                      <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-700">
                        Amendment
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {note.author?.firstName} {note.author?.lastName} • {formatDate(note.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.content}</p>
                {note.amendmentReason && (
                  <p className="mt-2 text-xs text-orange-600">Amendment reason: {note.amendmentReason}</p>
                )}
                {note.attestedAt && (
                  <p className="mt-2 text-xs text-gray-500">
                    Attested by {note.attestedBy?.firstName} {note.attestedBy?.lastName} on {formatDate(note.attestedAt)}
                  </p>
                )}
                {note.amendments && note.amendments.length > 0 && (
                  <div className="mt-3 border-t pt-2">
                    <p className="text-xs font-medium text-gray-500 mb-1">Amendments:</p>
                    {note.amendments.map((amendment) => (
                      <div key={amendment.id} className="ml-2 text-xs text-gray-600">
                        <p>{amendment.content}</p>
                        <p className="text-gray-400">Reason: {amendment.amendmentReason}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Vitals Section */}
      {activeSection === 'vitals' && (
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900">Vital Signs</h3>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {encounter.vitalSigns?.[0] ? (
              <>
                <VitalCard label="Blood Pressure" value={encounter.vitalSigns[0].systolic ? `${encounter.vitalSigns[0].systolic}/${encounter.vitalSigns[0].diastolic}` : '—'} unit="mmHg" />
                <VitalCard label="Heart Rate" value={encounter.vitalSigns[0].heartRate || '—'} unit="bpm" />
                <VitalCard label="Temperature" value={encounter.vitalSigns[0].temperature || '—'} unit="°F" />
                <VitalCard label="Resp. Rate" value={encounter.vitalSigns[0].respiratoryRate || '—'} unit="/min" />
                <VitalCard label="SpO2" value={encounter.vitalSigns[0].oxygenSaturation || '—'} unit="%" />
                <VitalCard label="Weight" value={encounter.vitalSigns[0].weight || '—'} unit="kg" />
                <VitalCard label="Height" value={encounter.vitalSigns[0].height || '—'} unit="cm" />
                <VitalCard label="BMI" value={encounter.vitalSigns[0].bmi || '—'} unit="" />
              </>
            ) : (
              <p className="col-span-4 text-center text-gray-500 py-4">No vitals recorded</p>
            )}
          </div>
        </div>
      )}

      {/* Diagnoses Section */}
      {activeSection === 'diagnoses' && (
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Encounter Diagnoses</h3>
            {isEditable && (
              <button className="rounded-md bg-indigo-50 px-3 py-1 text-sm text-indigo-600 hover:bg-indigo-100">+ Add Diagnosis</button>
            )}
          </div>
          {encounter.diagnoses?.length > 0 ? (
            <div className="mt-4 space-y-2">
              {encounter.diagnoses.map((dx: any) => (
                <div key={dx.id} className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <span className="font-medium">{dx.icd10Code}</span>
                    <span className="ml-2 text-gray-600">{dx.description}</span>
                  </div>
                  {dx.isPrimary && (
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-700">Primary</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-gray-500">No diagnoses recorded</p>
          )}
        </div>
      )}

      {/* Procedures Section */}
      {activeSection === 'procedures' && (
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Procedures</h3>
            {isEditable && (
              <button className="rounded-md bg-indigo-50 px-3 py-1 text-sm text-indigo-600 hover:bg-indigo-100">+ Add Procedure</button>
            )}
          </div>
          {encounter.procedures?.length > 0 ? (
            <div className="mt-4 space-y-2">
              {encounter.procedures.map((proc: any) => (
                <div key={proc.id} className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <span className="font-medium">{proc.cptCode}</span>
                    <span className="ml-2 text-gray-600">{proc.description}</span>
                  </div>
                  {proc.fee && <span className="text-gray-500">${proc.fee}</span>}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-gray-500">No procedures recorded</p>
          )}
        </div>
      )}

      {/* New Note Modal */}
      {showNoteModal && (
        <NewNoteModal
          accessToken={accessToken!}
          encounterId={params.id as string}
          onClose={() => setShowNoteModal(false)}
          onCreated={() => {
            setShowNoteModal(false);
            loadEncounter();
          }}
        />
      )}

      {/* Sign Modal */}
      {showSignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold mb-4">Sign Encounter</h2>
            <p className="text-sm text-gray-600 mb-4">
              Signing this encounter will attest that the documentation is complete and accurate.
              This action cannot be undone without amending the encounter.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowSignModal(false)} className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={signEncounter} className="rounded-md bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700">
                Sign & Attest
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Amend Modal */}
      {showAmendModal && (
        <AmendModal
          onClose={() => setShowAmendModal(false)}
          onAmend={amendEncounter}
        />
      )}
    </div>
  );
}

function VitalCard({ label, value, unit }: { label: string; value: any; unit: string }) {
  return (
    <div className="rounded-md border p-3 text-center">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-gray-900">{value}</p>
      <p className="text-xs text-gray-400">{unit}</p>
    </div>
  );
}

function NewNoteModal({ accessToken, encounterId, onClose, onCreated }: {
  accessToken: string;
  encounterId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [noteType, setNoteType] = useState('PROGRESS');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  const createNote = async () => {
    if (!content.trim()) return;
    setSaving(true);
    try {
      await api.post(`/encounters/${encounterId}/notes`, {
        noteType,
        title: title || undefined,
        content,
      }, accessToken);
      onCreated();
    } catch (err) {
      console.error('Failed to create note:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold mb-4">New Clinical Note</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note Type</label>
            <select
              value={noteType}
              onChange={(e) => setNoteType(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
            >
              <option value="PROGRESS">Progress Note</option>
              <option value="CONSULTATION">Consultation</option>
              <option value="PROCEDURE">Procedure Note</option>
              <option value="DISCHARGE">Discharge Summary</option>
              <option value="HISTORY">History & Physical</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title (optional)</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
              placeholder="Note title..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
              className="w-full rounded-md border px-3 py-2 text-sm"
              placeholder="Enter clinical note content..."
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={createNote}
            disabled={saving || !content.trim()}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? 'Creating...' : 'Create Note'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AmendModal({ onClose, onAmend }: { onClose: () => void; onAmend: (reason: string) => void }) {
  const [reason, setReason] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold mb-4">Amend Encounter</h2>
        <p className="text-sm text-gray-600 mb-4">
          Amending a signed encounter creates a new version while preserving the original.
          Please provide a reason for the amendment.
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          className="w-full rounded-md border px-3 py-2 text-sm mb-4"
          placeholder="Reason for amendment..."
        />
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={() => reason.trim() && onAmend(reason)}
            disabled={!reason.trim()}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Amend Encounter
          </button>
        </div>
      </div>
    </div>
  );
}
