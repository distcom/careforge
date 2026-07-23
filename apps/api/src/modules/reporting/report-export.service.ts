import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';

export interface ReportExportOptions {
  format: 'PDF' | 'CSV' | 'JSON';
  dateFrom?: string;
  dateTo?: string;
  facilityId?: string;
  providerId?: string;
}

/**
 * Report Export Service
 * Generates PDF and CSV exports for clinical and financial reports
 */
@Injectable()
export class ReportExportService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate CSV content from tabular data
   */
  generateCSV(headers: string[], rows: any[][]): string {
    const escapeCSV = (val: any): string => {
      const str = String(val ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headerLine = headers.map(escapeCSV).join(',');
    const dataLines = rows.map((row) => row.map(escapeCSV).join(','));
    return [headerLine, ...dataLines].join('\n');
  }

  /**
   * Generate a simple PDF-like document (using basic PDF structure)
   * In production, integrate with puppeteer or pdfkit
   */
  generatePDF(title: string, sections: Array<{ heading: string; content: string[][] }>): Buffer {
    // Basic PDF generation using raw PDF syntax
    const lines: string[] = [];
    let yPos = 750;

    const addText = (text: string, size: number = 12, bold: boolean = false) => {
      const font = bold ? '/F2' : '/F1';
      lines.push(`BT ${font} ${size} Tf 50 ${yPos} Td (${this.escapePdfText(text)}) Tj ET`);
      yPos -= size + 6;
    };

    // Title
    addText(title, 18, true);
    yPos -= 10;
    addText(`Generated: ${new Date().toLocaleString()}`, 9);
    yPos -= 20;

    for (const section of sections) {
      if (yPos < 100) break; // Page boundary
      addText(section.heading, 14, true);
      yPos -= 5;

      for (const row of section.content) {
        if (yPos < 50) break;
        addText(row.join('  |  '), 10);
      }
      yPos -= 15;
    }

    const streamContent = lines.join('\n');
    const pdf = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >> endobj
4 0 obj << /Length ${streamContent.length} >> stream
${streamContent}
endstream endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
6 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> endobj
xref
0 7
trailer << /Size 7 /Root 1 0 R >>
startxref
0
%%EOF`;

    return Buffer.from(pdf, 'utf-8');
  }

  /**
   * Export patient roster report
   */
  async exportPatientRoster(options: ReportExportOptions): Promise<{ filename: string; content: string | Buffer; mimeType: string }> {
    const where: any = { deletedAt: null, status: 'ACTIVE' };

    const patients = await this.prisma.patient.findMany({
      where,
      select: {
        medicalRecordNumber: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        gender: true,
        phone: true,
        email: true,
        status: true,
        createdAt: true,
      },
      orderBy: { lastName: 'asc' },
    });

    const headers = ['MRN', 'Last Name', 'First Name', 'DOB', 'Gender', 'Phone', 'Email', 'Status', 'Registered'];
    const rows = patients.map((p) => [
      p.medicalRecordNumber || '',
      p.lastName,
      p.firstName,
      p.dateOfBirth,
      p.gender,
      p.phone || '',
      p.email || '',
      p.status,
      p.createdAt,
    ]);

    if (options.format === 'CSV') {
      return {
        filename: `patient-roster-${this.dateStamp()}.csv`,
        content: this.generateCSV(headers, rows),
        mimeType: 'text/csv',
      };
    }

    const sections = [{
      heading: `Patient Roster (${patients.length} patients)`,
      content: [headers, ...rows],
    }];

    return {
      filename: `patient-roster-${this.dateStamp()}.pdf`,
      content: this.generatePDF('Patient Roster Report', sections),
      mimeType: 'application/pdf',
    };
  }

  /**
   * Export financial summary report
   */
  async exportFinancialSummary(options: ReportExportOptions): Promise<{ filename: string; content: string | Buffer; mimeType: string }> {
    const dateFilter: any = {};
    if (options.dateFrom) dateFilter.gte = new Date(options.dateFrom);
    if (options.dateTo) dateFilter.lte = new Date(options.dateTo);

    const [charges, payments, claims] = await Promise.all([
      this.prisma.charge.aggregate({
        where: Object.keys(dateFilter).length ? { serviceDate: dateFilter } : {},
        _sum: { fee: true },
        _count: true,
      }),
      this.prisma.payment.aggregate({
        where: Object.keys(dateFilter).length ? { postedAt: dateFilter } : {},
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.claim.groupBy({
        by: ['status'],
        _count: true,
        _sum: { totalAmount: true },
      }),
    ]);

    const headers = ['Metric', 'Count', 'Amount'];
    const rows = [
      ['Total Charges', String(charges._count), `$${Number(charges._sum.fee || 0).toFixed(2)}`],
      ['Total Payments', String(payments._count), `$${Number(payments._sum.amount || 0).toFixed(2)}`],
      ['Outstanding', '', `$${(Number(charges._sum.fee || 0) - Number(payments._sum.amount || 0)).toFixed(2)}`],
      ...claims.map((c) => [`Claims (${c.status})`, String(c._count), `$${Number(c._sum.totalAmount || 0).toFixed(2)}`]),
    ];

    if (options.format === 'CSV') {
      return {
        filename: `financial-summary-${this.dateStamp()}.csv`,
        content: this.generateCSV(headers, rows),
        mimeType: 'text/csv',
      };
    }

    return {
      filename: `financial-summary-${this.dateStamp()}.pdf`,
      content: this.generatePDF('Financial Summary Report', [{ heading: 'Financial Overview', content: [headers, ...rows] }]),
      mimeType: 'application/pdf',
    };
  }

  /**
   * Export encounter/visit report
   */
  async exportEncounterReport(options: ReportExportOptions): Promise<{ filename: string; content: string | Buffer; mimeType: string }> {
    const where: any = { deletedAt: null };
    if (options.dateFrom || options.dateTo) {
      where.startedAt = {};
      if (options.dateFrom) where.startedAt.gte = new Date(options.dateFrom);
      if (options.dateTo) where.startedAt.lte = new Date(options.dateTo);
    }
    if (options.providerId) where.providerId = options.providerId;

    const encounters = await this.prisma.encounter.findMany({
      where,
      include: {
        patient: { select: { firstName: true, lastName: true, medicalRecordNumber: true } },
        provider: { select: { firstName: true, lastName: true } },
      },
      orderBy: { startTime: 'desc' },
      take: 500,
    });

    const headers = ['Date', 'MRN', 'Patient', 'Provider', 'Type', 'Reason', 'Status'];
    const rows = encounters.map((e) => [
      e.startTime || e.createdAt,
      e.patient?.medicalRecordNumber || '',
      `${e.patient?.lastName || ''}, ${e.patient?.firstName || ''}`,
      `${e.provider?.lastName || ''}, ${e.provider?.firstName || ''}`,
      e.type,
      e.chiefComplaint || '',
      e.status,
    ]);

    if (options.format === 'CSV') {
      return {
        filename: `encounters-${this.dateStamp()}.csv`,
        content: this.generateCSV(headers, rows),
        mimeType: 'text/csv',
      };
    }

    return {
      filename: `encounters-${this.dateStamp()}.pdf`,
      content: this.generatePDF('Encounter Report', [{ heading: `Encounters (${encounters.length})`, content: [headers, ...rows] }]),
      mimeType: 'application/pdf',
    };
  }

  /**
   * Export immunization registry report
   */
  async exportImmunizationReport(options: ReportExportOptions): Promise<{ filename: string; content: string | Buffer; mimeType: string }> {
    const where: any = {};
    if (options.dateFrom || options.dateTo) {
      where.administeredAt = {};
      if (options.dateFrom) where.administeredAt.gte = new Date(options.dateFrom);
      if (options.dateTo) where.administeredAt.lte = new Date(options.dateTo);
    }

    const immunizations = await this.prisma.immunization.findMany({
      where,
      include: { patient: { select: { firstName: true, lastName: true, dateOfBirth: true } } },
      orderBy: { administeredAt: 'desc' },
    });

    const headers = ['Patient', 'DOB', 'Vaccine', 'CVX', 'Date', 'Lot #', 'Site', 'Dose'];
    const rows = immunizations.map((i) => [
      `${i.patient?.lastName || ''}, ${i.patient?.firstName || ''}`,
      i.patient?.dateOfBirth || '',
      i.vaccineName,
      i.cvxCode || '',
      i.administeredAt || '',
      i.lotNumber || '',
      i.administrationSite || '',
      String(i.doseNumber || ''),
    ]);

    if (options.format === 'CSV') {
      return {
        filename: `immunizations-${this.dateStamp()}.csv`,
        content: this.generateCSV(headers, rows),
        mimeType: 'text/csv',
      };
    }

    return {
      filename: `immunizations-${this.dateStamp()}.pdf`,
      content: this.generatePDF('Immunization Registry Report', [{ heading: 'Immunizations', content: [headers, ...rows] }]),
      mimeType: 'application/pdf',
    };
  }

  /**
   * Export lab results report
   */
  async exportLabReport(patientId: string, options: ReportExportOptions): Promise<{ filename: string; content: string | Buffer; mimeType: string }> {
    const labOrders = await this.prisma.labOrder.findMany({
      where: { patientId, deletedAt: null },
      orderBy: { orderedAt: 'desc' },
    });

    const headers = ['Order Date', 'Test', 'Status', 'Result Date', 'Abnormal'];
    const rows = labOrders.map((l) => [
      l.orderedAt,
      l.testName,
      l.status,
      l.resultedAt || '',
      l.isAbnormal ? 'YES' : 'No',
    ]);

    if (options.format === 'CSV') {
      return {
        filename: `lab-results-${this.dateStamp()}.csv`,
        content: this.generateCSV(headers, rows),
        mimeType: 'text/csv',
      };
    }

    return {
      filename: `lab-results-${this.dateStamp()}.pdf`,
      content: this.generatePDF('Laboratory Results Report', [{ heading: 'Lab Orders', content: [headers, ...rows] }]),
      mimeType: 'application/pdf',
    };
  }

  private dateStamp(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private escapePdfText(text: string): string {
    return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  }
}
