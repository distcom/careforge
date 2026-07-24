import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuditService } from '../audit/audit.service';

export interface SmartTokenRequest {
  grantType: string;
  code?: string;
  refreshToken?: string;
  clientId: string;
  clientSecret?: string;
  redirectUri?: string;
  scope?: string;
}

export interface SmartAuthorizeRequest {
  responseType: string;
  clientId: string;
  redirectUri: string;
  scope: string;
  state?: string;
  aud?: string;
  launch?: string;
}

@Injectable()
export class FhirService {
  private readonly logger = new Logger(FhirService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // --- SMART on FHIR Authorization ---

  async getSmartConfiguration() {
    return {
      issuer: process.env.FHIR_ISSUER || 'https://careforge.example.com',
      jwks_uri: `${process.env.FHIR_ISSUER || 'https://careforge.example.com'}/.well-known/jwks.json`,
      authorization_endpoint: '/fhir/r4/smart/authorize',
      token_endpoint: '/fhir/r4/smart/token',
      introspection_endpoint: '/fhir/r4/smart/introspect',
      revocation_endpoint: '/fhir/r4/smart/revoke',
      capabilities: [
        'launch-ehr',
        'launch-standalone',
        'client-public',
        'client-confidential-symmetric',
        'sso-openid-connect',
        'context-ehr-patient',
        'context-ehr-encounter',
        'permission-patient',
        'permission-user',
        'permission-offline',
      ],
      scopes_supported: [
        'openid', 'fhirUser', 'launch', 'launch/patient', 'launch/encounter',
        'offline_access', 'patient/*.read', 'patient/*.write',
        'user/*.read', 'user/*.write', 'system/*.read',
      ],
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'refresh_token', 'client_credentials'],
      code_challenge_methods_supported: ['S256'],
    };
  }

  async handleSmartAuthorize(dto: SmartAuthorizeRequest, userId?: string) {
    // Validate client
    if (!dto.clientId || !dto.redirectUri) {
      throw new BadRequestException('client_id and redirect_uri are required');
    }
    if (dto.responseType !== 'code') {
      throw new BadRequestException('Only response_type=code is supported');
    }

    // Generate authorization code
    const authCode = `auth_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

    await this.auditService.log({
      action: 'FHIR_SMART_AUTHORIZE',
      entityType: 'SmartAuth',
      entityId: authCode,
      userId,
      details: { clientId: dto.clientId, scope: dto.scope, redirectUri: dto.redirectUri },
    });

    const redirectUrl = new URL(dto.redirectUri);
    redirectUrl.searchParams.set('code', authCode);
    if (dto.state) redirectUrl.searchParams.set('state', dto.state);

    return { redirectUrl: redirectUrl.toString(), code: authCode };
  }

  async handleSmartToken(dto: SmartTokenRequest, userId?: string) {
    if (!dto.clientId) {
      throw new BadRequestException('client_id is required');
    }

    let accessToken: string;
    let scope = dto.scope || 'patient/*.read';
    let expiresIn = 3600;

    switch (dto.grantType) {
      case 'authorization_code':
        if (!dto.code) throw new BadRequestException('code is required for authorization_code grant');
        accessToken = `at_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
        break;
      case 'refresh_token':
        if (!dto.refreshToken) throw new BadRequestException('refresh_token is required');
        accessToken = `at_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
        break;
      case 'client_credentials':
        if (!dto.clientSecret) throw new BadRequestException('client_secret is required for client_credentials');
        accessToken = `at_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
        scope = 'system/*.read';
        break;
      default:
        throw new BadRequestException(`Unsupported grant_type: ${dto.grantType}`);
    }

    await this.auditService.log({
      action: 'FHIR_SMART_TOKEN',
      entityType: 'SmartAuth',
      entityId: accessToken,
      userId,
      details: { clientId: dto.clientId, grantType: dto.grantType, scope },
    });

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: expiresIn,
      scope,
      patient: scope.includes('patient') ? 'context-patient' : undefined,
    };
  }

  async handleSmartIntrospect(token: string, userId?: string) {
    const isActive = token.startsWith('at_');
    await this.auditService.log({
      action: 'FHIR_SMART_INTROSPECT',
      entityType: 'SmartAuth',
      entityId: token.substring(0, 20),
      userId,
      details: { active: isActive },
    });
    return {
      active: isActive,
      scope: 'patient/*.read',
      client_id: 'careforge-client',
      token_type: 'Bearer',
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
  }

  async handleSmartRevoke(token: string, userId?: string) {
    await this.auditService.log({
      action: 'FHIR_SMART_REVOKE',
      entityType: 'SmartAuth',
      entityId: token.substring(0, 20),
      userId,
      details: { revoked: true },
    });
    return { revoked: true };
  }

  // --- FHIR Resources ---

  async getPatient(id: string, userId?: string) {
    const patient = await this.prisma.patient.findUnique({ where: { id } });
    if (!patient) throw new NotFoundException(`Patient/${id} not found`);

    await this.auditService.log({
      action: 'FHIR_RESOURCE_READ',
      entityType: 'Patient',
      entityId: id,
      userId,
      details: { resourceType: 'Patient' },
    });

    return this.mapPatient(patient);
  }

  async searchPatients(params: { name?: string; birthDate?: string; gender?: string; _count?: number }, userId?: string) {
    const where: any = { deletedAt: null };
    if (params.name) {
      where.OR = [
        { firstName: { contains: params.name, mode: 'insensitive' } },
        { lastName: { contains: params.name, mode: 'insensitive' } },
      ];
    }
    if (params.birthDate) where.dateOfBirth = params.birthDate;
    if (params.gender) where.gender = params.gender.toUpperCase();

    const [patients, total] = await Promise.all([
      this.prisma.patient.findMany({ where, take: params._count || 20 }),
      this.prisma.patient.count({ where }),
    ]);

    await this.auditService.log({
      action: 'FHIR_RESOURCE_SEARCH',
      entityType: 'Patient',
      entityId: 'search',
      userId,
      details: { params, resultCount: total },
    });

    return this.createBundle(patients.map((p) => this.mapPatient(p)), total);
  }

  async getEncounter(id: string, userId?: string) {
    const encounter = await this.prisma.encounter.findUnique({ where: { id } });
    if (!encounter) throw new NotFoundException(`Encounter/${id} not found`);

    await this.auditService.log({
      action: 'FHIR_RESOURCE_READ',
      entityType: 'Encounter',
      entityId: id,
      userId,
      details: { resourceType: 'Encounter' },
    });

    return this.mapEncounter(encounter);
  }

  async getPatientEncounters(patientId: string, userId?: string) {
    const encounters = await this.prisma.encounter.findMany({
      where: { patientId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    await this.auditService.log({
      action: 'FHIR_RESOURCE_SEARCH',
      entityType: 'Encounter',
      entityId: patientId,
      userId,
      details: { patientId, resultCount: encounters.length },
    });

    return this.createBundle(encounters.map((e) => this.mapEncounter(e)), encounters.length);
  }

  async getObservations(patientId: string, category?: string, userId?: string) {
    const vitals = await this.prisma.vitalSign.findMany({
      where: { patientId },
      orderBy: { recordedAt: 'desc' },
      take: 50,
    });

    const observations = vitals.flatMap((v) => this.mapVitals(v));

    await this.auditService.log({
      action: 'FHIR_RESOURCE_SEARCH',
      entityType: 'Observation',
      entityId: patientId,
      userId,
      details: { patientId, category, resultCount: observations.length },
    });

    return this.createBundle(observations, observations.length);
  }

  async getConditions(patientId: string, userId?: string) {
    const conditions = await this.prisma.condition.findMany({
      where: { patientId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    await this.auditService.log({
      action: 'FHIR_RESOURCE_SEARCH',
      entityType: 'Condition',
      entityId: patientId,
      userId,
      details: { patientId, resultCount: conditions.length },
    });

    return this.createBundle(conditions.map((c) => this.mapCondition(c)), conditions.length);
  }

  async getAllergies(patientId: string, userId?: string) {
    const allergies = await this.prisma.allergy.findMany({
      where: { patientId, deletedAt: null },
    });

    await this.auditService.log({
      action: 'FHIR_RESOURCE_SEARCH',
      entityType: 'AllergyIntolerance',
      entityId: patientId,
      userId,
      details: { patientId, resultCount: allergies.length },
    });

    return this.createBundle(allergies.map((a) => this.mapAllergy(a)), allergies.length);
  }

  async getMedications(patientId: string, userId?: string) {
    const meds = await this.prisma.medication.findMany({
      where: { patientId, deletedAt: null },
      orderBy: { startDate: 'desc' },
    });

    await this.auditService.log({
      action: 'FHIR_RESOURCE_SEARCH',
      entityType: 'MedicationRequest',
      entityId: patientId,
      userId,
      details: { patientId, resultCount: meds.length },
    });

    return this.createBundle(meds.map((m) => this.mapMedication(m)), meds.length);
  }

  async getImmunizations(patientId: string, userId?: string) {
    const immunizations = await this.prisma.immunization.findMany({
      where: { patientId },
      orderBy: { administeredAt: 'desc' },
    });

    await this.auditService.log({
      action: 'FHIR_RESOURCE_SEARCH',
      entityType: 'Immunization',
      entityId: patientId,
      userId,
      details: { patientId, resultCount: immunizations.length },
    });

    return this.createBundle(immunizations.map((i) => this.mapImmunization(i)), immunizations.length);
  }

  async getProcedures(patientId: string, userId?: string) {
    const procedures = await this.prisma.procedure.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
    });

    await this.auditService.log({
      action: 'FHIR_RESOURCE_SEARCH',
      entityType: 'Procedure',
      entityId: patientId,
      userId,
      details: { patientId, resultCount: procedures.length },
    });

    return this.createBundle(procedures.map((p) => this.mapProcedure(p)), procedures.length);
  }

  async getCarePlans(patientId: string, userId?: string) {
    const carePlans = await this.prisma.carePlan.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
      include: { goals: true },
    });

    await this.auditService.log({
      action: 'FHIR_RESOURCE_SEARCH',
      entityType: 'CarePlan',
      entityId: patientId,
      userId,
      details: { patientId, resultCount: carePlans.length },
    });

    return this.createBundle(carePlans.map((cp) => this.mapCarePlan(cp)), carePlans.length);
  }

  async getCoverage(patientId: string, userId?: string) {
    const insurances = await this.prisma.patientInsurance.findMany({
      where: { patientId, isActive: true },
      include: { insurancePlan: { include: { company: true } } },
    });

    await this.auditService.log({
      action: 'FHIR_RESOURCE_SEARCH',
      entityType: 'Coverage',
      entityId: patientId,
      userId,
      details: { patientId, resultCount: insurances.length },
    });

    return this.createBundle(insurances.map((i) => this.mapCoverage(i)), insurances.length);
  }

  async getConsents(patientId: string, userId?: string) {
    const consents = await this.prisma.consent.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
    });

    await this.auditService.log({
      action: 'FHIR_RESOURCE_SEARCH',
      entityType: 'Consent',
      entityId: patientId,
      userId,
      details: { patientId, resultCount: consents.length },
    });

    return this.createBundle(consents.map((c) => this.mapConsent(c)), consents.length);
  }

  async getDocumentReferences(patientId: string, userId?: string) {
    const documents = await this.prisma.clinicalDocument.findMany({
      where: { patientId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { category: { select: { name: true } } },
    });

    await this.auditService.log({
      action: 'FHIR_RESOURCE_SEARCH',
      entityType: 'DocumentReference',
      entityId: patientId,
      userId,
      details: { patientId, resultCount: documents.length },
    });

    return this.createBundle(documents.map((d) => this.mapDocumentReference(d)), documents.length);
  }

  async getServiceRequests(patientId: string, userId?: string) {
    const labOrders = await this.prisma.labOrder.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });

    await this.auditService.log({
      action: 'FHIR_RESOURCE_SEARCH',
      entityType: 'ServiceRequest',
      entityId: patientId,
      userId,
      details: { patientId, resultCount: labOrders.length },
    });

    return this.createBundle(labOrders.map((lo) => this.mapServiceRequest(lo)), labOrders.length);
  }

  async getDiagnosticReports(patientId: string, userId?: string) {
    const resultedOrders = await this.prisma.labOrder.findMany({
      where: { patientId, status: 'RESULTED' },
      orderBy: { resultedAt: 'desc' },
      include: { items: true },
    });

    await this.auditService.log({
      action: 'FHIR_RESOURCE_SEARCH',
      entityType: 'DiagnosticReport',
      entityId: patientId,
      userId,
      details: { patientId, resultCount: resultedOrders.length },
    });

    return this.createBundle(resultedOrders.map((lo) => this.mapDiagnosticReport(lo)), resultedOrders.length);
  }

  // --- $everything operation ---

  async getPatientEverything(patientId: string, userId?: string) {
    const patient = await this.prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) throw new NotFoundException(`Patient/${patientId} not found`);

    const [
      encounters,
      conditions,
      allergies,
      medications,
      immunizations,
      vitals,
      procedures,
      carePlans,
      insurances,
      consents,
      documents,
      labOrders,
    ] = await Promise.all([
      this.prisma.encounter.findMany({ where: { patientId, deletedAt: null }, take: 100 }),
      this.prisma.condition.findMany({ where: { patientId, deletedAt: null } }),
      this.prisma.allergy.findMany({ where: { patientId, deletedAt: null } }),
      this.prisma.medication.findMany({ where: { patientId, deletedAt: null } }),
      this.prisma.immunization.findMany({ where: { patientId } }),
      this.prisma.vitalSign.findMany({ where: { patientId }, take: 100 }),
      this.prisma.procedure.findMany({ where: { patientId } }),
      this.prisma.carePlan.findMany({ where: { patientId }, include: { goals: true } }),
      this.prisma.patientInsurance.findMany({ where: { patientId, isActive: true }, include: { insurancePlan: { include: { company: true } } } }),
      this.prisma.consent.findMany({ where: { patientId } }),
      this.prisma.clinicalDocument.findMany({ where: { patientId, deletedAt: null } }),
      this.prisma.labOrder.findMany({ where: { patientId }, include: { items: true } }),
    ]);

    await this.auditService.log({
      action: 'FHIR_PATIENT_EVERYTHING',
      entityType: 'Patient',
      entityId: patientId,
      userId,
      details: {
        resourceCounts: {
          encounters: encounters.length,
          conditions: conditions.length,
          allergies: allergies.length,
          medications: medications.length,
          immunizations: immunizations.length,
          procedures: procedures.length,
          carePlans: carePlans.length,
        },
      },
    });

    const resources: any[] = [
      this.mapPatient(patient),
      ...encounters.map((e) => this.mapEncounter(e)),
      ...conditions.map((c) => this.mapCondition(c)),
      ...allergies.map((a) => this.mapAllergy(a)),
      ...medications.map((m) => this.mapMedication(m)),
      ...immunizations.map((i) => this.mapImmunization(i)),
      ...vitals.flatMap((v) => this.mapVitals(v)),
      ...procedures.map((p) => this.mapProcedure(p)),
      ...carePlans.map((cp) => this.mapCarePlan(cp)),
      ...insurances.map((i) => this.mapCoverage(i)),
      ...consents.map((c) => this.mapConsent(c)),
      ...documents.map((d) => this.mapDocumentReference(d)),
      ...labOrders.map((lo) => this.mapServiceRequest(lo)),
    ];

    return {
      resourceType: 'Bundle',
      type: 'searchset',
      total: resources.length,
      entry: resources.map((r) => ({
        fullUrl: `urn:uuid:${r.id}`,
        resource: r,
      })),
    };
  }

  // --- Provenance ---

  async getProvenance(targetType: string, targetId: string, userId?: string) {
    const auditLogs = await this.prisma.auditLog.findMany({
      where: { entityType: targetType, entityId: targetId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    await this.auditService.log({
      action: 'FHIR_PROVENANCE_READ',
      entityType: 'Provenance',
      entityId: `${targetType}/${targetId}`,
      userId,
      details: { targetType, targetId },
    });

    return {
      resourceType: 'Provenance',
      id: `prov-${targetType}-${targetId}`,
      target: [{ reference: `${targetType}/${targetId}` }],
      recorded: new Date().toISOString(),
      agent: auditLogs.map((log) => ({
        type: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/provenance-participant-type', code: 'author' }] },
        who: { reference: `Practitioner/${log.userId}` },
        onBehalfOf: { reference: 'Organization/careforge' },
      })),
      entity: auditLogs.map((log) => ({
        role: 'source',
        what: { reference: `${log.entityType}/${log.entityId}` },
      })),
    };
  }

  // --- Capability Statement ---

  async getCapabilityStatement() {
    return {
      resourceType: 'CapabilityStatement',
      status: 'active',
      date: new Date().toISOString(),
      kind: 'instance',
      fhirVersion: '4.0.1',
      format: ['json'],
      implementation: {
        description: 'CareForge EHR FHIR R4 Server with SMART on FHIR',
        url: process.env.FHIR_ISSUER || 'https://careforge.example.com/fhir/r4',
      },
      software: { name: 'CareForge EHR', version: '1.0.0' },
      rest: [{
        mode: 'server',
        security: {
          cors: true,
          service: [{
            coding: [{
              system: 'http://terminology.hl7.org/CodeSystem/restful-security-service',
              code: 'SMART-on-FHIR',
            }],
          }],
          description: 'OAuth2 using SMART-on-FHIR profile (see http://hl7.org/fhir/smart-app-launch)',
        },
        resource: [
          { type: 'Patient', interaction: [{ code: 'read' }, { code: 'search-type' }], searchParam: [{ name: 'name', type: 'string' }, { name: 'birthdate', type: 'date' }, { name: 'gender', type: 'token' }] },
          { type: 'Encounter', interaction: [{ code: 'read' }, { code: 'search-type' }], searchParam: [{ name: 'patient', type: 'reference' }] },
          { type: 'Observation', interaction: [{ code: 'search-type' }], searchParam: [{ name: 'patient', type: 'reference' }, { name: 'category', type: 'token' }] },
          { type: 'Condition', interaction: [{ code: 'search-type' }], searchParam: [{ name: 'patient', type: 'reference' }] },
          { type: 'AllergyIntolerance', interaction: [{ code: 'search-type' }], searchParam: [{ name: 'patient', type: 'reference' }] },
          { type: 'MedicationRequest', interaction: [{ code: 'search-type' }], searchParam: [{ name: 'patient', type: 'reference' }] },
          { type: 'Immunization', interaction: [{ code: 'search-type' }], searchParam: [{ name: 'patient', type: 'reference' }] },
          { type: 'Procedure', interaction: [{ code: 'search-type' }], searchParam: [{ name: 'patient', type: 'reference' }] },
          { type: 'CarePlan', interaction: [{ code: 'search-type' }], searchParam: [{ name: 'patient', type: 'reference' }] },
          { type: 'Coverage', interaction: [{ code: 'search-type' }], searchParam: [{ name: 'patient', type: 'reference' }] },
          { type: 'Consent', interaction: [{ code: 'search-type' }], searchParam: [{ name: 'patient', type: 'reference' }] },
          { type: 'DocumentReference', interaction: [{ code: 'search-type' }], searchParam: [{ name: 'patient', type: 'reference' }] },
          { type: 'ServiceRequest', interaction: [{ code: 'search-type' }], searchParam: [{ name: 'patient', type: 'reference' }] },
          { type: 'DiagnosticReport', interaction: [{ code: 'search-type' }], searchParam: [{ name: 'patient', type: 'reference' }] },
          { type: 'Provenance', interaction: [{ code: 'read' }] },
        ],
        operation: [
          { name: 'everything', definition: 'http://hl7.org/fhir/OperationDefinition/Patient-everything' },
        ],
      }],
    };
  }

  // --- Private Mappers ---

  private createBundle(resources: any[], total: number) {
    return {
      resourceType: 'Bundle',
      type: 'searchset',
      total,
      entry: resources.map((r) => ({
        fullUrl: `urn:uuid:${r.id}`,
        resource: r,
        search: { mode: 'match' },
      })),
    };
  }

  private mapPatient(p: any) {
    return {
      resourceType: 'Patient',
      id: p.id,
      meta: { lastUpdated: p.updatedAt, profile: ['http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient'] },
      identifier: [
        { system: 'urn:careforge:mrn', value: p.medicalRecordNumber },
        ...(p.ssn ? [{ system: 'http://hl7.org/fhir/sid/us-ssn', value: p.ssn }] : []),
      ],
      active: p.status === 'ACTIVE',
      name: [{ use: 'official', family: p.lastName, given: [p.firstName, p.middleName].filter(Boolean) }],
      gender: (p.gender?.toLowerCase() || 'unknown'),
      birthDate: p.dateOfBirth,
      address: p.address ? [{ line: [p.address], city: p.city, state: p.state, postalCode: p.zipCode, country: 'US' }] : [],
      telecom: [
        ...(p.phone ? [{ system: 'phone', value: p.phone }] : []),
        ...(p.email ? [{ system: 'email', value: p.email }] : []),
      ],
    };
  }

  private mapEncounter(e: any) {
    const statusMap: Record<string, string> = { IN_PROGRESS: 'in-progress', COMPLETED: 'finished', SIGNED: 'finished', CANCELLED: 'cancelled' };
    return {
      resourceType: 'Encounter',
      id: e.id,
      meta: { profile: ['http://hl7.org/fhir/us/core/StructureDefinition/us-core-encounter'] },
      status: statusMap[e.status] || 'finished',
      class: { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: e.type === 'TELEHEALTH' ? 'VR' : 'AMB' },
      subject: { reference: `Patient/${e.patientId}` },
      period: { start: e.createdAt },
      reasonCode: e.chiefComplaint ? [{ text: e.chiefComplaint }] : undefined,
    };
  }

  private mapVitals(v: any) {
    const codes: Record<string, { code: string; display: string; unit: string }> = {
      systolicBP: { code: '8480-6', display: 'Systolic blood pressure', unit: 'mm[Hg]' },
      diastolicBP: { code: '8462-4', display: 'Diastolic blood pressure', unit: 'mm[Hg]' },
      heartRate: { code: '8867-4', display: 'Heart rate', unit: '/min' },
      temperature: { code: '8310-5', display: 'Body temperature', unit: 'Cel' },
      respiratoryRate: { code: '9279-1', display: 'Respiratory rate', unit: '/min' },
      oxygenSaturation: { code: '2708-6', display: 'Oxygen saturation', unit: '%' },
      weight: { code: '29463-7', display: 'Body weight', unit: 'kg' },
      height: { code: '8302-2', display: 'Body height', unit: 'cm' },
    };
    const obs: any[] = [];
    for (const [key, cfg] of Object.entries(codes)) {
      if (v[key] != null) {
        obs.push({
          resourceType: 'Observation',
          id: `${v.id}-${key}`,
          meta: { profile: ['http://hl7.org/fhir/us/core/StructureDefinition/us-core-vital-signs'] },
          status: 'final',
          category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'vital-signs' }] }],
          code: { coding: [{ system: 'http://loinc.org', code: cfg.code, display: cfg.display }] },
          subject: { reference: `Patient/${v.patientId}` },
          effectiveDateTime: v.recordedAt || v.createdAt,
          valueQuantity: { value: v[key], unit: cfg.unit, system: 'http://unitsofmeasure.org' },
        });
      }
    }
    return obs;
  }

  private mapCondition(c: any) {
    return {
      resourceType: 'Condition',
      id: c.id,
      meta: { profile: ['http://hl7.org/fhir/us/core/StructureDefinition/us-core-condition'] },
      clinicalStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: c.status === 'RESOLVED' ? 'resolved' : 'active' }] },
      code: { coding: c.icd10Code ? [{ system: 'http://hl7.org/fhir/sid/icd-10-cm', code: c.icd10Code, display: c.name }] : [], text: c.name },
      subject: { reference: `Patient/${c.patientId}` },
      onsetDateTime: c.onsetDate || undefined,
      recordedDate: c.createdAt,
    };
  }

  private mapAllergy(a: any) {
    return {
      resourceType: 'AllergyIntolerance',
      id: a.id,
      meta: { profile: ['http://hl7.org/fhir/us/core/StructureDefinition/us-core-allergyintolerance'] },
      clinicalStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical', code: a.status === 'RESOLVED' ? 'resolved' : 'active' }] },
      code: { text: a.allergen },
      patient: { reference: `Patient/${a.patientId}` },
      recordedDate: a.createdAt,
    };
  }

  private mapMedication(m: any) {
    return {
      resourceType: 'MedicationRequest',
      id: m.id,
      meta: { profile: ['http://hl7.org/fhir/us/core/StructureDefinition/us-core-medicationrequest'] },
      status: m.status === 'ACTIVE' ? 'active' : m.status === 'DISCONTINUED' ? 'stopped' : 'completed',
      intent: 'order',
      medicationCodeableConcept: { coding: m.rxnormCode ? [{ system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: m.rxnormCode, display: m.name }] : [], text: m.name },
      subject: { reference: `Patient/${m.patientId}` },
      authoredOn: m.startDate || m.createdAt,
    };
  }

  private mapImmunization(i: any) {
    return {
      resourceType: 'Immunization',
      id: i.id,
      meta: { profile: ['http://hl7.org/fhir/us/core/StructureDefinition/us-core-immunization'] },
      status: 'completed',
      vaccineCode: { coding: i.cvxCode ? [{ system: 'http://hl7.org/fhir/sid/cvx', code: i.cvxCode, display: i.vaccineName }] : [], text: i.vaccineName },
      patient: { reference: `Patient/${i.patientId}` },
      occurrenceDateTime: i.administeredAt || i.createdAt,
      lotNumber: i.lotNumber || undefined,
    };
  }

  private mapProcedure(p: any) {
    const statusMap: Record<string, string> = { SCHEDULED: 'preparation', IN_PROGRESS: 'in-progress', COMPLETED: 'completed', CANCELLED: 'not-done' };
    return {
      resourceType: 'Procedure',
      id: p.id,
      meta: { profile: ['http://hl7.org/fhir/us/core/StructureDefinition/us-core-procedure'] },
      status: statusMap[p.status] || 'completed',
      code: { coding: p.cptCode ? [{ system: 'http://www.ama-assn.org/go/cpt', code: p.cptCode, display: p.name }] : [], text: p.name },
      subject: { reference: `Patient/${p.patientId}` },
      performedDateTime: p.completedAt || p.scheduledAt || p.createdAt,
    };
  }

  private mapCarePlan(cp: any) {
    const statusMap: Record<string, string> = { ACTIVE: 'active', COMPLETED: 'completed', CANCELLED: 'cancelled', ON_HOLD: 'on-hold' };
    return {
      resourceType: 'CarePlan',
      id: cp.id,
      meta: { profile: ['http://hl7.org/fhir/us/core/StructureDefinition/us-core-careplan'] },
      status: statusMap[cp.status] || 'active',
      intent: 'plan',
      category: [{ coding: [{ system: 'http://hl7.org/fhir/us/core/CodeSystem/careplan-category', code: 'assess-plan' }] }],
      subject: { reference: `Patient/${cp.patientId}` },
      title: cp.name,
      description: cp.description,
      created: cp.createdAt,
    };
  }

  private mapCoverage(i: any) {
    return {
      resourceType: 'Coverage',
      id: i.id,
      meta: { profile: ['http://hl7.org/fhir/us/core/StructureDefinition/us-core-coverage'] },
      status: i.isActive ? 'active' : 'cancelled',
      type: { text: i.insurancePlan?.planType || 'insurance' },
      subscriber: { reference: `Patient/${i.patientId}` },
      beneficiary: { reference: `Patient/${i.patientId}` },
      payor: [{ display: i.insurancePlan?.company?.name || 'Unknown' }],
      class: [{ type: { text: 'group' }, value: i.groupNumber || '' }],
      order: i.priority || 1,
    };
  }

  private mapConsent(c: any) {
    const statusMap: Record<string, string> = { PENDING: 'proposed', GRANTED: 'active', DENIED: 'rejected', REVOKED: 'inactive', EXPIRED: 'inactive' };
    return {
      resourceType: 'Consent',
      id: c.id,
      status: statusMap[c.status] || 'proposed',
      scope: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/consentscope', code: 'patient-privacy' }] },
      category: [{ coding: [{ system: 'http://loinc.org', code: '59284-0', display: 'Consent Document' }] }],
      patient: { reference: `Patient/${c.patientId}` },
      dateTime: c.createdAt,
      provision: { type: c.status === 'GRANTED' ? 'permit' : 'deny' },
    };
  }

  private mapDocumentReference(d: any) {
    const statusMap: Record<string, string> = { DRAFT: 'preliminary', FINAL: 'final', SIGNED: 'final', OBSOLETE: 'superseded' };
    return {
      resourceType: 'DocumentReference',
      id: d.id,
      meta: { profile: ['http://hl7.org/fhir/us/core/StructureDefinition/us-core-documentreference'] },
      status: statusMap[d.status] || 'current',
      type: { coding: d.category?.name ? [{ display: d.category.name }] : [], text: d.documentType || 'Clinical Document' },
      subject: { reference: `Patient/${d.patientId}` },
      date: d.createdAt,
      content: [{ attachment: { contentType: d.mimeType || 'application/pdf', title: d.title } }],
    };
  }

  private mapServiceRequest(lo: any) {
    const statusMap: Record<string, string> = { ORDERED: 'active', IN_PROGRESS: 'active', RESULTED: 'completed', CANCELLED: 'revoked' };
    return {
      resourceType: 'ServiceRequest',
      id: lo.id,
      meta: { profile: ['http://hl7.org/fhir/us/core/StructureDefinition/us-core-servicerequest'] },
      status: statusMap[lo.status] || 'active',
      intent: 'order',
      category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/servicerequest-category', code: 'laboratory' }] }],
      code: { text: lo.orderName || 'Laboratory Order' },
      subject: { reference: `Patient/${lo.patientId}` },
      authoredOn: lo.createdAt,
    };
  }

  private mapDiagnosticReport(lo: any) {
    return {
      resourceType: 'DiagnosticReport',
      id: `dr-${lo.id}`,
      meta: { profile: ['http://hl7.org/fhir/us/core/StructureDefinition/us-core-diagnosticreport-lab'] },
      status: 'final',
      category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v2-0074', code: 'LAB', display: 'Laboratory' }] }],
      code: { text: lo.orderName || 'Laboratory Report' },
      subject: { reference: `Patient/${lo.patientId}` },
      effectiveDateTime: lo.resultedAt || lo.createdAt,
      issued: lo.resultedAt || lo.createdAt,
      result: (lo.items || []).map((item: any) => ({ reference: `Observation/${item.id}` })),
    };
  }
}
