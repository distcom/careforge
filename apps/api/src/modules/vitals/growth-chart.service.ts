import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';

export interface GrowthDataPoint {
  ageInMonths: number;
  value: number;
  percentile: number;
  zScore: number;
}

export interface GrowthChartResult {
  patientId: string;
  metric: 'weight' | 'height' | 'bmi' | 'headCircumference';
  dataPoints: GrowthDataPoint[];
  currentPercentile: number;
  trend: 'FOLLOWING_CURVE' | 'CROSSING_UP' | 'CROSSING_DOWN' | 'FALTERING' | 'ACCELERATING';
  alerts: string[];
}

/**
 * Pediatric Growth Chart Calculation Service
 * Implements WHO (0-2 years) and CDC (2-20 years) growth standards
 * Calculates percentiles, z-scores, and trend analysis
 */
@Injectable()
export class GrowthChartService {
  constructor(private readonly prisma: PrismaService) {}

  // WHO/CDC LMS parameters (simplified subset for common ages)
  // L = Lambda (skewness), M = Mu (median), S = Sigma (coefficient of variation)
  private static WEIGHT_FOR_AGE_MALE: Record<number, { L: number; M: number; S: number }> = {
    0: { L: 0.3487, M: 3.346, S: 0.14602 },
    1: { L: 0.2299, M: 4.471, S: 0.13398 },
    2: { L: 0.1971, M: 5.567, S: 0.12385 },
    3: { L: 0.1738, M: 6.383, S: 0.11718 },
    6: { L: 0.1356, M: 7.934, S: 0.10721 },
    9: { L: 0.1096, M: 8.901, S: 0.10105 },
    12: { L: 0.0903, M: 9.649, S: 0.09699 },
    18: { L: 0.0635, M: 10.938, S: 0.09401 },
    24: { L: 0.0469, M: 12.159, S: 0.09305 },
    36: { L: 0.0176, M: 14.260, S: 0.09498 },
    48: { L: -0.0067, M: 16.240, S: 0.09905 },
    60: { L: -0.0267, M: 18.240, S: 0.10420 },
    72: { L: -0.0434, M: 20.230, S: 0.10960 },
    96: { L: -0.0713, M: 24.260, S: 0.12070 },
    120: { L: -0.0972, M: 28.570, S: 0.13250 },
    144: { L: -0.1310, M: 34.010, S: 0.14530 },
    168: { L: -0.1540, M: 40.570, S: 0.15470 },
    192: { L: -0.1660, M: 47.140, S: 0.15700 },
    216: { L: -0.1700, M: 52.870, S: 0.15600 },
    240: { L: -0.1700, M: 56.870, S: 0.15300 },
  };

  private static WEIGHT_FOR_AGE_FEMALE: Record<number, { L: number; M: number; S: number }> = {
    0: { L: 0.3809, M: 3.232, S: 0.14171 },
    1: { L: 0.2756, M: 4.187, S: 0.13269 },
    2: { L: 0.2407, M: 5.128, S: 0.12479 },
    3: { L: 0.2140, M: 5.846, S: 0.11969 },
    6: { L: 0.1645, M: 7.297, S: 0.11069 },
    9: { L: 0.1327, M: 8.174, S: 0.10530 },
    12: { L: 0.1110, M: 8.948, S: 0.10230 },
    18: { L: 0.0810, M: 10.225, S: 0.10050 },
    24: { L: 0.0600, M: 11.477, S: 0.10100 },
    36: { L: 0.0290, M: 13.810, S: 0.10600 },
    48: { L: 0.0060, M: 15.920, S: 0.11200 },
    60: { L: -0.0120, M: 18.010, S: 0.11800 },
    72: { L: -0.0280, M: 20.170, S: 0.12400 },
    96: { L: -0.0560, M: 24.640, S: 0.13500 },
    120: { L: -0.0820, M: 29.680, S: 0.14600 },
    144: { L: -0.1100, M: 35.470, S: 0.15400 },
    168: { L: -0.1300, M: 41.010, S: 0.15800 },
    192: { L: -0.1400, M: 45.470, S: 0.15700 },
    216: { L: -0.1450, M: 48.570, S: 0.15400 },
    240: { L: -0.1450, M: 50.470, S: 0.15100 },
  };

  private static HEIGHT_FOR_AGE_MALE: Record<number, { L: number; M: number; S: number }> = {
    0: { L: 1.0, M: 49.99, S: 0.03795 },
    3: { L: 1.0, M: 61.43, S: 0.03556 },
    6: { L: 1.0, M: 67.62, S: 0.03291 },
    12: { L: 1.0, M: 75.75, S: 0.03052 },
    24: { L: 1.0, M: 87.82, S: 0.03609 },
    36: { L: 1.0, M: 96.08, S: 0.03752 },
    48: { L: 1.0, M: 103.31, S: 0.03884 },
    60: { L: 1.0, M: 110.01, S: 0.03994 },
    72: { L: 1.0, M: 116.04, S: 0.04088 },
    96: { L: 1.0, M: 127.28, S: 0.04310 },
    120: { L: 1.0, M: 137.82, S: 0.04590 },
    144: { L: 1.0, M: 149.09, S: 0.04970 },
    168: { L: 1.0, M: 160.43, S: 0.05120 },
    192: { L: 1.0, M: 168.55, S: 0.04850 },
    216: { L: 1.0, M: 173.17, S: 0.04400 },
    240: { L: 1.0, M: 175.68, S: 0.04200 },
  };

  private static HEIGHT_FOR_AGE_FEMALE: Record<number, { L: number; M: number; S: number }> = {
    0: { L: 1.0, M: 49.29, S: 0.03790 },
    3: { L: 1.0, M: 59.84, S: 0.03600 },
    6: { L: 1.0, M: 65.73, S: 0.03350 },
    12: { L: 1.0, M: 74.02, S: 0.03100 },
    24: { L: 1.0, M: 86.40, S: 0.03650 },
    36: { L: 1.0, M: 95.09, S: 0.03820 },
    48: { L: 1.0, M: 102.65, S: 0.03960 },
    60: { L: 1.0, M: 109.38, S: 0.04080 },
    72: { L: 1.0, M: 115.42, S: 0.04190 },
    96: { L: 1.0, M: 126.60, S: 0.04420 },
    120: { L: 1.0, M: 137.90, S: 0.04750 },
    144: { L: 1.0, M: 150.10, S: 0.04900 },
    168: { L: 1.0, M: 159.50, S: 0.04700 },
    192: { L: 1.0, M: 163.10, S: 0.04300 },
    216: { L: 1.0, M: 164.20, S: 0.04100 },
    240: { L: 1.0, M: 164.60, S: 0.04000 },
  };

  /**
   * Calculate growth percentiles for a patient
   */
  async calculateGrowthChart(
    patientId: string,
    metric: 'weight' | 'height' | 'bmi' | 'headCircumference' = 'weight',
  ): Promise<GrowthChartResult> {
    const patient = await this.prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) {
      return { patientId, metric, dataPoints: [], currentPercentile: 0, trend: 'FOLLOWING_CURVE', alerts: ['Patient not found'] };
    }

    const vitals = await this.prisma.vitalSign.findMany({
      where: { patientId },
      orderBy: { recordedAt: 'asc' },
    });

    const dob = new Date(patient.dateOfBirth);
    const isMale = patient.gender === 'MALE';
    const dataPoints: GrowthDataPoint[] = [];

    for (const vital of vitals) {
      const ageInMonths = this.calculateAgeInMonths(dob, new Date(vital.recordedAt));
      let value: number | null = null;

      switch (metric) {
        case 'weight':
          value = vital.weight ? Number(vital.weight) : null;
          break;
        case 'height':
          value = vital.height ? Number(vital.height) : null;
          break;
        case 'bmi':
          if (vital.weight && vital.height) {
            const heightM = Number(vital.height) / 100;
            value = Number(vital.weight) / (heightM * heightM);
          }
          break;
        case 'headCircumference':
          value = vital.headCircumference ? Number(vital.headCircumference) : null;
          break;
      }

      if (value === null) continue;

      const { percentile, zScore } = this.calculatePercentile(ageInMonths, value, metric, isMale);
      dataPoints.push({ ageInMonths, value, percentile, zScore });
    }

    // Determine trend
    const trend = this.analyzeTrend(dataPoints);
    const alerts = this.generateAlerts(dataPoints, metric);
    const currentPercentile = dataPoints.length > 0 ? dataPoints[dataPoints.length - 1].percentile : 0;

    return { patientId, metric, dataPoints, currentPercentile, trend, alerts };
  }

  /**
   * Calculate z-score and percentile from LMS parameters
   */
  calculatePercentile(
    ageInMonths: number,
    value: number,
    metric: string,
    isMale: boolean,
  ): { percentile: number; zScore: number } {
    const lmsTable = this.getLMSTable(metric, isMale);
    if (!lmsTable) return { percentile: 50, zScore: 0 };

    // Find closest age bracket
    const ages = Object.keys(lmsTable).map(Number).sort((a, b) => a - b);
    let closestAge = ages[0];
    for (const age of ages) {
      if (age <= ageInMonths) closestAge = age;
      else break;
    }

    const { L, M, S } = lmsTable[closestAge];

    // Calculate z-score using LMS formula
    let zScore: number;
    if (L !== 0) {
      zScore = (Math.pow(value / M, L) - 1) / (L * S);
    } else {
      zScore = Math.log(value / M) / S;
    }

    // Convert z-score to percentile
    const percentile = this.zScoreToPercentile(zScore);

    return { percentile: Math.round(percentile * 10) / 10, zScore: Math.round(zScore * 100) / 100 };
  }

  /**
   * Convert z-score to percentile using approximation of normal CDF
   */
  private zScoreToPercentile(z: number): number {
    // Abramowitz and Stegun approximation
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = z < 0 ? -1 : 1;
    const x = Math.abs(z) / Math.sqrt(2);
    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return 0.5 * (1.0 + sign * y) * 100;
  }

  /**
   * Analyze growth trend from data points
   */
  private analyzeTrend(dataPoints: GrowthDataPoint[]): GrowthChartResult['trend'] {
    if (dataPoints.length < 3) return 'FOLLOWING_CURVE';

    const recent = dataPoints.slice(-4);
    const percentileChanges: number[] = [];

    for (let i = 1; i < recent.length; i++) {
      percentileChanges.push(recent[i].percentile - recent[i - 1].percentile);
    }

    const avgChange = percentileChanges.reduce((a, b) => a + b, 0) / percentileChanges.length;

    if (avgChange < -15) return 'FALTERING';
    if (avgChange < -5) return 'CROSSING_DOWN';
    if (avgChange > 15) return 'ACCELERATING';
    if (avgChange > 5) return 'CROSSING_UP';
    return 'FOLLOWING_CURVE';
  }

  /**
   * Generate clinical alerts based on growth data
   */
  private generateAlerts(dataPoints: GrowthDataPoint[], metric: string): string[] {
    const alerts: string[] = [];
    if (dataPoints.length === 0) return alerts;

    const latest = dataPoints[dataPoints.length - 1];

    if (latest.percentile < 3) {
      alerts.push(`${metric} below 3rd percentile - evaluate for failure to thrive`);
    }
    if (latest.percentile > 97) {
      alerts.push(`${metric} above 97th percentile - evaluate for overgrowth/obesity`);
    }
    if (Math.abs(latest.zScore) > 3) {
      alerts.push(`${metric} z-score ${latest.zScore} exceeds ±3 SD - clinical review recommended`);
    }

    // Check for percentile crossing
    if (dataPoints.length >= 3) {
      const first = dataPoints[0].percentile;
      const last = latest.percentile;
      if (Math.abs(last - first) > 25) {
        alerts.push(`Significant percentile shift: ${first.toFixed(0)}th → ${last.toFixed(0)}th percentile`);
      }
    }

    return alerts;
  }

  private getLMSTable(metric: string, isMale: boolean): Record<number, { L: number; M: number; S: number }> | null {
    switch (metric) {
      case 'weight':
        return isMale ? GrowthChartService.WEIGHT_FOR_AGE_MALE : GrowthChartService.WEIGHT_FOR_AGE_FEMALE;
      case 'height':
        return isMale ? GrowthChartService.HEIGHT_FOR_AGE_MALE : GrowthChartService.HEIGHT_FOR_AGE_FEMALE;
      case 'bmi':
        return isMale ? GrowthChartService.WEIGHT_FOR_AGE_MALE : GrowthChartService.WEIGHT_FOR_AGE_FEMALE; // Simplified
      default:
        return null;
    }
  }

  private calculateAgeInMonths(dob: Date, date: Date): number {
    return (date.getFullYear() - dob.getFullYear()) * 12 + (date.getMonth() - dob.getMonth());
  }
}
