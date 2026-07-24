import { Injectable, NotFoundException } from '@nestjs/common';

export interface TranslationSet {
  [key: string]: string | TranslationSet;
}

export interface Locale {
  code: string;
  name: string;
  nativeName: string;
  rtl: boolean;
  dateFormat: string;
  timeFormat: string;
  numberFormat: string;
  currency: string;
}

@Injectable()
export class I18nService {
  private readonly defaultLocale = 'en-US';
  private readonly supportedLocales: Locale[] = [
    { code: 'en-US', name: 'English (US)', nativeName: 'English', rtl: false, dateFormat: 'MM/DD/YYYY', timeFormat: 'h:mm A', numberFormat: '#,##0.00', currency: 'USD' },
    { code: 'es-US', name: 'Spanish (US)', nativeName: 'Español', rtl: false, dateFormat: 'DD/MM/YYYY', timeFormat: 'HH:mm', numberFormat: '#,##0.00', currency: 'USD' },
    { code: 'es-MX', name: 'Spanish (Mexico)', nativeName: 'Español (México)', rtl: false, dateFormat: 'DD/MM/YYYY', timeFormat: 'HH:mm', numberFormat: '#,##0.00', currency: 'MXN' },
    { code: 'fr-CA', name: 'French (Canada)', nativeName: 'Français (Canada)', rtl: false, dateFormat: 'YYYY-MM-DD', timeFormat: 'HH:mm', numberFormat: '#,##0.00', currency: 'CAD' },
    { code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '简体中文', rtl: false, dateFormat: 'YYYY/MM/DD', timeFormat: 'HH:mm', numberFormat: '#,##0.00', currency: 'CNY' },
    { code: 'vi-VN', name: 'Vietnamese', nativeName: 'Tiếng Việt', rtl: false, dateFormat: 'DD/MM/YYYY', timeFormat: 'HH:mm', numberFormat: '#,##0.00', currency: 'VND' },
    { code: 'ar-SA', name: 'Arabic', nativeName: 'العربية', rtl: true, dateFormat: 'DD/MM/YYYY', timeFormat: 'h:mm A', numberFormat: '#,##0.00', currency: 'SAR' },
    { code: 'ko-KR', name: 'Korean', nativeName: '한국어', rtl: false, dateFormat: 'YYYY.MM.DD', timeFormat: 'a h:mm', numberFormat: '#,##0', currency: 'KRW' },
    { code: 'tl-PH', name: 'Tagalog', nativeName: 'Tagalog', rtl: false, dateFormat: 'MM/DD/YYYY', timeFormat: 'h:mm A', numberFormat: '#,##0.00', currency: 'PHP' },
    { code: 'pt-BR', name: 'Portuguese (Brazil)', nativeName: 'Português (Brasil)', rtl: false, dateFormat: 'DD/MM/YYYY', timeFormat: 'HH:mm', numberFormat: '#,##0.00', currency: 'BRL' },
  ];

  private translations: Map<string, TranslationSet> = new Map();

  constructor() {
    this.initializeTranslations();
  }

  private initializeTranslations(): void {
    // English (default)
    this.translations.set('en-US', {
      common: {
        save: 'Save',
        cancel: 'Cancel',
        delete: 'Delete',
        edit: 'Edit',
        create: 'Create',
        search: 'Search',
        loading: 'Loading...',
        error: 'Error',
        success: 'Success',
        confirm: 'Confirm',
        back: 'Back',
        next: 'Next',
        previous: 'Previous',
        close: 'Close',
        submit: 'Submit',
        reset: 'Reset',
        yes: 'Yes',
        no: 'No',
        ok: 'OK',
        actions: 'Actions',
        status: 'Status',
        date: 'Date',
        time: 'Time',
        name: 'Name',
        description: 'Description',
        notes: 'Notes',
        required: 'Required',
        optional: 'Optional',
      },
      patient: {
        title: 'Patient',
        patients: 'Patients',
        firstName: 'First Name',
        lastName: 'Last Name',
        middleName: 'Middle Name',
        dateOfBirth: 'Date of Birth',
        gender: 'Gender',
        male: 'Male',
        female: 'Female',
        other: 'Other',
        unknown: 'Unknown',
        address: 'Address',
        city: 'City',
        state: 'State',
        zipCode: 'ZIP Code',
        phone: 'Phone',
        email: 'Email',
        ssn: 'SSN',
        mrn: 'Medical Record Number',
        insurance: 'Insurance',
        emergencyContact: 'Emergency Contact',
        primaryCareProvider: 'Primary Care Provider',
        allergies: 'Allergies',
        medications: 'Medications',
        conditions: 'Conditions',
        encounters: 'Encounters',
        vitals: 'Vital Signs',
        labResults: 'Lab Results',
        immunizations: 'Immunizations',
        documents: 'Documents',
        carePlans: 'Care Plans',
        referrals: 'Referrals',
        billing: 'Billing',
        messages: 'Messages',
        appointments: 'Appointments',
      },
      clinical: {
        encounter: 'Encounter',
        encounters: 'Encounters',
        chiefComplaint: 'Chief Complaint',
        historyOfPresentIllness: 'History of Present Illness',
        reviewOfSystems: 'Review of Systems',
        physicalExam: 'Physical Examination',
        assessment: 'Assessment',
        plan: 'Plan',
        diagnosis: 'Diagnosis',
        diagnoses: 'Diagnoses',
        procedure: 'Procedure',
        procedures: 'Procedures',
        prescription: 'Prescription',
        prescriptions: 'Prescriptions',
        medication: 'Medication',
        dosage: 'Dosage',
        frequency: 'Frequency',
        route: 'Route',
        quantity: 'Quantity',
        refills: 'Refills',
        labOrder: 'Lab Order',
        labOrders: 'Lab Orders',
        result: 'Result',
        results: 'Results',
        vitalSigns: 'Vital Signs',
        bloodPressure: 'Blood Pressure',
        heartRate: 'Heart Rate',
        temperature: 'Temperature',
        respiratoryRate: 'Respiratory Rate',
        oxygenSaturation: 'Oxygen Saturation',
        height: 'Height',
        weight: 'Weight',
        bmi: 'BMI',
        pain: 'Pain',
      },
      scheduling: {
        appointment: 'Appointment',
        appointments: 'Appointments',
        schedule: 'Schedule',
        calendar: 'Calendar',
        date: 'Date',
        time: 'Time',
        duration: 'Duration',
        provider: 'Provider',
        location: 'Location',
        reason: 'Reason',
        status: 'Status',
        scheduled: 'Scheduled',
        confirmed: 'Confirmed',
        checkedIn: 'Checked In',
        inProgress: 'In Progress',
        completed: 'Completed',
        cancelled: 'Cancelled',
        noShow: 'No Show',
        reschedule: 'Reschedule',
        cancelAppointment: 'Cancel Appointment',
        checkIn: 'Check In',
        checkOut: 'Check Out',
      },
      billing: {
        charge: 'Charge',
        charges: 'Charges',
        claim: 'Claim',
        claims: 'Claims',
        payment: 'Payment',
        payments: 'Payments',
        invoice: 'Invoice',
        invoices: 'Invoices',
        statement: 'Statement',
        statements: 'Statements',
        amount: 'Amount',
        balance: 'Balance',
        paid: 'Paid',
        unpaid: 'Unpaid',
        pending: 'Pending',
        denied: 'Denied',
        appeal: 'Appeal',
        cptCode: 'CPT Code',
        icd10Code: 'ICD-10 Code',
        modifier: 'Modifier',
        units: 'Units',
        fee: 'Fee',
        allowed: 'Allowed',
        adjustment: 'Adjustment',
      },
      auth: {
        login: 'Login',
        logout: 'Logout',
        username: 'Username',
        password: 'Password',
        email: 'Email',
        forgotPassword: 'Forgot Password?',
        resetPassword: 'Reset Password',
        changePassword: 'Change Password',
        currentPassword: 'Current Password',
        newPassword: 'New Password',
        confirmPassword: 'Confirm Password',
        rememberMe: 'Remember Me',
        signIn: 'Sign In',
        signOut: 'Sign Out',
        register: 'Register',
        profile: 'Profile',
        settings: 'Settings',
        preferences: 'Preferences',
        language: 'Language',
        timezone: 'Timezone',
        notifications: 'Notifications',
      },
      errors: {
        notFound: 'Not Found',
        unauthorized: 'Unauthorized',
        forbidden: 'Forbidden',
        badRequest: 'Bad Request',
        serverError: 'Server Error',
        validationError: 'Validation Error',
        networkError: 'Network Error',
        timeout: 'Request Timeout',
        conflict: 'Conflict',
        required: 'This field is required',
        invalid: 'Invalid value',
        tooShort: 'Too short',
        tooLong: 'Too long',
        invalidEmail: 'Invalid email address',
        invalidPhone: 'Invalid phone number',
        invalidDate: 'Invalid date',
      },
    });

    // Spanish
    this.translations.set('es-US', {
      common: {
        save: 'Guardar',
        cancel: 'Cancelar',
        delete: 'Eliminar',
        edit: 'Editar',
        create: 'Crear',
        search: 'Buscar',
        loading: 'Cargando...',
        error: 'Error',
        success: 'Éxito',
        confirm: 'Confirmar',
        back: 'Atrás',
        next: 'Siguiente',
        previous: 'Anterior',
        close: 'Cerrar',
        submit: 'Enviar',
        reset: 'Restablecer',
        yes: 'Sí',
        no: 'No',
        ok: 'OK',
        actions: 'Acciones',
        status: 'Estado',
        date: 'Fecha',
        time: 'Hora',
        name: 'Nombre',
        description: 'Descripción',
        notes: 'Notas',
        required: 'Obligatorio',
        optional: 'Opcional',
      },
      patient: {
        title: 'Paciente',
        patients: 'Pacientes',
        firstName: 'Nombre',
        lastName: 'Apellido',
        middleName: 'Segundo Nombre',
        dateOfBirth: 'Fecha de Nacimiento',
        gender: 'Género',
        male: 'Masculino',
        female: 'Femenino',
        other: 'Otro',
        unknown: 'Desconocido',
        address: 'Dirección',
        city: 'Ciudad',
        state: 'Estado',
        zipCode: 'Código Postal',
        phone: 'Teléfono',
        email: 'Correo Electrónico',
        ssn: 'Número de Seguro Social',
        mrn: 'Número de Expediente Médico',
        insurance: 'Seguro',
        emergencyContact: 'Contacto de Emergencia',
        primaryCareProvider: 'Proveedor de Atención Primaria',
        allergies: 'Alergias',
        medications: 'Medicamentos',
        conditions: 'Condiciones',
        encounters: 'Consultas',
        vitals: 'Signos Vitales',
        labResults: 'Resultados de Laboratorio',
        immunizations: 'Inmunizaciones',
        documents: 'Documentos',
        carePlans: 'Planes de Cuidado',
        referrals: 'Referencias',
        billing: 'Facturación',
        messages: 'Mensajes',
        appointments: 'Citas',
      },
      clinical: {
        encounter: 'Consulta',
        encounters: 'Consultas',
        chiefComplaint: 'Motivo de Consulta',
        historyOfPresentIllness: 'Historial de la Enfermedad Actual',
        reviewOfSystems: 'Revisión de Sistemas',
        physicalExam: 'Examen Físico',
        assessment: 'Evaluación',
        plan: 'Plan',
        diagnosis: 'Diagnóstico',
        diagnoses: 'Diagnósticos',
        procedure: 'Procedimiento',
        procedures: 'Procedimientos',
        prescription: 'Receta',
        prescriptions: 'Recetas',
        medication: 'Medicamento',
        dosage: 'Dosis',
        frequency: 'Frecuencia',
        route: 'Vía',
        quantity: 'Cantidad',
        refills: 'Resurtidos',
        labOrder: 'Orden de Laboratorio',
        labOrders: 'Órdenes de Laboratorio',
        result: 'Resultado',
        results: 'Resultados',
        vitalSigns: 'Signos Vitales',
        bloodPressure: 'Presión Arterial',
        heartRate: 'Frecuencia Cardíaca',
        temperature: 'Temperatura',
        respiratoryRate: 'Frecuencia Respiratoria',
        oxygenSaturation: 'Saturación de Oxígeno',
        height: 'Estatura',
        weight: 'Peso',
        bmi: 'IMC',
        pain: 'Dolor',
      },
      scheduling: {
        appointment: 'Cita',
        appointments: 'Citas',
        schedule: 'Horario',
        calendar: 'Calendario',
        date: 'Fecha',
        time: 'Hora',
        duration: 'Duración',
        provider: 'Proveedor',
        location: 'Ubicación',
        reason: 'Motivo',
        status: 'Estado',
        scheduled: 'Programada',
        confirmed: 'Confirmada',
        checkedIn: 'Registrado',
        inProgress: 'En Progreso',
        completed: 'Completada',
        cancelled: 'Cancelada',
        noShow: 'No Asistió',
        reschedule: 'Reprogramar',
        cancelAppointment: 'Cancelar Cita',
        checkIn: 'Registrar Entrada',
        checkOut: 'Registrar Salida',
      },
      billing: {
        charge: 'Cargo',
        charges: 'Cargos',
        claim: 'Reclamación',
        claims: 'Reclamaciones',
        payment: 'Pago',
        payments: 'Pagos',
        invoice: 'Factura',
        invoices: 'Facturas',
        statement: 'Estado de Cuenta',
        statements: 'Estados de Cuenta',
        amount: 'Monto',
        balance: 'Saldo',
        paid: 'Pagado',
        unpaid: 'No Pagado',
        pending: 'Pendiente',
        denied: 'Denegado',
        appeal: 'Apelación',
        cptCode: 'Código CPT',
        icd10Code: 'Código ICD-10',
        modifier: 'Modificador',
        units: 'Unidades',
        fee: 'Tarifa',
        allowed: 'Permitido',
        adjustment: 'Ajuste',
      },
      auth: {
        login: 'Iniciar Sesión',
        logout: 'Cerrar Sesión',
        username: 'Nombre de Usuario',
        password: 'Contraseña',
        email: 'Correo Electrónico',
        forgotPassword: '¿Olvidó su Contraseña?',
        resetPassword: 'Restablecer Contraseña',
        changePassword: 'Cambiar Contraseña',
        currentPassword: 'Contraseña Actual',
        newPassword: 'Nueva Contraseña',
        confirmPassword: 'Confirmar Contraseña',
        rememberMe: 'Recordarme',
        signIn: 'Iniciar Sesión',
        signOut: 'Cerrar Sesión',
        register: 'Registrarse',
        profile: 'Perfil',
        settings: 'Configuración',
        preferences: 'Preferencias',
        language: 'Idioma',
        timezone: 'Zona Horaria',
        notifications: 'Notificaciones',
      },
      errors: {
        notFound: 'No Encontrado',
        unauthorized: 'No Autorizado',
        forbidden: 'Prohibido',
        badRequest: 'Solicitud Incorrecta',
        serverError: 'Error del Servidor',
        validationError: 'Error de Validación',
        networkError: 'Error de Red',
        timeout: 'Tiempo de Espera Agotado',
        conflict: 'Conflicto',
        required: 'Este campo es obligatorio',
        invalid: 'Valor inválido',
        tooShort: 'Demasiado corto',
        tooLong: 'Demasiado largo',
        invalidEmail: 'Correo electrónico inválido',
        invalidPhone: 'Número de teléfono inválido',
        invalidDate: 'Fecha inválida',
      },
    });
  }

  getSupportedLocales(): Locale[] {
    return this.supportedLocales;
  }

  getLocale(code: string): Locale | undefined {
    return this.supportedLocales.find((l) => l.code === code);
  }

  translate(key: string, locale: string = this.defaultLocale, params?: Record<string, string>): string {
    const translations = this.translations.get(locale) || this.translations.get(this.defaultLocale);
    if (!translations) return key;

    const keys = key.split('.');
    let value: string | TranslationSet | undefined = translations;

    for (const k of keys) {
      if (typeof value === 'object' && value !== null) {
        value = value[k];
      } else {
        return key;
      }
    }

    if (typeof value !== 'string') return key;

    // Replace parameters
    if (params) {
      for (const [paramKey, paramValue] of Object.entries(params)) {
        value = value.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), paramValue);
      }
    }

    return value;
  }

  translateMany(keys: string[], locale: string = this.defaultLocale): Record<string, string> {
    const result: Record<string, string> = {};
    for (const key of keys) {
      result[key] = this.translate(key, locale);
    }
    return result;
  }

  getTranslations(locale: string = this.defaultLocale): TranslationSet {
    return this.translations.get(locale) || this.translations.get(this.defaultLocale) || {};
  }

  addTranslations(locale: string, translations: TranslationSet): void {
    const existing = this.translations.get(locale) || {};
    this.translations.set(locale, this.deepMerge(existing, translations));
  }

  formatDate(date: Date | string, locale: string = this.defaultLocale): string {
    const localeInfo = this.getLocale(locale);
    const d = typeof date === 'string' ? new Date(date) : date;

    try {
      return new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(d);
    } catch {
      return d.toLocaleDateString();
    }
  }

  formatTime(date: Date | string, locale: string = this.defaultLocale): string {
    const d = typeof date === 'string' ? new Date(date) : date;

    try {
      return new Intl.DateTimeFormat(locale, {
        hour: '2-digit',
        minute: '2-digit',
      }).format(d);
    } catch {
      return d.toLocaleTimeString();
    }
  }

  formatDateTime(date: Date | string, locale: string = this.defaultLocale): string {
    const d = typeof date === 'string' ? new Date(date) : date;

    try {
      return new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).format(d);
    } catch {
      return d.toLocaleString();
    }
  }

  formatNumber(value: number, locale: string = this.defaultLocale): string {
    try {
      return new Intl.NumberFormat(locale).format(value);
    } catch {
      return value.toLocaleString();
    }
  }

  formatCurrency(value: number, locale: string = this.defaultLocale, currency?: string): string {
    const localeInfo = this.getLocale(locale);
    const curr = currency || localeInfo?.currency || 'USD';

    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: curr,
      }).format(value);
    } catch {
      return `$${value.toFixed(2)}`;
    }
  }

  private deepMerge(target: TranslationSet, source: TranslationSet): TranslationSet {
    const result: TranslationSet = { ...target };

    for (const key of Object.keys(source)) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(
          (target[key] as TranslationSet) || {},
          source[key] as TranslationSet,
        );
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }
}
