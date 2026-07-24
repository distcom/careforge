import {
  Controller, Get, Post, Param, Query, Body, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FhirService, SmartTokenRequest, SmartAuthorizeRequest } from './fhir.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/auth.decorator';

@ApiTags('fhir')
@Controller('fhir/r4')
export class FhirController {
  constructor(private readonly fhirService: FhirService) {}

  // --- SMART on FHIR Authorization ---

  @Get('.well-known/smart-configuration')
  @Public()
  @ApiOperation({ summary: 'SMART on FHIR configuration' })
  getSmartConfiguration() {
    return this.fhirService.getSmartConfiguration();
  }

  @Get('smart/authorize')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'SMART authorization endpoint' })
  handleAuthorize(@Query() query: any, @CurrentUser() user: any) {
    const dto: SmartAuthorizeRequest = {
      responseType: query.response_type,
      clientId: query.client_id,
      redirectUri: query.redirect_uri,
      scope: query.scope,
      state: query.state,
      aud: query.aud,
      launch: query.launch,
    };
    return this.fhirService.handleSmartAuthorize(dto, user?.id);
  }

  @Post('smart/token')
  @Public()
  @ApiOperation({ summary: 'SMART token endpoint' })
  handleToken(@Body() body: any) {
    const dto: SmartTokenRequest = {
      grantType: body.grant_type,
      code: body.code,
      refreshToken: body.refresh_token,
      clientId: body.client_id,
      clientSecret: body.client_secret,
      redirectUri: body.redirect_uri,
      scope: body.scope,
    };
    return this.fhirService.handleSmartToken(dto);
  }

  @Post('smart/introspect')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'SMART token introspection' })
  handleIntrospect(@Body() body: { token: string }, @CurrentUser() user: any) {
    return this.fhirService.handleSmartIntrospect(body.token, user?.id);
  }

  @Post('smart/revoke')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'SMART token revocation' })
  handleRevoke(@Body() body: { token: string }, @CurrentUser() user: any) {
    return this.fhirService.handleSmartRevoke(body.token, user?.id);
  }

  // --- Capability Statement ---

  @Get('metadata')
  @Public()
  @ApiOperation({ summary: 'FHIR Capability Statement' })
  getCapabilityStatement() {
    return this.fhirService.getCapabilityStatement();
  }

  // --- Patient ---

  @Get('Patient/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Read Patient' })
  getPatient(@Param('id') id: string, @CurrentUser() user: any) {
    return this.fhirService.getPatient(id, user?.id);
  }

  @Get('Patient')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search Patients' })
  searchPatients(
    @Query('name') name?: string,
    @Query('birthdate') birthDate?: string,
    @Query('gender') gender?: string,
    @Query('_count') count?: string,
    @CurrentUser() user?: any,
  ) {
    return this.fhirService.searchPatients({
      name,
      birthDate,
      gender,
      _count: count ? parseInt(count, 10) : undefined,
    }, user?.id);
  }

  @Get('Patient/:id/$everything')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Patient $everything operation' })
  getPatientEverything(@Param('id') id: string, @CurrentUser() user: any) {
    return this.fhirService.getPatientEverything(id, user?.id);
  }

  // --- Encounter ---

  @Get('Encounter/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Read Encounter' })
  getEncounter(@Param('id') id: string, @CurrentUser() user: any) {
    return this.fhirService.getEncounter(id, user?.id);
  }

  @Get('Encounter')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search Encounters' })
  searchEncounters(@Query('patient') patientId: string, @CurrentUser() user: any) {
    return this.fhirService.getPatientEncounters(patientId, user?.id);
  }

  // --- Observation ---

  @Get('Observation')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search Observations' })
  searchObservations(
    @Query('patient') patientId: string,
    @Query('category') category?: string,
    @CurrentUser() user?: any,
  ) {
    return this.fhirService.getObservations(patientId, category, user?.id);
  }

  // --- Condition ---

  @Get('Condition')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search Conditions' })
  searchConditions(@Query('patient') patientId: string, @CurrentUser() user: any) {
    return this.fhirService.getConditions(patientId, user?.id);
  }

  // --- AllergyIntolerance ---

  @Get('AllergyIntolerance')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search AllergyIntolerances' })
  searchAllergies(@Query('patient') patientId: string, @CurrentUser() user: any) {
    return this.fhirService.getAllergies(patientId, user?.id);
  }

  // --- MedicationRequest ---

  @Get('MedicationRequest')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search MedicationRequests' })
  searchMedications(@Query('patient') patientId: string, @CurrentUser() user: any) {
    return this.fhirService.getMedications(patientId, user?.id);
  }

  // --- Immunization ---

  @Get('Immunization')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search Immunizations' })
  searchImmunizations(@Query('patient') patientId: string, @CurrentUser() user: any) {
    return this.fhirService.getImmunizations(patientId, user?.id);
  }

  // --- Procedure ---

  @Get('Procedure')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search Procedures' })
  searchProcedures(@Query('patient') patientId: string, @CurrentUser() user: any) {
    return this.fhirService.getProcedures(patientId, user?.id);
  }

  // --- CarePlan ---

  @Get('CarePlan')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search CarePlans' })
  searchCarePlans(@Query('patient') patientId: string, @CurrentUser() user: any) {
    return this.fhirService.getCarePlans(patientId, user?.id);
  }

  // --- Coverage ---

  @Get('Coverage')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search Coverage' })
  searchCoverage(@Query('patient') patientId: string, @CurrentUser() user: any) {
    return this.fhirService.getCoverage(patientId, user?.id);
  }

  // --- Consent ---

  @Get('Consent')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search Consents' })
  searchConsents(@Query('patient') patientId: string, @CurrentUser() user: any) {
    return this.fhirService.getConsents(patientId, user?.id);
  }

  // --- DocumentReference ---

  @Get('DocumentReference')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search DocumentReferences' })
  searchDocumentReferences(@Query('patient') patientId: string, @CurrentUser() user: any) {
    return this.fhirService.getDocumentReferences(patientId, user?.id);
  }

  // --- ServiceRequest ---

  @Get('ServiceRequest')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search ServiceRequests' })
  searchServiceRequests(@Query('patient') patientId: string, @CurrentUser() user: any) {
    return this.fhirService.getServiceRequests(patientId, user?.id);
  }

  // --- DiagnosticReport ---

  @Get('DiagnosticReport')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search DiagnosticReports' })
  searchDiagnosticReports(@Query('patient') patientId: string, @CurrentUser() user: any) {
    return this.fhirService.getDiagnosticReports(patientId, user?.id);
  }

  // --- Provenance ---

  @Get('Provenance/:targetType/:targetId')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Provenance for a resource' })
  getProvenance(
    @Param('targetType') targetType: string,
    @Param('targetId') targetId: string,
    @CurrentUser() user: any,
  ) {
    return this.fhirService.getProvenance(targetType, targetId, user?.id);
  }
}
