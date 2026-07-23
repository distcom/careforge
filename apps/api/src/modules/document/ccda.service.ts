import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';

/**
 * C-CDA / CCD Document Generation Service
 * Generates Consolidated CDA documents for interoperability (HL7 C-CDA R2.1)
 */
@Injectable()
export class CcdaService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate a Continuity of Care Document (CCD) for a patient
   */
  async generateCCD(patientId: string): Promise<string> {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        conditions: { where: { deletedAt: null } },
        medications: { where: { deletedAt: null } },
        allergies: { where: { deletedAt: null } },
        immunizations: true,
        encounters: { where: { deletedAt: null }, take: 10, orderBy: { createdAt: 'desc' } },
        vitalSigns: { take: 5, orderBy: { recordedAt: 'desc' } },
      },
    });

    if (!patient) throw new NotFoundException('Patient not found');

    const now = new Date().toISOString();
    const docId = `CCD-${patientId}-${Date.now()}`;

    return `<?xml version="1.0" encoding="UTF-8"?>
<ClinicalDocument xmlns="urn:hl7-org:v3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:sdtc="urn:hl7-org:sdtc" classCode="DOCCLIN" moodCode="EVN">

  <!-- Document Header -->
  <realmCode code="US"/>
  <typeId root="2.16.840.1.113883.1.3" extension="POCD_HD000040"/>
  <templateId root="2.16.840.1.113883.10.20.22.1.1" extension="2015-08-01"/>
  <templateId root="2.16.840.1.113883.10.20.22.1.2" extension="2015-08-01"/>
  <id root="${docId}"/>
  <code code="34133-9" codeSystem="2.16.840.1.113883.6.1" displayName="Summarization of Episode Note"/>
  <title>CareForge Continuity of Care Document</title>
  <effectiveTime value="${this.formatHL7Date(now)}"/>
  <confidentialityCode code="N" codeSystem="2.16.840.1.113883.5.25"/>
  <languageCode code="en-US"/>

  <!-- Patient -->
  <recordTarget>
    <patientRole>
      <id root="2.16.840.1.113883.4.1" extension="${patient.ssn || patient.id}"/>
      <id root="CareForge.MRN" extension="${patient.medicalRecordNumber || patient.id}"/>
      <addr use="HP">
        <streetAddressLine>${patient.address || ''}</streetAddressLine>
        <city>${patient.city || ''}</city>
        <state>${patient.state || ''}</state>
        <postalCode>${patient.zipCode || ''}</postalCode>
        <country>US</country>
      </addr>
      <telecom value="tel:${patient.phone || ''}" use="HP"/>
      <telecom value="mailto:${patient.email || ''}" use="WP"/>
      <patient>
        <name use="L">
          <given>${patient.firstName}</given>
          ${patient.middleName ? `<given>${patient.middleName}</given>` : ''}
          <family>${patient.lastName}</family>
        </name>
        <administrativeGenderCode code="${this.mapGender(patient.gender)}" codeSystem="2.16.840.1.113883.5.1"/>
        <birthTime value="${this.formatHL7Date(patient.dateOfBirth)}"/>
        <maritalStatusCode code="${this.mapMaritalStatus(patient.maritalStatus)}" codeSystem="2.16.840.1.113883.5.2"/>
      </patient>
    </patientRole>
  </recordTarget>

  <!-- Author -->
  <author>
    <time value="${this.formatHL7Date(now)}"/>
    <assignedAuthor>
      <id root="CareForge.Provider" extension="system"/>
      <assignedPerson>
        <name><given>CareForge</given><family>System</family></name>
      </assignedPerson>
      <representedOrganization>
        <name>CareForge Medical</name>
      </representedOrganization>
    </assignedAuthor>
  </author>

  <component>
    <structuredBody>

      <!-- Allergies Section -->
      <component>
        <section>
          <templateId root="2.16.840.1.113883.10.20.22.2.6.1" extension="2015-08-01"/>
          <code code="48765-2" codeSystem="2.16.840.1.113883.6.1" displayName="Allergies and adverse reactions"/>
          <title>Allergies and Intolerances</title>
          <text>
            <table>
              <thead><tr><th>Allergen</th><th>Type</th><th>Severity</th><th>Status</th></tr></thead>
              <tbody>
                ${patient.allergies.map(a => `<tr><td>${a.allergen}</td><td>${a.type || 'N/A'}</td><td>${a.severity || 'Unknown'}</td><td>${a.status}</td></tr>`).join('\n                ')}
              </tbody>
            </table>
          </text>
          ${patient.allergies.map(a => this.buildAllergyEntry(a)).join('\n          ')}
        </section>
      </component>

      <!-- Medications Section -->
      <component>
        <section>
          <templateId root="2.16.840.1.113883.10.20.22.2.1.1" extension="2015-08-01"/>
          <code code="10160-0" codeSystem="2.16.840.1.113883.6.1" displayName="History of Medication use"/>
          <title>Medications</title>
          <text>
            <table>
              <thead><tr><th>Medication</th><th>Dosage</th><th>Frequency</th><th>Status</th></tr></thead>
              <tbody>
                ${patient.medications.map(m => `<tr><td>${m.name}</td><td>${m.dosage || 'N/A'}</td><td>${m.frequency || 'N/A'}</td><td>${m.status}</td></tr>`).join('\n                ')}
              </tbody>
            </table>
          </text>
          ${patient.medications.map(m => this.buildMedicationEntry(m)).join('\n          ')}
        </section>
      </component>

      <!-- Problems Section -->
      <component>
        <section>
          <templateId root="2.16.840.1.113883.10.20.22.2.5.1" extension="2015-08-01"/>
          <code code="11450-4" codeSystem="2.16.840.1.113883.6.1" displayName="Problem List"/>
          <title>Problems / Conditions</title>
          <text>
            <table>
              <thead><tr><th>Condition</th><th>ICD-10</th><th>Status</th><th>Onset</th></tr></thead>
              <tbody>
                ${patient.conditions.map(c => `<tr><td>${c.name}</td><td>${c.icd10Code || 'N/A'}</td><td>${c.status}</td><td>${c.onsetDate || 'Unknown'}</td></tr>`).join('\n                ')}
              </tbody>
            </table>
          </text>
          ${patient.conditions.map(c => this.buildConditionEntry(c)).join('\n          ')}
        </section>
      </component>

      <!-- Immunizations Section -->
      <component>
        <section>
          <templateId root="2.16.840.1.113883.10.20.22.2.2.1" extension="2015-08-01"/>
          <code code="11369-6" codeSystem="2.16.840.1.113883.6.1" displayName="History of immunizations"/>
          <title>Immunizations</title>
          <text>
            <table>
              <thead><tr><th>Vaccine</th><th>CVX</th><th>Date</th><th>Lot</th></tr></thead>
              <tbody>
                ${patient.immunizations.map(i => `<tr><td>${i.vaccineName}</td><td>${i.cvxCode || 'N/A'}</td><td>${i.administeredAt || 'N/A'}</td><td>${i.lotNumber || 'N/A'}</td></tr>`).join('\n                ')}
              </tbody>
            </table>
          </text>
        </section>
      </component>

      <!-- Vital Signs Section -->
      <component>
        <section>
          <templateId root="2.16.840.1.113883.10.20.22.2.4.1" extension="2015-08-01"/>
          <code code="8716-3" codeSystem="2.16.840.1.113883.6.1" displayName="Vital Signs"/>
          <title>Vital Signs</title>
          <text>
            <table>
              <thead><tr><th>Date</th><th>BP</th><th>HR</th><th>Temp</th><th>RR</th><th>SpO2</th><th>Weight</th><th>Height</th></tr></thead>
              <tbody>
                ${patient.vitalSigns.map(v => `<tr><td>${v.recordedAt}</td><td>${v.systolic || '-'}/${v.diastolic || '-'}</td><td>${v.heartRate || '-'}</td><td>${v.temperature || '-'}</td><td>${v.respiratoryRate || '-'}</td><td>${v.oxygenSat || '-'}</td><td>${v.weight || '-'}</td><td>${v.height || '-'}</td></tr>`).join('\n                ')}
              </tbody>
            </table>
          </text>
        </section>
      </component>

      <!-- Encounters Section -->
      <component>
        <section>
          <templateId root="2.16.840.1.113883.10.20.22.2.22.1" extension="2015-08-01"/>
          <code code="46240-8" codeSystem="2.16.840.1.113883.6.1" displayName="History of encounters"/>
          <title>Encounters</title>
          <text>
            <table>
              <thead><tr><th>Date</th><th>Type</th><th>Reason</th><th>Status</th></tr></thead>
              <tbody>
                ${patient.encounters.map(e => `<tr><td>${e.createdAt}</td><td>${e.type}</td><td>${e.chiefComplaint || 'N/A'}</td><td>${e.status}</td></tr>`).join('\n                ')}
              </tbody>
            </table>
          </text>
        </section>
      </component>

    </structuredBody>
  </component>
</ClinicalDocument>`;
  }

  private buildAllergyEntry(allergy: any): string {
    return `<entry typeCode="DRIV">
            <act classCode="ACT" moodCode="EVN">
              <templateId root="2.16.840.1.113883.10.20.22.4.30" extension="2015-08-01"/>
              <id root="${allergy.id}"/>
              <code code="CONC" codeSystem="2.16.840.1.113883.5.6"/>
              <statusCode code="${allergy.status === 'ACTIVE' ? 'active' : 'completed'}"/>
              <entryRelationship typeCode="SUBJ">
                <observation classCode="OBS" moodCode="EVN">
                  <templateId root="2.16.840.1.113883.10.20.22.4.7" extension="2014-06-09"/>
                  <code code="ASSERTION" codeSystem="2.16.840.1.113883.5.4"/>
                  <value xsi:type="CD" code="419199007" codeSystem="2.16.840.1.113883.6.96" displayName="${allergy.allergen}"/>
                </observation>
              </entryRelationship>
            </act>
          </entry>`;
  }

  private buildMedicationEntry(med: any): string {
    return `<entry typeCode="DRIV">
            <substanceAdministration classCode="SBADM" moodCode="EVN">
              <templateId root="2.16.840.1.113883.10.20.22.4.16" extension="2014-06-09"/>
              <id root="${med.id}"/>
              <statusCode code="${med.status === 'ACTIVE' ? 'active' : 'completed'}"/>
              <consumable>
                <manufacturedProduct classCode="MANU">
                  <templateId root="2.16.840.1.113883.10.20.22.4.23" extension="2014-06-09"/>
                  <manufacturedMaterial>
                    <code ${med.rxnormCode ? `code="${med.rxnormCode}" codeSystem="2.16.840.1.113883.6.88"` : ''} displayName="${med.name}"/>
                  </manufacturedMaterial>
                </manufacturedProduct>
              </consumable>
            </substanceAdministration>
          </entry>`;
  }

  private buildConditionEntry(condition: any): string {
    return `<entry typeCode="DRIV">
            <act classCode="ACT" moodCode="EVN">
              <templateId root="2.16.840.1.113883.10.20.22.4.3" extension="2015-08-01"/>
              <id root="${condition.id}"/>
              <code code="CONC" codeSystem="2.16.840.1.113883.5.6"/>
              <statusCode code="${condition.status === 'ACTIVE' ? 'active' : 'completed'}"/>
              <entryRelationship typeCode="SUBJ">
                <observation classCode="OBS" moodCode="EVN">
                  <templateId root="2.16.840.1.113883.10.20.22.4.4" extension="2015-08-01"/>
                  <code code="64572001" codeSystem="2.16.840.1.113883.6.96" displayName="Condition"/>
                  <value xsi:type="CD" ${condition.icd10Code ? `code="${condition.icd10Code}" codeSystem="2.16.840.1.113883.6.90"` : ''} displayName="${condition.name}"/>
                </observation>
              </entryRelationship>
            </act>
          </entry>`;
  }

  private formatHL7Date(date: string | Date): string {
    const d = new Date(date);
    return d.toISOString().replace(/[-:T]/g, '').slice(0, 14);
  }

  private mapGender(gender: string): string {
    const map: Record<string, string> = { MALE: 'M', FEMALE: 'F', OTHER: 'UN', UNKNOWN: 'UN' };
    return map[gender] || 'UN';
  }

  private mapMaritalStatus(status: string): string {
    const map: Record<string, string> = { SINGLE: 'S', MARRIED: 'M', DIVORCED: 'D', WIDOWED: 'W' };
    return map[status] || 'UNK';
  }
}
