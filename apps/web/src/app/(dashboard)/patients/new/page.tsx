'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/lib/api-client';

interface DuplicateMatch {
  patientId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  matchScore: number;
  matchReasons: string[];
}

interface InsuranceEntry {
  companyName: string;
  planName: string;
  policyNumber: string;
  groupNumber: string;
  subscriberName: string;
  relationship: string;
  priority: number;
}

interface ConsentEntry {
  type: string;
  acknowledged: boolean;
}

export default function NewPatientPage() {
  const router = useRouter();
  const { accessToken } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([]);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [activeSection, setActiveSection] = useState<'demographics' | 'contact' | 'insurance' | 'guarantor' | 'consent'>('demographics');

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    dateOfBirth: '',
    gender: '',
    ssn: '',
    phone: '',
    mobilePhone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'US',
    preferredLanguage: 'English',
    maritalStatus: '',
    employmentStatus: '',
    race: '',
    ethnicity: '',
    notes: '',
  });

  const [emergencyContact, setEmergencyContact] = useState({
    firstName: '',
    lastName: '',
    relationship: '',
    phone: '',
    email: '',
    isEmergency: true,
    isPrimary: true,
  });

  const [insurances, setInsurances] = useState<InsuranceEntry[]>([]);
  const [consents, setConsents] = useState<ConsentEntry[]>([
    { type: 'TREATMENT', acknowledged: false },
    { type: 'PRIVACY', acknowledged: false },
    { type: 'FINANCIAL', acknowledged: false },
    { type: 'HIPAA_NOTICE', acknowledged: false },
  ]);

  const [guarantor, setGuarantor] = useState({
    guarantorFirstName: '',
    guarantorLastName: '',
    guarantorRelationship: '',
    guarantorPhone: '',
    guarantorEmail: '',
    guarantorAddress: '',
    guarantorCity: '',
    guarantorState: '',
    guarantorZipCode: '',
    guarantorEmployer: '',
    sameAsPatient: false,
  });

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const checkDuplicates = useCallback(async () => {
    if (!accessToken || !form.firstName || !form.lastName || !form.dateOfBirth) return;
    try {
      const matches = await api.post('/patients/check-duplicates', {
        firstName: form.firstName,
        lastName: form.lastName,
        dateOfBirth: form.dateOfBirth,
        ssn: form.ssn || undefined,
        email: form.email || undefined,
      }, accessToken);
      if (matches.length > 0) {
        setDuplicates(matches);
        setShowDuplicateWarning(true);
      } else {
        setDuplicates([]);
        setShowDuplicateWarning(false);
      }
    } catch {
      // Silently fail duplicate check - don't block registration
    }
  }, [accessToken, form.firstName, form.lastName, form.dateOfBirth, form.ssn, form.email]);

  const addInsurance = () => {
    setInsurances([...insurances, {
      companyName: '',
      planName: '',
      policyNumber: '',
      groupNumber: '',
      subscriberName: '',
      relationship: 'SELF',
      priority: insurances.length + 1,
    }]);
  };

  const updateInsurance = (index: number, field: keyof InsuranceEntry, value: string | number) => {
    setInsurances(insurances.map((ins, i) => i === index ? { ...ins, [field]: value } : ins));
  };

  const removeInsurance = (index: number) => {
    setInsurances(insurances.filter((_, i) => i !== index));
  };

  const toggleConsent = (type: string) => {
    setConsents(consents.map(c => c.type === type ? { ...c, acknowledged: !c.acknowledged } : c));
  };

  const handleGuarantorSameAsPatient = (checked: boolean) => {
    setGuarantor(prev => ({
      ...prev,
      sameAsPatient: checked,
      guarantorFirstName: checked ? form.firstName : '',
      guarantorLastName: checked ? form.lastName : '',
      guarantorPhone: checked ? form.phone : '',
      guarantorEmail: checked ? form.email : '',
      guarantorAddress: checked ? form.address : '',
      guarantorCity: checked ? form.city : '',
      guarantorState: checked ? form.state : '',
      guarantorZipCode: checked ? form.zipCode : '',
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;

    // Validate consents
    const unacknowledged = consents.filter(c => !c.acknowledged);
    if (unacknowledged.length > 0) {
      setError('All consent forms must be acknowledged before registration.');
      setActiveSection('consent');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const payload = {
        ...form,
        contacts: emergencyContact.firstName ? [emergencyContact] : [],
        insurances: insurances.filter(ins => ins.companyName && ins.policyNumber),
        consents: consents.map(c => ({ type: c.type, acknowledged: c.acknowledged, signedAt: new Date().toISOString() })),
        guarantorFirstName: guarantor.guarantorFirstName || undefined,
        guarantorLastName: guarantor.guarantorLastName || undefined,
        guarantorRelationship: guarantor.guarantorRelationship || undefined,
        guarantorPhone: guarantor.guarantorPhone || undefined,
        guarantorEmail: guarantor.guarantorEmail || undefined,
        guarantorAddress: guarantor.guarantorAddress || undefined,
        guarantorCity: guarantor.guarantorCity || undefined,
        guarantorState: guarantor.guarantorState || undefined,
        guarantorZipCode: guarantor.guarantorZipCode || undefined,
        guarantorEmployer: guarantor.guarantorEmployer || undefined,
      };

      const patient = await api.post('/patients', payload, accessToken);
      router.push(`/patients/${patient.id}`);
    } catch (err: any) {
      if (err.message?.includes('duplicate')) {
        setError('A potential duplicate patient was found. Please review the warnings above.');
        setShowDuplicateWarning(true);
      } else {
        setError(err.message || 'Failed to create patient');
      }
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1';
  const sectionClass = 'rounded-lg border bg-white p-6 shadow-sm';

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Patient Registration</h1>
        <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700">
          Cancel
        </button>
      </div>

      {/* Progress indicator */}
      <div className="flex space-x-2">
        {(['demographics', 'contact', 'insurance', 'guarantor', 'consent'] as const).map((section) => (
          <button
            key={section}
            onClick={() => setActiveSection(section)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium capitalize ${
              activeSection === section
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {section}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {/* Duplicate Warning */}
      {showDuplicateWarning && duplicates.length > 0 && (
        <div className="rounded-md bg-yellow-50 border border-yellow-200 p-4">
          <h3 className="text-sm font-semibold text-yellow-800 mb-2">⚠️ Potential Duplicate Patients Found</h3>
          <p className="text-sm text-yellow-700 mb-3">
            The following existing patients may match the information entered. Please verify this is not a duplicate before proceeding.
          </p>
          <div className="space-y-2">
            {duplicates.map((dup) => (
              <div key={dup.patientId} className="flex items-center justify-between bg-white rounded p-3 border">
                <div>
                  <span className="font-medium">{dup.firstName} {dup.lastName}</span>
                  <span className="text-gray-500 ml-2">DOB: {new Date(dup.dateOfBirth).toLocaleDateString()}</span>
                  <div className="text-xs text-gray-500 mt-1">
                    Match: {dup.matchScore}% ({dup.matchReasons.join(', ')})
                  </div>
                </div>
                <a
                  href={`/patients/${dup.patientId}`}
                  className="text-sm text-indigo-600 hover:text-indigo-800"
                  target="_blank"
                >
                  View →
                </a>
              </div>
            ))}
          </div>
          <button
            onClick={() => setShowDuplicateWarning(false)}
            className="mt-3 text-sm text-yellow-700 underline hover:text-yellow-900"
          >
            I confirm this is a new patient, continue registration
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Demographics Section */}
        {activeSection === 'demographics' && (
          <div className={sectionClass}>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Demographics</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className={labelClass}>First Name *</label>
                <input required className={inputClass} value={form.firstName} onChange={(e) => updateField('firstName', e.target.value)} onBlur={checkDuplicates} />
              </div>
              <div>
                <label className={labelClass}>Middle Name</label>
                <input className={inputClass} value={form.middleName} onChange={(e) => updateField('middleName', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Last Name *</label>
                <input required className={inputClass} value={form.lastName} onChange={(e) => updateField('lastName', e.target.value)} onBlur={checkDuplicates} />
              </div>
              <div>
                <label className={labelClass}>Date of Birth *</label>
                <input required type="date" className={inputClass} value={form.dateOfBirth} onChange={(e) => updateField('dateOfBirth', e.target.value)} onBlur={checkDuplicates} />
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
                <input className={inputClass} placeholder="XXX-XX-XXXX" value={form.ssn} onChange={(e) => updateField('ssn', e.target.value)} onBlur={checkDuplicates} />
              </div>
              <div>
                <label className={labelClass}>Race</label>
                <select className={inputClass} value={form.race} onChange={(e) => updateField('race', e.target.value)}>
                  <option value="">Select...</option>
                  <option value="WHITE">White</option>
                  <option value="BLACK">Black or African American</option>
                  <option value="ASIAN">Asian</option>
                  <option value="NATIVE">American Indian or Alaska Native</option>
                  <option value="PACIFIC">Native Hawaiian or Pacific Islander</option>
                  <option value="OTHER">Other</option>
                  <option value="DECLINED">Declined to specify</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Ethnicity</label>
                <select className={inputClass} value={form.ethnicity} onChange={(e) => updateField('ethnicity', e.target.value)}>
                  <option value="">Select...</option>
                  <option value="HISPANIC">Hispanic or Latino</option>
                  <option value="NON_HISPANIC">Not Hispanic or Latino</option>
                  <option value="DECLINED">Declined to specify</option>
                </select>
              </div>
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
                  <option value="DOMESTIC_PARTNER">Domestic Partner</option>
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
                  <option value="DISABLED">Disabled</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Contact Section */}
        {activeSection === 'contact' && (
          <div className={sectionClass}>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Phone</label>
                <input type="tel" className={inputClass} value={form.phone} onChange={(e) => updateField('phone', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Mobile Phone</label>
                <input type="tel" className={inputClass} value={form.mobilePhone} onChange={(e) => updateField('mobilePhone', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input type="email" className={inputClass} value={form.email} onChange={(e) => updateField('email', e.target.value)} onBlur={checkDuplicates} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Address</label>
                <input className={inputClass} value={form.address} onChange={(e) => updateField('address', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>City</label>
                <input className={inputClass} value={form.city} onChange={(e) => updateField('city', e.target.value)} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>State</label>
                  <input className={inputClass} value={form.state} onChange={(e) => updateField('state', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>ZIP</label>
                  <input className={inputClass} value={form.zipCode} onChange={(e) => updateField('zipCode', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Country</label>
                  <input className={inputClass} value={form.country} onChange={(e) => updateField('country', e.target.value)} />
                </div>
              </div>
            </div>

            <h3 className="text-md font-semibold text-gray-900 mt-6 mb-4">Emergency Contact</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Contact First Name</label>
                <input className={inputClass} value={emergencyContact.firstName} onChange={(e) => setEmergencyContact({ ...emergencyContact, firstName: e.target.value })} />
              </div>
              <div>
                <label className={labelClass}>Contact Last Name</label>
                <input className={inputClass} value={emergencyContact.lastName} onChange={(e) => setEmergencyContact({ ...emergencyContact, lastName: e.target.value })} />
              </div>
              <div>
                <label className={labelClass}>Relationship</label>
                <input className={inputClass} value={emergencyContact.relationship} onChange={(e) => setEmergencyContact({ ...emergencyContact, relationship: e.target.value })} />
              </div>
              <div>
                <label className={labelClass}>Phone</label>
                <input type="tel" className={inputClass} value={emergencyContact.phone} onChange={(e) => setEmergencyContact({ ...emergencyContact, phone: e.target.value })} />
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input type="email" className={inputClass} value={emergencyContact.email} onChange={(e) => setEmergencyContact({ ...emergencyContact, email: e.target.value })} />
              </div>
            </div>
          </div>
        )}

        {/* Insurance Section */}
        {activeSection === 'insurance' && (
          <div className={sectionClass}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Insurance Information</h2>
              <button type="button" onClick={addInsurance} className="rounded-md bg-indigo-100 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-200">
                + Add Insurance
              </button>
            </div>

            {insurances.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">No insurance added. Click "Add Insurance" to add coverage.</p>
            ) : (
              <div className="space-y-4">
                {insurances.map((ins, index) => (
                  <div key={index} className="rounded-lg border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-gray-900">Insurance #{index + 1}</h3>
                      <button type="button" onClick={() => removeInsurance(index)} className="text-sm text-red-600 hover:text-red-800">
                        Remove
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div>
                        <label className={labelClass}>Company Name *</label>
                        <input className={inputClass} value={ins.companyName} onChange={(e) => updateInsurance(index, 'companyName', e.target.value)} />
                      </div>
                      <div>
                        <label className={labelClass}>Plan Name</label>
                        <input className={inputClass} value={ins.planName} onChange={(e) => updateInsurance(index, 'planName', e.target.value)} />
                      </div>
                      <div>
                        <label className={labelClass}>Policy Number *</label>
                        <input className={inputClass} value={ins.policyNumber} onChange={(e) => updateInsurance(index, 'policyNumber', e.target.value)} />
                      </div>
                      <div>
                        <label className={labelClass}>Group Number</label>
                        <input className={inputClass} value={ins.groupNumber} onChange={(e) => updateInsurance(index, 'groupNumber', e.target.value)} />
                      </div>
                      <div>
                        <label className={labelClass}>Subscriber Name</label>
                        <input className={inputClass} value={ins.subscriberName} onChange={(e) => updateInsurance(index, 'subscriberName', e.target.value)} />
                      </div>
                      <div>
                        <label className={labelClass}>Relationship to Subscriber</label>
                        <select className={inputClass} value={ins.relationship} onChange={(e) => updateInsurance(index, 'relationship', e.target.value)}>
                          <option value="SELF">Self</option>
                          <option value="SPOUSE">Spouse</option>
                          <option value="CHILD">Child</option>
                          <option value="OTHER">Other</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Guarantor Section */}
        {activeSection === 'guarantor' && (
          <div className={sectionClass}>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Guarantor / Responsible Party</h2>
            <div className="mb-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={guarantor.sameAsPatient}
                  onChange={(e) => handleGuarantorSameAsPatient(e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">Same as patient</span>
              </label>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className={labelClass}>First Name</label>
                <input className={inputClass} value={guarantor.guarantorFirstName} onChange={(e) => setGuarantor({ ...guarantor, guarantorFirstName: e.target.value })} disabled={guarantor.sameAsPatient} />
              </div>
              <div>
                <label className={labelClass}>Last Name</label>
                <input className={inputClass} value={guarantor.guarantorLastName} onChange={(e) => setGuarantor({ ...guarantor, guarantorLastName: e.target.value })} disabled={guarantor.sameAsPatient} />
              </div>
              <div>
                <label className={labelClass}>Relationship</label>
                <select className={inputClass} value={guarantor.guarantorRelationship} onChange={(e) => setGuarantor({ ...guarantor, guarantorRelationship: e.target.value })} disabled={guarantor.sameAsPatient}>
                  <option value="">Select...</option>
                  <option value="SELF">Self</option>
                  <option value="SPOUSE">Spouse</option>
                  <option value="PARENT">Parent</option>
                  <option value="GUARDIAN">Guardian</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Phone</label>
                <input type="tel" className={inputClass} value={guarantor.guarantorPhone} onChange={(e) => setGuarantor({ ...guarantor, guarantorPhone: e.target.value })} disabled={guarantor.sameAsPatient} />
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input type="email" className={inputClass} value={guarantor.guarantorEmail} onChange={(e) => setGuarantor({ ...guarantor, guarantorEmail: e.target.value })} disabled={guarantor.sameAsPatient} />
              </div>
              <div>
                <label className={labelClass}>Employer</label>
                <input className={inputClass} value={guarantor.guarantorEmployer} onChange={(e) => setGuarantor({ ...guarantor, guarantorEmployer: e.target.value })} disabled={guarantor.sameAsPatient} />
              </div>
              <div className="sm:col-span-3">
                <label className={labelClass}>Address</label>
                <input className={inputClass} value={guarantor.guarantorAddress} onChange={(e) => setGuarantor({ ...guarantor, guarantorAddress: e.target.value })} disabled={guarantor.sameAsPatient} />
              </div>
              <div>
                <label className={labelClass}>City</label>
                <input className={inputClass} value={guarantor.guarantorCity} onChange={(e) => setGuarantor({ ...guarantor, guarantorCity: e.target.value })} disabled={guarantor.sameAsPatient} />
              </div>
              <div>
                <label className={labelClass}>State</label>
                <input className={inputClass} value={guarantor.guarantorState} onChange={(e) => setGuarantor({ ...guarantor, guarantorState: e.target.value })} disabled={guarantor.sameAsPatient} />
              </div>
              <div>
                <label className={labelClass}>ZIP</label>
                <input className={inputClass} value={guarantor.guarantorZipCode} onChange={(e) => setGuarantor({ ...guarantor, guarantorZipCode: e.target.value })} disabled={guarantor.sameAsPatient} />
              </div>
            </div>
          </div>
        )}

        {/* Consent Section */}
        {activeSection === 'consent' && (
          <div className={sectionClass}>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Consent & Acknowledgements</h2>
            <p className="text-sm text-gray-600 mb-4">
              The following consents must be acknowledged before patient registration can be completed.
            </p>
            <div className="space-y-4">
              {consents.map((consent) => (
                <div key={consent.type} className="flex items-start space-x-3 rounded-lg border p-4">
                  <input
                    type="checkbox"
                    checked={consent.acknowledged}
                    onChange={() => toggleConsent(consent.type)}
                    className="mt-1 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <label className="font-medium text-gray-900">
                      {consent.type.replace('_', ' ')} Consent
                    </label>
                    <p className="text-sm text-gray-500 mt-1">
                      {consent.type === 'TREATMENT' && 'I consent to receive medical treatment and procedures as recommended by my healthcare providers.'}
                      {consent.type === 'PRIVACY' && 'I acknowledge receipt of the Notice of Privacy Practices and understand how my health information may be used and disclosed.'}
                      {consent.type === 'FINANCIAL' && 'I agree to be financially responsible for services rendered and understand my insurance coverage and obligations.'}
                      {consent.type === 'HIPAA_NOTICE' && 'I acknowledge that I have received or been offered a copy of the HIPAA Notice of Privacy Practices.'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            {consents.some(c => !c.acknowledged) && (
              <div className="mt-4 rounded-md bg-yellow-50 p-3 text-sm text-yellow-700">
                All consents must be acknowledged before registration can be completed.
              </div>
            )}
          </div>
        )}

        {/* Navigation & Actions */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {activeSection !== 'demographics' && (
              <button
                type="button"
                onClick={() => {
                  const sections = ['demographics', 'contact', 'insurance', 'guarantor', 'consent'];
                  const currentIndex = sections.indexOf(activeSection);
                  setActiveSection(sections[currentIndex - 1] as any);
                }}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                ← Previous
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => router.back()} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            {activeSection !== 'consent' ? (
              <button
                type="button"
                onClick={() => {
                  const sections = ['demographics', 'contact', 'insurance', 'guarantor', 'consent'];
                  const currentIndex = sections.indexOf(activeSection);
                  setActiveSection(sections[currentIndex + 1] as any);
                }}
                className="rounded-md bg-indigo-600 px-6 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Next →
              </button>
            ) : (
              <button
                type="submit"
                disabled={saving || consents.some(c => !c.acknowledged)}
                className="rounded-md bg-green-600 px-6 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? 'Registering...' : 'Complete Registration'}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
