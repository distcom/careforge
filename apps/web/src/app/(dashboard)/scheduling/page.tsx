'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/lib/api-client';

interface Appointment {
  id: string;
  patientId: string;
  providerId: string;
  facilityId?: string;
  type: string;
  status: string;
  startTime: string;
  endTime: string;
  duration: number;
  reason?: string;
  notes?: string;
  patient?: { id: string; firstName: string; lastName: string; phone?: string };
  provider?: { id: string; firstName: string; lastName: string; prefix?: string };
  facility?: { id: string; name: string };
  appointmentType?: { id: string; name: string; color: string };
  resource?: { id: string; name: string };
  checkedInAt?: string;
  roomedAt?: string;
  providerSeenAt?: string;
  checkedOutAt?: string;
}

interface AvailableSlot {
  start: string;
  end: string;
  available: boolean;
}

interface PatientFlowStatus {
  appointmentId: string;
  status: string;
  patientName: string;
  providerName: string;
  scheduledTime: string;
  checkedInAt?: string;
  roomedAt?: string;
  providerSeenAt?: string;
  checkedOutAt?: string;
  waitTimeMinutes?: number;
  room: string | null;
}

const statusColors: Record<string, string> = {
  SCHEDULED: 'bg-blue-100 text-blue-700 border-blue-200',
  CONFIRMED: 'bg-green-100 text-green-700 border-green-200',
  ARRIVED: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  ROOMED: 'bg-orange-100 text-orange-700 border-orange-200',
  IN_PROGRESS: 'bg-purple-100 text-purple-700 border-purple-200',
  COMPLETED: 'bg-gray-100 text-gray-700 border-gray-200',
  CANCELLED: 'bg-red-100 text-red-700 border-red-200',
  NO_SHOW: 'bg-red-100 text-red-700 border-red-200',
};

const statusFlow = ['SCHEDULED', 'CONFIRMED', 'ARRIVED', 'ROOMED', 'IN_PROGRESS', 'COMPLETED'];

export default function SchedulingPage() {
  const { accessToken } = useAuthStore();
  const [view, setView] = useState<'calendar' | 'flow' | 'waitlist'>('calendar');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [flowStatus, setFlowStatus] = useState<PatientFlowStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  const dateStr = selectedDate.toISOString().split('T')[0];

  const loadAppointments = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res: any = await api.get(
        `/appointments?dateFrom=${dateStr}T00:00:00Z&dateTo=${dateStr}T23:59:59Z&limit=100`,
        accessToken
      );
      setAppointments(res.data || []);
    } catch (err) {
      console.error('Failed to load appointments:', err);
    } finally {
      setLoading(false);
    }
  }, [accessToken, dateStr]);

  const loadFlowStatus = useCallback(async () => {
    if (!accessToken) return;
    try {
      // TODO: Get facility from user context
      const res: any = await api.get(`/appointments/flow/default?date=${dateStr}`, accessToken);
      setFlowStatus(res || []);
    } catch (err) {
      console.error('Failed to load flow status:', err);
    }
  }, [accessToken, dateStr]);

  useEffect(() => {
    loadAppointments();
    if (view === 'flow') loadFlowStatus();
  }, [loadAppointments, loadFlowStatus, view]);

  const handleStatusChange = async (appointmentId: string, status: string) => {
    if (!accessToken) return;
    try {
      await api.put(`/appointments/${appointmentId}/status`, { status }, accessToken);
      loadAppointments();
      if (view === 'flow') loadFlowStatus();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const navigateDate = (direction: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + direction);
    setSelectedDate(newDate);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Scheduling</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setView('calendar')}
            className={`rounded-md px-4 py-2 text-sm font-medium ${view === 'calendar' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 border'}`}
          >
            Calendar
          </button>
          <button
            onClick={() => setView('flow')}
            className={`rounded-md px-4 py-2 text-sm font-medium ${view === 'flow' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 border'}`}
          >
            Patient Flow
          </button>
          <button
            onClick={() => setView('waitlist')}
            className={`rounded-md px-4 py-2 text-sm font-medium ${view === 'waitlist' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 border'}`}
          >
            Waitlist
          </button>
          <button
            onClick={() => setShowBookingModal(true)}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            + New Appointment
          </button>
        </div>
      </div>

      {/* Date Navigation */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigateDate(-1)} className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50">
          ← Prev
        </button>
        <input
          type="date"
          value={dateStr}
          onChange={(e) => setSelectedDate(new Date(e.target.value + 'T00:00:00'))}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <button onClick={() => navigateDate(1)} className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50">
          Next →
        </button>
        <button onClick={() => setSelectedDate(new Date())} className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50">
          Today
        </button>
        <span className="text-sm text-gray-500">
          {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </span>
      </div>

      {/* Calendar View */}
      {view === 'calendar' && (
        <div className="rounded-lg border bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 w-24">Time</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Patient</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Provider</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Type</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
                ) : appointments.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No appointments for this date</td></tr>
                ) : (
                  appointments.map((apt) => (
                    <tr key={apt.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">
                        {new Date(apt.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setSelectedAppointment(apt)}
                          className="text-indigo-600 hover:underline"
                        >
                          {apt.patient ? `${apt.patient.lastName}, ${apt.patient.firstName}` : '—'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {apt.provider ? `${apt.provider.prefix || 'Dr.'} ${apt.provider.lastName}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{apt.appointmentType?.name || apt.type}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium border ${statusColors[apt.status] || 'bg-gray-100'}`}>
                          {apt.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {apt.status === 'SCHEDULED' && (
                            <button
                              onClick={() => handleStatusChange(apt.id, 'ARRIVED')}
                              className="rounded bg-yellow-100 px-2 py-1 text-xs text-yellow-700 hover:bg-yellow-200"
                            >
                              Check In
                            </button>
                          )}
                          {apt.status === 'ARRIVED' && (
                            <button
                              onClick={() => handleStatusChange(apt.id, 'ROOMED')}
                              className="rounded bg-orange-100 px-2 py-1 text-xs text-orange-700 hover:bg-orange-200"
                            >
                              Room
                            </button>
                          )}
                          {apt.status === 'ROOMED' && (
                            <button
                              onClick={() => handleStatusChange(apt.id, 'IN_PROGRESS')}
                              className="rounded bg-purple-100 px-2 py-1 text-xs text-purple-700 hover:bg-purple-200"
                            >
                              Seen
                            </button>
                          )}
                          {apt.status === 'IN_PROGRESS' && (
                            <button
                              onClick={() => handleStatusChange(apt.id, 'COMPLETED')}
                              className="rounded bg-green-100 px-2 py-1 text-xs text-green-700 hover:bg-green-200"
                            >
                              Check Out
                            </button>
                          )}
                          {!['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(apt.status) && (
                            <button
                              onClick={() => handleStatusChange(apt.id, 'CANCELLED')}
                              className="rounded bg-red-100 px-2 py-1 text-xs text-red-700 hover:bg-red-200"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Patient Flow View */}
      {view === 'flow' && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {['ARRIVED', 'ROOMED', 'IN_PROGRESS', 'COMPLETED'].map((status) => (
            <div key={status} className="rounded-lg border bg-white p-4">
              <h3 className="mb-3 font-semibold text-gray-700">
                {status.replace('_', ' ')}
                <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs">
                  {flowStatus.filter(f => f.status === status).length}
                </span>
              </h3>
              <div className="space-y-2">
                {flowStatus.filter(f => f.status === status).map((patient) => (
                  <div key={patient.appointmentId} className="rounded-md border p-3 text-sm">
                    <p className="font-medium">{patient.patientName}</p>
                    <p className="text-gray-500">{patient.providerName}</p>
                    <p className="text-xs text-gray-400">
                      Scheduled: {new Date(patient.scheduledTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {patient.waitTimeMinutes !== undefined && (
                      <p className={`text-xs ${patient.waitTimeMinutes > 15 ? 'text-red-600' : 'text-gray-500'}`}>
                        Wait: {patient.waitTimeMinutes} min
                      </p>
                    )}
                    {patient.room && <p className="text-xs text-gray-500">Room: {patient.room}</p>}
                  </div>
                ))}
                {flowStatus.filter(f => f.status === status).length === 0 && (
                  <p className="text-center text-sm text-gray-400 py-4">No patients</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Waitlist View */}
      {view === 'waitlist' && (
        <div className="rounded-lg border bg-white shadow-sm p-6">
          <h3 className="mb-4 font-semibold text-gray-700">Waitlist</h3>
          <p className="text-sm text-gray-500">Patients waiting for available appointment slots will appear here.</p>
          {/* TODO: Implement waitlist UI */}
        </div>
      )}

      {/* Booking Modal */}
      {showBookingModal && (
        <BookingModal
          accessToken={accessToken!}
          selectedDate={dateStr}
          onClose={() => setShowBookingModal(false)}
          onBooked={() => {
            setShowBookingModal(false);
            loadAppointments();
          }}
        />
      )}

      {/* Appointment Detail Modal */}
      {selectedAppointment && (
        <AppointmentDetailModal
          appointment={selectedAppointment}
          onClose={() => setSelectedAppointment(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}

function BookingModal({ accessToken, selectedDate, onClose, onBooked }: {
  accessToken: string;
  selectedDate: string;
  onClose: () => void;
  onBooked: () => void;
}) {
  const [step, setStep] = useState(1);
  const [patientSearch, setPatientSearch] = useState('');
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [providers, setProviders] = useState<any[]>([]);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [appointmentType, setAppointmentType] = useState('OFFICE_VISIT');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/users?role=provider&limit=50', accessToken)
      .then((res: any) => setProviders(res.data || []))
      .catch(() => {});
  }, [accessToken]);

  const searchPatients = async () => {
    if (patientSearch.length < 2) return;
    try {
      const res: any = await api.get(`/patients?search=${encodeURIComponent(patientSearch)}&limit=10`, accessToken);
      setPatients(res.data || []);
    } catch (err) {
      console.error('Patient search failed:', err);
    }
  };

  const loadSlots = async () => {
    if (!selectedProvider) return;
    setLoading(true);
    try {
      const res: any = await api.get(
        `/appointments/slots?providerId=${selectedProvider}&date=${selectedDate}&duration=30`,
        accessToken
      );
      setSlots(res || []);
    } catch (err) {
      console.error('Failed to load slots:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProvider && step === 3) loadSlots();
  }, [selectedProvider, step]);

  const bookAppointment = async () => {
    if (!selectedPatient || !selectedProvider || !selectedSlot) return;
    setLoading(true);
    setError('');
    try {
      await api.post('/appointments', {
        patientId: selectedPatient.id,
        providerId: selectedProvider,
        facilityId: 'default', // TODO: Get from context
        type: appointmentType,
        startTime: selectedSlot.start,
        endTime: selectedSlot.end,
        duration: 30,
        reason,
      }, accessToken);
      onBooked();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to book appointment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Book Appointment</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        {/* Progress Steps */}
        <div className="mb-6 flex items-center gap-2">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className={`flex-1 h-1 rounded ${s <= step ? 'bg-indigo-600' : 'bg-gray-200'}`} />
          ))}
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        {/* Step 1: Select Patient */}
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="font-medium text-gray-700">Select Patient</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchPatients()}
                placeholder="Search by name, DOB, or MRN..."
                className="flex-1 rounded-md border px-3 py-2 text-sm"
              />
              <button onClick={searchPatients} className="rounded-md bg-gray-100 px-4 py-2 text-sm hover:bg-gray-200">
                Search
              </button>
            </div>
            <div className="max-h-48 overflow-y-auto rounded-md border">
              {patients.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { setSelectedPatient(p); setStep(2); }}
                  className={`w-full px-4 py-3 text-left text-sm hover:bg-gray-50 ${selectedPatient?.id === p.id ? 'bg-indigo-50' : ''}`}
                >
                  <span className="font-medium">{p.lastName}, {p.firstName}</span>
                  <span className="ml-2 text-gray-500">DOB: {new Date(p.dateOfBirth).toLocaleDateString()}</span>
                </button>
              ))}
              {patients.length === 0 && (
                <p className="px-4 py-6 text-center text-sm text-gray-400">Search for a patient to begin</p>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Select Provider & Type */}
        {step === 2 && (
          <div className="space-y-4">
            <h3 className="font-medium text-gray-700">Select Provider & Appointment Type</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm"
              >
                <option value="">Select a provider...</option>
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.prefix || 'Dr.'} {p.firstName} {p.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Appointment Type</label>
              <select
                value={appointmentType}
                onChange={(e) => setAppointmentType(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm"
              >
                <option value="OFFICE_VISIT">Office Visit</option>
                <option value="NEW_PATIENT">New Patient</option>
                <option value="FOLLOW_UP">Follow Up</option>
                <option value="PROCEDURE">Procedure</option>
                <option value="TELEHEALTH">Telehealth</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Visit</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                className="w-full rounded-md border px-3 py-2 text-sm"
                placeholder="Optional..."
              />
            </div>
            <div className="flex justify-between">
              <button onClick={() => setStep(1)} className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50">
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!selectedProvider}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Select Time Slot */}
        {step === 3 && (
          <div className="space-y-4">
            <h3 className="font-medium text-gray-700">Select Time Slot</h3>
            <p className="text-sm text-gray-500">
              {selectedDate && new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            {loading ? (
              <p className="text-center text-sm text-gray-500 py-8">Loading available slots...</p>
            ) : (
              <div className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto">
                {slots.map((slot) => (
                  <button
                    key={slot.start}
                    onClick={() => slot.available && setSelectedSlot(slot)}
                    disabled={!slot.available}
                    className={`rounded-md border px-3 py-2 text-sm ${
                      slot.available
                        ? selectedSlot?.start === slot.start
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                          : 'border-gray-200 hover:border-indigo-300'
                        : 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'
                    }`}
                  >
                    {new Date(slot.start).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </button>
                ))}
              </div>
            )}
            <div className="flex justify-between">
              <button onClick={() => setStep(2)} className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50">
                Back
              </button>
              <button
                onClick={() => setStep(4)}
                disabled={!selectedSlot}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Confirm */}
        {step === 4 && (
          <div className="space-y-4">
            <h3 className="font-medium text-gray-700">Confirm Appointment</h3>
            <div className="rounded-md border bg-gray-50 p-4 space-y-2 text-sm">
              <p><span className="text-gray-500">Patient:</span> {selectedPatient?.firstName} {selectedPatient?.lastName}</p>
              <p><span className="text-gray-500">Provider:</span> {providers.find(p => p.id === selectedProvider)?.firstName} {providers.find(p => p.id === selectedProvider)?.lastName}</p>
              <p><span className="text-gray-500">Type:</span> {appointmentType.replace('_', ' ')}</p>
              <p><span className="text-gray-500">Date:</span> {selectedDate && new Date(selectedDate + 'T00:00:00').toLocaleDateString()}</p>
              <p><span className="text-gray-500">Time:</span> {selectedSlot && new Date(selectedSlot.start).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
              {reason && <p><span className="text-gray-500">Reason:</span> {reason}</p>}
            </div>
            <div className="flex justify-between">
              <button onClick={() => setStep(3)} className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50">
                Back
              </button>
              <button
                onClick={bookAppointment}
                disabled={loading}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? 'Booking...' : 'Book Appointment'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AppointmentDetailModal({ appointment, onClose, onStatusChange }: {
  appointment: Appointment;
  onClose: () => void;
  onStatusChange: (id: string, status: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Appointment Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <div className="space-y-3 text-sm">
          <p><span className="text-gray-500">Patient:</span> {appointment.patient?.firstName} {appointment.patient?.lastName}</p>
          <p><span className="text-gray-500">Provider:</span> {appointment.provider?.firstName} {appointment.provider?.lastName}</p>
          <p><span className="text-gray-500">Type:</span> {appointment.appointmentType?.name || appointment.type}</p>
          <p><span className="text-gray-500">Time:</span> {new Date(appointment.startTime).toLocaleString()}</p>
          <p><span className="text-gray-500">Status:</span> {appointment.status}</p>
          {appointment.reason && <p><span className="text-gray-500">Reason:</span> {appointment.reason}</p>}
          {appointment.notes && <p><span className="text-gray-500">Notes:</span> {appointment.notes}</p>}
        </div>
        <div className="mt-6 flex gap-2">
          {!['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(appointment.status) && (
            <>
              <button
                onClick={() => { onStatusChange(appointment.id, 'CANCELLED'); onClose(); }}
                className="flex-1 rounded-md border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                Cancel
              </button>
              <button
                onClick={() => { onStatusChange(appointment.id, 'NO_SHOW'); onClose(); }}
                className="flex-1 rounded-md border border-orange-200 px-4 py-2 text-sm text-orange-600 hover:bg-orange-50"
              >
                No Show
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
