import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';

export interface DrugInteraction {
  severity: 'CONTRAINDICATED' | 'MAJOR' | 'MODERATE' | 'MINOR';
  drugA: string;
  drugB: string;
  description: string;
  recommendation: string;
}

export interface InteractionCheckResult {
  hasInteractions: boolean;
  interactions: DrugInteraction[];
  warnings: string[];
  allergies: string[];
}

/**
 * Drug Interaction & Safety Checking Service
 * Checks for drug-drug interactions, drug-allergy conflicts, and duplicate therapy
 */
@Injectable()
export class DrugInteractionService {
  constructor(private readonly prisma: PrismaService) {}

  // Built-in interaction database (subset - in production, integrate with RxNorm/DrugBank)
  private static INTERACTIONS: Array<{
    drugs: [string, string];
    severity: DrugInteraction['severity'];
    description: string;
    recommendation: string;
  }> = [
    {
      drugs: ['warfarin', 'aspirin'],
      severity: 'MAJOR',
      description: 'Increased risk of bleeding when combining anticoagulant with antiplatelet agent.',
      recommendation: 'Monitor INR closely. Consider GI prophylaxis. Assess bleeding risk vs benefit.',
    },
    {
      drugs: ['warfarin', 'ibuprofen'],
      severity: 'MAJOR',
      description: 'NSAIDs increase anticoagulant effect and risk of GI bleeding.',
      recommendation: 'Avoid combination if possible. Use acetaminophen for pain. Monitor INR.',
    },
    {
      drugs: ['lisinopril', 'spironolactone'],
      severity: 'MODERATE',
      description: 'Risk of hyperkalemia with ACE inhibitor and potassium-sparing diuretic.',
      recommendation: 'Monitor serum potassium within 1 week. Avoid potassium supplements.',
    },
    {
      drugs: ['metformin', 'contrast dye'],
      severity: 'MAJOR',
      description: 'Risk of lactic acidosis with iodinated contrast and metformin.',
      recommendation: 'Hold metformin 48 hours before and after contrast administration.',
    },
    {
      drugs: ['simvastatin', 'clarithromycin'],
      severity: 'CONTRAINDICATED',
      description: 'CYP3A4 inhibition dramatically increases statin levels, risk of rhabdomyolysis.',
      recommendation: 'Contraindicated. Use azithromycin instead, or hold statin during antibiotic course.',
    },
    {
      drugs: ['ssri', 'tramadol'],
      severity: 'MAJOR',
      description: 'Risk of serotonin syndrome with combined serotonergic activity.',
      recommendation: 'Avoid combination. Use alternative analgesic. Monitor for serotonin syndrome symptoms.',
    },
    {
      drugs: ['methotrexate', 'ibuprofen'],
      severity: 'CONTRAINDICATED',
      description: 'NSAIDs reduce methotrexate clearance, increasing toxicity risk.',
      recommendation: 'Contraindicated. Use acetaminophen for pain. Monitor CBC and renal function.',
    },
    {
      drugs: ['digoxin', 'amiodarone'],
      severity: 'MAJOR',
      description: 'Amiodarone increases digoxin levels by 70-100%.',
      recommendation: 'Reduce digoxin dose by 50%. Monitor digoxin levels and ECG.',
    },
    {
      drugs: ['clopidogrel', 'omeprazole'],
      severity: 'MODERATE',
      description: 'Omeprazole inhibits CYP2C19, reducing clopidogrel activation.',
      recommendation: 'Use pantoprazole instead of omeprazole. Separate dosing by 12 hours.',
    },
    {
      drugs: ['lithium', 'ibuprofen'],
      severity: 'MAJOR',
      description: 'NSAIDs reduce lithium clearance, increasing levels and toxicity risk.',
      recommendation: 'Avoid NSAIDs. Monitor lithium levels closely if combination necessary.',
    },
  ];

  async checkInteractions(
    patientId: string,
    newDrugName: string,
    newRxnormCode?: string,
  ): Promise<InteractionCheckResult> {
    const result: InteractionCheckResult = {
      hasInteractions: false,
      interactions: [],
      warnings: [],
      allergies: [],
    };

    // Get patient's current active medications
    const currentMeds = await this.prisma.medication.findMany({
      where: { patientId, status: 'ACTIVE', deletedAt: null },
    });

    // Get patient's allergies
    const allergies = await this.prisma.allergy.findMany({
      where: { patientId, status: 'ACTIVE', deletedAt: null },
    });

    const newDrugLower = newDrugName.toLowerCase();

    // Check drug-drug interactions
    for (const med of currentMeds) {
      const currentDrugLower = med.name.toLowerCase();

      for (const interaction of DrugInteractionService.INTERACTIONS) {
        const [drugA, drugB] = interaction.drugs;

        const matches =
          (newDrugLower.includes(drugA) && currentDrugLower.includes(drugB)) ||
          (newDrugLower.includes(drugB) && currentDrugLower.includes(drugA));

        if (matches) {
          result.interactions.push({
            severity: interaction.severity,
            drugA: newDrugName,
            drugB: med.name,
            description: interaction.description,
            recommendation: interaction.recommendation,
          });
        }
      }

      // Check for duplicate therapy
      if (currentDrugLower === newDrugLower || med.rxnormCode === newRxnormCode) {
        result.warnings.push(
          `Duplicate therapy: Patient is already taking ${med.name}. Verify intent before prescribing.`,
        );
      }
    }

    // Check drug-allergy interactions
    for (const allergy of allergies) {
      const allergenLower = allergy.allergen.toLowerCase();
      if (
        newDrugLower.includes(allergenLower) ||
        allergenLower.includes(newDrugLower) ||
        this.isDrugClassMatch(newDrugLower, allergenLower)
      ) {
        result.allergies.push(
          `ALLERGY ALERT: Patient has documented allergy to "${allergy.allergen}" (severity: ${allergy.severity || 'unknown'}). Reaction: ${allergy.reaction || 'not specified'}.`,
        );
      }
    }

    result.hasInteractions = result.interactions.length > 0 || result.allergies.length > 0;

    // Sort by severity
    const severityOrder = { CONTRAINDICATED: 0, MAJOR: 1, MODERATE: 2, MINOR: 3 };
    result.interactions.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return result;
  }

  private isDrugClassMatch(drug: string, allergen: string): boolean {
    // Drug class cross-reactivity checks
    const classes: Record<string, string[]> = {
      penicillin: ['amoxicillin', 'ampicillin', 'augmentin', 'piperacillin'],
      sulfa: ['sulfamethoxazole', 'bactrim', 'sulfasalazine'],
      nsaid: ['ibuprofen', 'naproxen', 'aspirin', 'diclofenac', 'celecoxib'],
      ace_inhibitor: ['lisinopril', 'enalapril', 'ramipril', 'captopril'],
      statin: ['atorvastatin', 'simvastatin', 'rosuvastatin', 'pravastatin'],
    };

    for (const [, members] of Object.entries(classes)) {
      const drugInClass = members.some((m) => drug.includes(m));
      const allergenInClass = members.some((m) => allergen.includes(m)) || members.some((m) => allergen.includes(m.split('(')[0]));
      if (drugInClass && allergenInClass) return true;
    }

    return false;
  }
}
