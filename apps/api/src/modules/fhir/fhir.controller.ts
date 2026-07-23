import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FhirService } from './fhir.service';

@Controller('fhir/r4')
@UseGuards(AuthGuard('jwt'))
export class FhirController {
  constructor(private readonly fhirService: FhirService) {}

  @Get('metadata')
  getCapabilityStatement() {
    return this.fhirService.getCapabilityStatement();
  }

  @Get('Patient/:id')
  getPatient(@Param('id') id: string) {
    return this.fhirService.getPatient(id);
  }

  @Get('Patient')
  searchPatients(
    @Query('name') name?: string,
    @Query('birthdate') birthDate?: string,
    @Query('gender') gender?: string,
    @Query('_count') count?: string,
  ) {
    return this.fhirService.searchPatients({
      name,
      birthDate,
      gender,
      _count: count ? parseInt(count, 10) : undefined,
    });
  }

  @Get('Encounter/:id')
  getEncounter(@Param('id') id: string) {
    return this.fhirService.getEncounter(id);
  }

  @Get('Encounter')
  searchEncounters(@Query('patient') patientId: string) {
    return this.fhirService.getPatientEncounters(patientId);
  }

  @Get('Observation')
  searchObservations(
    @Query('patient') patientId: string,
    @Query('category') category?: string,
  ) {
    return this.fhirService.getObservations(patientId, category);
  }

  @Get('Condition')
  searchConditions(@Query('patient') patientId: string) {
    return this.fhirService.getConditions(patientId);
  }

  @Get('AllergyIntolerance')
  searchAllergies(@Query('patient') patientId: string) {
    return this.fhirService.getAllergies(patientId);
  }

  @Get('MedicationRequest')
  searchMedications(@Query('patient') patientId: string) {
    return this.fhirService.getMedications(patientId);
  }

  @Get('Immunization')
  searchImmunizations(@Query('patient') patientId: string) {
    return this.fhirService.getImmunizations(patientId);
  }
}
