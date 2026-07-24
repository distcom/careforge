import { Injectable } from '@nestjs/common';

export interface PatientData {
  mrn: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  dateOfBirth: string;
  gender: string;
  ssn?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  phone?: string;
}

export interface ProviderData {
  npi: string;
  name: string;
  organization: string;
  address?: string;
  phone?: string;
}

export interface EncounterData {
  id: string;
  type: string;
  date: string;
  reason?: string;
  diagnoses: DiagnosisData[];
  provider: ProviderData;
}

export interface DiagnosisData {
  code: string;
  system: string;
  displayName: string;
  date?: string;
}

export interface MedicationData {
  name: string;
  code?: string;
  dose?: string;
  route?: string;
  frequency?: string;
  startDate?: string;
  endDate?: string;
  status: string;
}

export interface AllergyData {
  substance: string;
  code?: string;
  reaction: string;
  severity: string;
  status: string;
}

export interface VitalSignData {
  type: string;
  code: string;
  value: string;
  unit: string;
  date: string;
}

export interface ProcedureData {
  name: string;
  code: string;
  date: string;
  status: string;
}

export interface LabResultData {
  name: string;
  code: string;
  value: string;
  unit: string;
  range?: string;
  date: string;
}

export interface ImmunizationData {
  name: string;
  code: string;
  date: string;
  lotNumber?: string;
  route?: string;
}

export interface CarePlanData {
  title: string;
  status: string;
  startDate: string;
  goals: string[];
  interventions: string[];
}

@Injectable()
export class CCdaGenerator {
  private readonly CDA_NS = 'urn:hl7-org:v3';
  private readonly SDTC_NS = 'urn:hl7-org:sdtc';
  private readonly XSI_NS = 'http://www.w3.org/2001/XMLSchema-instance';

  generateCCD(
    patient: PatientData,
    provider: ProviderData,
    data: {
      encounters: EncounterData[];
      medications: MedicationData[];
      allergies: AllergyData[];
      vitals: VitalSignData[];
      procedures: ProcedureData[];
      labResults: LabResultData[];
      immunizations: ImmunizationData[];
      carePlans: CarePlanData[];
    },
  ): string {
    const docId = this.generateUuid();
    const effectiveTime = this.formatDateTime(new Date());

    return `<?xml version="1.0" encoding="UTF-8"?>
<ClinicalDocument xmlns="${this.CDA_NS}" xmlns:sdtc="${this.SDTC_NS}" xmlns:xsi="${this.XSI_NS}" classCode="DOCCLIN" moodCode="EVN">
  <realmCode code="US"/>
  <typeId root="2.16.840.1.113883.1.3" extension="POCD_HD000040"/>
  <templateId root="2.16.840.1.113883.10.20.22.1.1" extension="2015-08-01"/>
  <templateId root="2.16.840.1.113883.10.20.22.1.2" extension="2015-08-01"/>
  <id root="${docId}"/>
  <code code="34133-9" displayName="Summarization of Episode Note" codeSystem="2.16.840.1.113883.6.1" codeSystemName="LOINC"/>
  <title>CareForge Continuity of Care Document</title>
  <effectiveTime value="${effectiveTime}"/>
  <confidentialityCode code="N" displayName="Normal" codeSystem="2.16.840.1.113883.5.25"/>
  <languageCode code="en-US"/>
  <recordTarget>
    <patientRole>
      <id root="2.16.840.1.113883.4.1" extension="${patient.mrn}"/>
      <addr use="HP">
        <streetAddressLine>${this.escapeXml(patient.address || '')}</streetAddressLine>
        <city>${this.escapeXml(patient.city || '')}</city>
        <state>${this.escapeXml(patient.state || '')}</state>
        <postalCode>${this.escapeXml(patient.zipCode || '')}</postalCode>
        <country>US</country>
      </addr>
      <telecom value="tel:${patient.phone || ''}" use="HP"/>
      <patient>
        <name use="L">
          <given>${this.escapeXml(patient.firstName)}</given>
          ${patient.middleName ? `<given>${this.escapeXml(patient.middleName)}</given>` : ''}
          <family>${this.escapeXml(patient.lastName)}</family>
        </name>
        <administrativeGenderCode code="${this.mapGender(patient.gender)}" displayName="${patient.gender}" codeSystem="2.16.840.1.113883.5.1"/>
        <birthTime value="${this.formatDate(patient.dateOfBirth)}"/>
        ${patient.ssn ? `<sdtc:birthTime value="${patient.ssn}"/>` : ''}
      </patient>
    </patientRole>
  </recordTarget>
  <author>
    <time value="${effectiveTime}"/>
    <assignedAuthor>
      <id root="2.16.840.1.113883.4.6" extension="${provider.npi}"/>
      <addr>
        <streetAddressLine>${this.escapeXml(provider.address || '')}</streetAddressLine>
      </addr>
      <telecom value="tel:${provider.phone || ''}" use="WP"/>
      <assignedPerson>
        <name>
          <given>${this.escapeXml(provider.name.split(' ')[0] || '')}</given>
          <family>${this.escapeXml(provider.name.split(' ').slice(-1)[0] || '')}</family>
        </name>
      </assignedPerson>
      <representedOrganization>
        <id root="2.16.840.1.113883.4.6" extension="${provider.npi}"/>
        <name>${this.escapeXml(provider.organization)}</name>
      </representedOrganization>
    </assignedAuthor>
  </author>
  <custodian>
    <assignedCustodian>
      <representedCustodianOrganization>
        <id root="2.16.840.1.113883.4.6" extension="${provider.npi}"/>
        <name>${this.escapeXml(provider.organization)}</name>
      </representedCustodianOrganization>
    </assignedCustodian>
  </custodian>
  <component>
    <structuredBody>
      ${this.generateAllergiesSection(data.allergies)}
      ${this.generateMedicationsSection(data.medications)}
      ${this.generateProblemsSection(data.encounters.flatMap(e => e.diagnoses))}
      ${this.generateVitalsSection(data.vitals)}
      ${this.generateProceduresSection(data.procedures)}
      ${this.generateResultsSection(data.labResults)}
      ${this.generateImmunizationsSection(data.immunizations)}
      ${this.generateCarePlanSection(data.carePlans)}
      ${this.generateEncountersSection(data.encounters)}
    </structuredBody>
  </component>
</ClinicalDocument>`;
  }

  generateDischargeSummary(
    patient: PatientData,
    provider: ProviderData,
    admissionDate: string,
    dischargeDate: string,
    dischargeDisposition: string,
    data: {
      admissionDiagnosis: DiagnosisData[];
      dischargeDiagnosis: DiagnosisData[];
      procedures: ProcedureData[];
      medications: MedicationData[];
      dischargeInstructions: string;
    },
  ): string {
    const docId = this.generateUuid();
    const effectiveTime = this.formatDateTime(new Date());

    return `<?xml version="1.0" encoding="UTF-8"?>
<ClinicalDocument xmlns="${this.CDA_NS}" xmlns:sdtc="${this.SDTC_NS}" xmlns:xsi="${this.XSI_NS}" classCode="DOCCLIN" moodCode="EVN">
  <realmCode code="US"/>
  <typeId root="2.16.840.1.113883.1.3" extension="POCD_HD000040"/>
  <templateId root="2.16.840.1.113883.10.20.22.1.1" extension="2015-08-01"/>
  <templateId root="2.16.840.1.113883.10.20.22.1.8"/>
  <id root="${docId}"/>
  <code code="18842-5" displayName="Discharge Summary" codeSystem="2.16.840.1.113883.6.1" codeSystemName="LOINC"/>
  <title>CareForge Discharge Summary</title>
  <effectiveTime value="${effectiveTime}"/>
  <confidentialityCode code="N" displayName="Normal" codeSystem="2.16.840.1.113883.5.25"/>
  <languageCode code="en-US"/>
  <recordTarget>
    <patientRole>
      <id root="2.16.840.1.113883.4.1" extension="${patient.mrn}"/>
      <patient>
        <name use="L">
          <given>${this.escapeXml(patient.firstName)}</given>
          <family>${this.escapeXml(patient.lastName)}</family>
        </name>
        <administrativeGenderCode code="${this.mapGender(patient.gender)}" codeSystem="2.16.840.1.113883.5.1"/>
        <birthTime value="${this.formatDate(patient.dateOfBirth)}"/>
      </patient>
    </patientRole>
  </recordTarget>
  <author>
    <time value="${effectiveTime}"/>
    <assignedAuthor>
      <id root="2.16.840.1.113883.4.6" extension="${provider.npi}"/>
      <assignedPerson>
        <name>${this.escapeXml(provider.name)}</name>
      </assignedPerson>
    </assignedAuthor>
  </author>
  <componentOf>
    <encompassingEncounter>
      <id root="${this.generateUuid()}"/>
      <effectiveTime>
        <low value="${this.formatDate(admissionDate)}"/>
        <high value="${this.formatDate(dischargeDate)}"/>
      </effectiveTime>
      <dischargeDispositionCode code="${dischargeDisposition}" codeSystem="2.16.840.1.113883.12.112"/>
    </encompassingEncounter>
  </componentOf>
  <component>
    <structuredBody>
      ${this.generateProblemsSection(data.admissionDiagnosis, 'Admission Diagnosis')}
      ${this.generateProblemsSection(data.dischargeDiagnosis, 'Discharge Diagnosis')}
      ${this.generateProceduresSection(data.procedures)}
      ${this.generateMedicationsSection(data.medications)}
      <component>
        <section>
          <templateId root="2.16.840.1.113883.10.20.22.2.41"/>
          <code code="8653-8" displayName="Discharge Instructions" codeSystem="2.16.840.1.113883.6.1"/>
          <title>Discharge Instructions</title>
          <text>${this.escapeXml(data.dischargeInstructions)}</text>
        </section>
      </component>
    </structuredBody>
  </component>
</ClinicalDocument>`;
  }

  // --- Section Generators ---

  private generateAllergiesSection(allergies: AllergyData[]): string {
    const entries = allergies.map(a => `
          <entry typeCode="DRIV">
            <act classCode="ACT" moodCode="EVN">
              <templateId root="2.16.840.1.113883.10.20.22.4.30" extension="2015-08-01"/>
              <id root="${this.generateUuid()}"/>
              <code code="48765-2" displayName="Allergies and adverse reactions" codeSystem="2.16.840.1.113883.6.1"/>
              <statusCode code="active"/>
              <effectiveTime><low value="${this.formatDate(new Date().toISOString())}"/></effectiveTime>
              <entryRelationship typeCode="SUBJ">
                <observation classCode="OBS" moodCode="EVN">
                  <templateId root="2.16.840.1.113883.10.20.22.4.7" extension="2014-06-09"/>
                  <id root="${this.generateUuid()}"/>
                  <code code="ASSERTION" codeSystem="2.16.840.1.113883.5.4"/>
                  <statusCode code="completed"/>
                  <value xsi:type="CD" code="419199007" displayName="${this.escapeXml(a.reaction)}" codeSystem="2.16.840.1.113883.6.96"/>
                  <participant typeCode="CSM">
                    <participantRole classCode="MANU">
                      <playingEntity classCode="MMAT">
                        <code code="${a.code || '410942007'}" displayName="${this.escapeXml(a.substance)}" codeSystem="2.16.840.1.113883.6.96"/>
                      </playingEntity>
                    </participantRole>
                  </participant>
                  <entryRelationship typeCode="SUBJ">
                    <observation classCode="OBS" moodCode="EVN">
                      <templateId root="2.16.840.1.113883.10.20.22.4.8"/>
                      <code code="SEV" displayName="Severity" codeSystem="2.16.840.1.113883.5.4"/>
                      <value xsi:type="CD" code="${this.mapSeverity(a.severity)}" displayName="${a.severity}" codeSystem="2.16.840.1.113883.6.96"/>
                    </observation>
                  </entryRelationship>
                </observation>
              </entryRelationship>
            </act>
          </entry>`).join('');

    return `<component>
        <section>
          <templateId root="2.16.840.1.113883.10.20.22.2.6.1" extension="2015-08-01"/>
          <code code="48765-2" displayName="Allergies and adverse reactions" codeSystem="2.16.840.1.113883.6.1"/>
          <title>Allergies and Adverse Reactions</title>
          <text>${allergies.length > 0 ? allergies.map(a => `${a.substance} - ${a.reaction} (${a.severity})`).join('; ') : 'No known allergies'}</text>
          ${entries}
        </section>
      </component>`;
  }

  private generateMedicationsSection(medications: MedicationData[]): string {
    const entries = medications.map(m => `
          <entry typeCode="DRIV">
            <substanceAdministration classCode="SBADM" moodCode="EVN">
              <templateId root="2.16.840.1.113883.10.20.22.4.16" extension="2014-06-09"/>
              <id root="${this.generateUuid()}"/>
              <statusCode code="${m.status === 'active' ? 'active' : 'completed'}"/>
              <effectiveTime xsi:type="IVL_TS">
                <low value="${this.formatDate(m.startDate || new Date().toISOString())}"/>
                ${m.endDate ? `<high value="${this.formatDate(m.endDate)}"/>` : ''}
              </effectiveTime>
              <routeCode code="${this.mapRoute(m.route || 'oral')}" displayName="${m.route || 'Oral'}" codeSystem="2.16.840.1.113883.3.26.1.1"/>
              <doseQuantity value="${m.dose || '1'}"/>
              <consumable>
                <manufacturedProduct classCode="MANU">
                  <templateId root="2.16.840.1.113883.10.20.22.4.23"/>
                  <manufacturedMaterial>
                    <code code="${m.code || '410942007'}" displayName="${this.escapeXml(m.name)}" codeSystem="2.16.840.1.113883.6.88"/>
                  </manufacturedMaterial>
                </manufacturedProduct>
              </consumable>
            </substanceAdministration>
          </entry>`).join('');

    return `<component>
        <section>
          <templateId root="2.16.840.1.113883.10.20.22.2.1.1" extension="2014-06-09"/>
          <code code="10160-0" displayName="Medications" codeSystem="2.16.840.1.113883.6.1"/>
          <title>Medications</title>
          <text>${medications.map(m => `${m.name} ${m.dose || ''} ${m.frequency || ''}`).join('; ') || 'No medications'}</text>
          ${entries}
        </section>
      </component>`;
  }

  private generateProblemsSection(diagnoses: DiagnosisData[], title = 'Problem List'): string {
    const entries = diagnoses.map(d => `
          <entry typeCode="DRIV">
            <act classCode="ACT" moodCode="EVN">
              <templateId root="2.16.840.1.113883.10.20.22.4.3" extension="2015-08-01"/>
              <id root="${this.generateUuid()}"/>
              <code code="CONC" displayName="Concern" codeSystem="2.16.840.1.113883.5.6"/>
              <statusCode code="active"/>
              <effectiveTime><low value="${this.formatDate(d.date || new Date().toISOString())}"/></effectiveTime>
              <entryRelationship typeCode="SUBJ">
                <observation classCode="OBS" moodCode="EVN">
                  <templateId root="2.16.840.1.113883.10.20.22.4.4" extension="2015-08-01"/>
                  <id root="${this.generateUuid()}"/>
                  <code code="64572001" displayName="Condition" codeSystem="2.16.840.1.113883.6.96"/>
                  <statusCode code="completed"/>
                  <effectiveTime><low value="${this.formatDate(d.date || new Date().toISOString())}"/></effectiveTime>
                  <value xsi:type="CD" code="${d.code}" displayName="${this.escapeXml(d.displayName)}" codeSystem="${d.system}"/>
                </observation>
              </entryRelationship>
            </act>
          </entry>`).join('');

    return `<component>
        <section>
          <templateId root="2.16.840.1.113883.10.20.22.2.5.1" extension="2015-08-01"/>
          <code code="11450-4" displayName="Problem List" codeSystem="2.16.840.1.113883.6.1"/>
          <title>${title}</title>
          <text>${diagnoses.map(d => d.displayName).join('; ') || 'No known problems'}</text>
          ${entries}
        </section>
      </component>`;
  }

  private generateVitalsSection(vitals: VitalSignData[]): string {
    const entries = vitals.map(v => `
          <entry typeCode="DRIV">
            <organizer classCode="CLUSTER" moodCode="EVN">
              <templateId root="2.16.840.1.113883.10.20.22.4.26" extension="2015-08-01"/>
              <id root="${this.generateUuid()}"/>
              <code code="46680005" displayName="Vital signs" codeSystem="2.16.840.1.113883.6.96"/>
              <statusCode code="completed"/>
              <effectiveTime value="${this.formatDateTime(new Date(v.date))}"/>
              <component>
                <observation classCode="OBS" moodCode="EVN">
                  <templateId root="2.16.840.1.113883.10.20.22.4.27" extension="2014-06-09"/>
                  <id root="${this.generateUuid()}"/>
                  <code code="${v.code}" displayName="${this.escapeXml(v.type)}" codeSystem="2.16.840.1.113883.6.1"/>
                  <statusCode code="completed"/>
                  <effectiveTime value="${this.formatDateTime(new Date(v.date))}"/>
                  <value xsi:type="PQ" value="${v.value}" unit="${v.unit}"/>
                </observation>
              </component>
            </organizer>
          </entry>`).join('');

    return `<component>
        <section>
          <templateId root="2.16.840.1.113883.10.20.22.2.4.1" extension="2015-08-01"/>
          <code code="8716-3" displayName="Vital Signs" codeSystem="2.16.840.1.113883.6.1"/>
          <title>Vital Signs</title>
          <text>${vitals.map(v => `${v.type}: ${v.value} ${v.unit}`).join('; ') || 'No vital signs recorded'}</text>
          ${entries}
        </section>
      </component>`;
  }

  private generateProceduresSection(procedures: ProcedureData[]): string {
    const entries = procedures.map(p => `
          <entry typeCode="DRIV">
            <procedure classCode="PROC" moodCode="EVN">
              <templateId root="2.16.840.1.113883.10.20.22.4.14" extension="2014-06-09"/>
              <id root="${this.generateUuid()}"/>
              <code code="${p.code}" displayName="${this.escapeXml(p.name)}" codeSystem="2.16.840.1.113883.6.96"/>
              <statusCode code="${p.status === 'completed' ? 'completed' : 'active'}"/>
              <effectiveTime value="${this.formatDate(p.date)}"/>
            </procedure>
          </entry>`).join('');

    return `<component>
        <section>
          <templateId root="2.16.840.1.113883.10.20.22.2.7.1" extension="2014-06-09"/>
          <code code="47519-4" displayName="Procedures" codeSystem="2.16.840.1.113883.6.1"/>
          <title>Procedures</title>
          <text>${procedures.map(p => `${p.name} (${p.date})`).join('; ') || 'No procedures'}</text>
          ${entries}
        </section>
      </component>`;
  }

  private generateResultsSection(results: LabResultData[]): string {
    const entries = results.map(r => `
          <entry typeCode="DRIV">
            <organizer classCode="BATTERY" moodCode="EVN">
              <templateId root="2.16.840.1.113883.10.20.22.4.1" extension="2015-08-01"/>
              <id root="${this.generateUuid()}"/>
              <code code="${r.code}" displayName="${this.escapeXml(r.name)}" codeSystem="2.16.840.1.113883.6.1"/>
              <statusCode code="completed"/>
              <effectiveTime value="${this.formatDateTime(new Date(r.date))}"/>
              <component>
                <observation classCode="OBS" moodCode="EVN">
                  <templateId root="2.16.840.1.113883.10.20.22.4.2" extension="2015-08-01"/>
                  <id root="${this.generateUuid()}"/>
                  <code code="${r.code}" displayName="${this.escapeXml(r.name)}" codeSystem="2.16.840.1.113883.6.1"/>
                  <statusCode code="completed"/>
                  <effectiveTime value="${this.formatDateTime(new Date(r.date))}"/>
                  <value xsi:type="PQ" value="${r.value}" unit="${r.unit}"/>
                  ${r.range ? `<referenceRange><observationRange><text>${this.escapeXml(r.range)}</text></observationRange></referenceRange>` : ''}
                </observation>
              </component>
            </organizer>
          </entry>`).join('');

    return `<component>
        <section>
          <templateId root="2.16.840.1.113883.10.20.22.2.3.1" extension="2015-08-01"/>
          <code code="30954-2" displayName="Results" codeSystem="2.16.840.1.113883.6.1"/>
          <title>Results</title>
          <text>${results.map(r => `${r.name}: ${r.value} ${r.unit}`).join('; ') || 'No results'}</text>
          ${entries}
        </section>
      </component>`;
  }

  private generateImmunizationsSection(immunizations: ImmunizationData[]): string {
    const entries = immunizations.map(i => `
          <entry typeCode="DRIV">
            <substanceAdministration classCode="SBADM" moodCode="EVN" negationInd="false">
              <templateId root="2.16.840.1.113883.10.20.22.4.52" extension="2015-08-01"/>
              <id root="${this.generateUuid()}"/>
              <statusCode code="completed"/>
              <effectiveTime value="${this.formatDate(i.date)}"/>
              <routeCode code="${this.mapRoute(i.route || 'IM')}" codeSystem="2.16.840.1.113883.3.26.1.1"/>
              <consumable>
                <manufacturedProduct classCode="MANU">
                  <templateId root="2.16.840.1.113883.10.20.22.4.54"/>
                  <manufacturedMaterial>
                    <code code="${i.code}" displayName="${this.escapeXml(i.name)}" codeSystem="2.16.840.1.113883.6.59"/>
                    ${i.lotNumber ? `<lotNumberText>${this.escapeXml(i.lotNumber)}</lotNumberText>` : ''}
                  </manufacturedMaterial>
                </manufacturedProduct>
              </consumable>
            </substanceAdministration>
          </entry>`).join('');

    return `<component>
        <section>
          <templateId root="2.16.840.1.113883.10.20.22.2.2.1" extension="2015-08-01"/>
          <code code="11369-6" displayName="Immunizations" codeSystem="2.16.840.1.113883.6.1"/>
          <title>Immunizations</title>
          <text>${immunizations.map(i => `${i.name} (${i.date})`).join('; ') || 'No immunizations'}</text>
          ${entries}
        </section>
      </component>`;
  }

  private generateCarePlanSection(carePlans: CarePlanData[]): string {
    const entries = carePlans.map(cp => `
          <entry typeCode="DRIV">
            <act classCode="ACT" moodCode="INT">
              <templateId root="2.16.840.1.113883.10.20.22.4.20"/>
              <id root="${this.generateUuid()}"/>
              <code code="38717003" displayName="${this.escapeXml(cp.title)}" codeSystem="2.16.840.1.113883.6.96"/>
              <statusCode code="${cp.status === 'active' ? 'active' : 'completed'}"/>
              <effectiveTime><low value="${this.formatDate(cp.startDate)}"/></effectiveTime>
            </act>
          </entry>`).join('');

    return `<component>
        <section>
          <templateId root="2.16.840.1.113883.10.20.22.2.10"/>
          <code code="18776-5" displayName="Plan of Treatment" codeSystem="2.16.840.1.113883.6.1"/>
          <title>Plan of Care</title>
          <text>${carePlans.map(cp => `${cp.title}: ${cp.goals.join(', ')}`).join('; ') || 'No care plans'}</text>
          ${entries}
        </section>
      </component>`;
  }

  private generateEncountersSection(encounters: EncounterData[]): string {
    const entries = encounters.map(e => `
          <entry typeCode="DRIV">
            <encounter classCode="ENC" moodCode="EVN">
              <templateId root="2.16.840.1.113883.10.20.22.4.49" extension="2015-08-01"/>
              <id root="${e.id}"/>
              <code code="${this.mapEncounterType(e.type)}" displayName="${this.escapeXml(e.type)}" codeSystem="2.16.840.1.113883.6.12"/>
              <effectiveTime value="${this.formatDate(e.date)}"/>
              ${e.reason ? `<entryRelationship typeCode="RSON"><observation classCode="OBS" moodCode="EVN"><code code="409586006" displayName="Complaint" codeSystem="2.16.840.1.113883.6.96"/><value xsi:type="CD" displayName="${this.escapeXml(e.reason)}"/></observation></entryRelationship>` : ''}
            </encounter>
          </entry>`).join('');

    return `<component>
        <section>
          <templateId root="2.16.840.1.113883.10.20.22.2.22.1" extension="2015-08-01"/>
          <code code="46240-8" displayName="Encounters" codeSystem="2.16.840.1.113883.6.1"/>
          <title>Encounters</title>
          <text>${encounters.map(e => `${e.type} on ${e.date}`).join('; ') || 'No encounters'}</text>
          ${entries}
        </section>
      </component>`;
  }

  // --- Utility Methods ---

  private generateUuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  private formatDateTime(date: Date): string {
    return date.toISOString().replace(/[-:T]/g, '').substring(0, 14);
  }

  private formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toISOString().replace(/[-:T]/g, '').substring(0, 8);
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private mapGender(gender: string): string {
    const map: Record<string, string> = { male: 'M', female: 'F', other: 'UN', unknown: 'UN' };
    return map[gender.toLowerCase()] || 'UN';
  }

  private mapSeverity(severity: string): string {
    const map: Record<string, string> = { mild: '255604002', moderate: '6736007', severe: '24484000' };
    return map[severity.toLowerCase()] || '255604002';
  }

  private mapRoute(route: string): string {
    const map: Record<string, string> = { oral: 'C38288', im: 'C28161', iv: 'C38276', subcutaneous: 'C38299', topical: 'C38305' };
    return map[route.toLowerCase()] || 'C38288';
  }

  private mapEncounterType(type: string): string {
    const map: Record<string, string> = { office: '99213', emergency: '99281', inpatient: '99221', outpatient: '99213' };
    return map[type.toLowerCase()] || '99213';
  }
}
