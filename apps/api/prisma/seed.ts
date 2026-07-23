/**
 * CareForge EHR - Database Seed Script
 * Seeds initial data: roles, permissions, admin user, facility, code sets
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding CareForge database...');

  // 1. Create Roles
  const roles = await Promise.all([
    prisma.role.upsert({ where: { name: 'ADMIN' }, update: {}, create: { name: 'ADMIN', description: 'System administrator with full access' } }),
    prisma.role.upsert({ where: { name: 'PHYSICIAN' }, update: {}, create: { name: 'PHYSICIAN', description: 'Physician/Provider with clinical access' } }),
    prisma.role.upsert({ where: { name: 'NURSE' }, update: {}, create: { name: 'NURSE', description: 'Nurse with clinical access' } }),
    prisma.role.upsert({ where: { name: 'MA' }, update: {}, create: { name: 'MA', description: 'Medical Assistant' } }),
    prisma.role.upsert({ where: { name: 'FRONT_DESK' }, update: {}, create: { name: 'FRONT_DESK', description: 'Front desk / reception' } }),
    prisma.role.upsert({ where: { name: 'BILLING' }, update: {}, create: { name: 'BILLING', description: 'Billing specialist' } }),
    prisma.role.upsert({ where: { name: 'LAB_TECH' }, update: {}, create: { name: 'LAB_TECH', description: 'Laboratory technician' } }),
    prisma.role.upsert({ where: { name: 'PATIENT' }, update: {}, create: { name: 'PATIENT', description: 'Patient portal access' } }),
  ]);
  console.log(`  ✓ Created ${roles.length} roles`);

  // 2. Create Permissions
  const permissionNames = [
    'patient:read', 'patient:write', 'patient:delete',
    'encounter:read', 'encounter:write',
    'vitals:read', 'vitals:write',
    'condition:read', 'condition:write',
    'medication:read', 'medication:write',
    'allergy:read', 'allergy:write',
    'immunization:read', 'immunization:write',
    'lab:read', 'lab:write',
    'procedure:read', 'procedure:write',
    'document:read', 'document:write',
    'billing:read', 'billing:write',
    'insurance:read', 'insurance:write',
    'scheduling:read', 'scheduling:write',
    'messaging:read', 'messaging:write',
    'reporting:read',
    'admin:read', 'admin:write',
    'audit:read',
    'fhir:read',
  ];

  const permissions = await Promise.all(
    permissionNames.map((name) =>
      prisma.permission.upsert({ where: { name }, update: {}, create: { name } })
    )
  );
  console.log(`  ✓ Created ${permissions.length} permissions`);

  // 3. Assign all permissions to ADMIN role
  const adminRole = roles[0];
  await Promise.all(
    permissions.map((perm) =>
      prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: adminRole.id, permissionId: perm.id } },
        update: {},
        create: { roleId: adminRole.id, permissionId: perm.id },
      })
    )
  );
  console.log('  ✓ Assigned all permissions to ADMIN');

  // 4. Create default facility
  const facility = await prisma.facility.upsert({
    where: { name: 'CareForge Main Clinic' },
    update: {},
    create: {
      name: 'CareForge Main Clinic',
      address: '123 Healthcare Blvd',
      city: 'Springfield',
      state: 'IL',
      zipCode: '62701',
      phone: '(555) 123-4567',
      email: 'info@careforge.health',
      npi: '1234567890',
      taxId: '12-3456789',
      isActive: true,
    },
  });
  console.log(`  ✓ Created facility: ${facility.name}`);

  // 5. Create admin user
  const hashedPassword = await bcrypt.hash('Admin@123456', 12);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@careforge.health' },
    update: {},
    create: {
      email: 'admin@careforge.health',
      passwordHash: hashedPassword,
      firstName: 'System',
      lastName: 'Administrator',
      isActive: true,
      emailVerified: true,
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: adminRole.id } },
    update: {},
    create: { userId: adminUser.id, roleId: adminRole.id },
  });

  await prisma.userFacility.upsert({
    where: { userId_facilityId: { userId: adminUser.id, facilityId: facility.id } },
    update: {},
    create: { userId: adminUser.id, facilityId: facility.id, isPrimary: true },
  });
  console.log('  ✓ Created admin user: admin@careforge.health / Admin@123456');

  // 6. Create sample provider
  const providerPassword = await bcrypt.hash('Provider@123', 12);
  const provider = await prisma.user.upsert({
    where: { email: 'dr.smith@careforge.health' },
    update: {},
    create: {
      email: 'dr.smith@careforge.health',
      passwordHash: providerPassword,
      firstName: 'John',
      lastName: 'Smith',
      isActive: true,
      emailVerified: true,
    },
  });

  const physicianRole = roles[1];
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: provider.id, roleId: physicianRole.id } },
    update: {},
    create: { userId: provider.id, roleId: physicianRole.id },
  });

  await prisma.userFacility.upsert({
    where: { userId_facilityId: { userId: provider.id, facilityId: facility.id } },
    update: {},
    create: { userId: provider.id, facilityId: facility.id, isPrimary: true },
  });
  console.log('  ✓ Created provider: dr.smith@careforge.health / Provider@123');

  // 7. Seed code sets
  const codeSets = [
    { name: 'ICD-10-CM', description: 'International Classification of Diseases, 10th Revision' },
    { name: 'CPT', description: 'Current Procedural Terminology' },
    { name: 'LOINC', description: 'Logical Observation Identifiers Names and Codes' },
    { name: 'SNOMED-CT', description: 'Systematized Nomenclature of Medicine' },
    { name: 'RxNorm', description: 'RxNorm drug vocabulary' },
    { name: 'CVX', description: 'Vaccines Administered (CVX)' },
    { name: 'NDC', description: 'National Drug Codes' },
  ];

  for (const cs of codeSets) {
    await prisma.codeSet.upsert({
      where: { name: cs.name },
      update: {},
      create: { name: cs.name, description: cs.description, isActive: true },
    });
  }
  console.log(`  ✓ Created ${codeSets.length} code sets`);

  // 8. Seed sample ICD-10 codes
  const icd10Set = await prisma.codeSet.findUnique({ where: { name: 'ICD-10-CM' } });
  if (icd10Set) {
    const sampleCodes = [
      { code: 'E11.9', display: 'Type 2 diabetes mellitus without complications' },
      { code: 'I10', display: 'Essential (primary) hypertension' },
      { code: 'J45.909', display: 'Unspecified asthma, uncomplicated' },
      { code: 'M54.5', display: 'Low back pain' },
      { code: 'R51', display: 'Headache' },
      { code: 'J06.9', display: 'Acute upper respiratory infection, unspecified' },
      { code: 'K21.9', display: 'Gastro-esophageal reflux disease without esophagitis' },
      { code: 'E78.5', display: 'Hyperlipidemia, unspecified' },
      { code: 'F32.9', display: 'Major depressive disorder, single episode, unspecified' },
      { code: 'N39.0', display: 'Urinary tract infection, site not specified' },
    ];

    for (const sc of sampleCodes) {
      await prisma.codeValue.upsert({
        where: { codeSetId_code: { codeSetId: icd10Set.id, code: sc.code } },
        update: {},
        create: { codeSetId: icd10Set.id, code: sc.code, display: sc.display, isActive: true },
      });
    }
    console.log(`  ✓ Seeded ${sampleCodes.length} sample ICD-10 codes`);
  }

  // 9. Seed sample CPT codes
  const cptSet = await prisma.codeSet.findUnique({ where: { name: 'CPT' } });
  if (cptSet) {
    const cptCodes = [
      { code: '99213', display: 'Office visit, established patient, low complexity' },
      { code: '99214', display: 'Office visit, established patient, moderate complexity' },
      { code: '99203', display: 'Office visit, new patient, low complexity' },
      { code: '99204', display: 'Office visit, new patient, moderate complexity' },
      { code: '80053', display: 'Comprehensive metabolic panel' },
      { code: '85025', display: 'Complete blood count with differential' },
      { code: '83036', display: 'Hemoglobin A1c' },
      { code: '36415', display: 'Venipuncture' },
    ];

    for (const sc of cptCodes) {
      await prisma.codeValue.upsert({
        where: { codeSetId_code: { codeSetId: cptSet.id, code: sc.code } },
        update: {},
        create: { codeSetId: cptSet.id, code: sc.code, display: sc.display, isActive: true },
      });
    }
    console.log(`  ✓ Seeded ${cptCodes.length} sample CPT codes`);
  }

  console.log('\n✅ Seed complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
