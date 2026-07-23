import { Injectable } from '@nestjs/common';

export type Locale = 'en' | 'es' | 'fr' | 'de' | 'pt' | 'zh' | 'ar' | 'hi';

export interface TranslationSet {
  [key: string]: string | TranslationSet;
}

/**
 * Internationalization (i18n) Service
 * Provides multi-language support for the CareForge EHR platform
 * Supports: en, es, fr, de, pt, zh, ar, hi
 */
@Injectable()
export class I18nService {
  private translations: Map<string, TranslationSet> = new Map();
  private defaultLocale: Locale = 'en';
  private fallbackLocale: Locale = 'en';

  constructor() {
    this.initializeTranslations();
  }

  /**
   * Get translated string by key with interpolation
   */
  t(key: string, locale?: string, params?: Record<string, string | number>): string {
    const lang = (locale || this.defaultLocale) as string;
    const translation = this.getNestedValue(this.translations.get(lang) || {}, key);

    let text: string;
    if (typeof translation === 'string') {
      text = translation;
    } else {
      // Fallback to default locale
      const fallback = this.getNestedValue(this.translations.get(this.fallbackLocale) || {}, key);
      text = typeof fallback === 'string' ? fallback : key;
    }

    // Interpolate parameters
    if (params) {
      for (const [param, value] of Object.entries(params)) {
        text = text.replace(new RegExp(`\\{\\{${param}\\}\\}`, 'g'), String(value));
      }
    }

    return text;
  }

  /**
   * Get all translations for a locale
   */
  getTranslations(locale: string): TranslationSet {
    return this.translations.get(locale) || this.translations.get(this.fallbackLocale) || {};
  }

  /**
   * Get available locales
   */
  getAvailableLocales(): Array<{ code: string; name: string; nativeName: string }> {
    return [
      { code: 'en', name: 'English', nativeName: 'English' },
      { code: 'es', name: 'Spanish', nativeName: 'Español' },
      { code: 'fr', name: 'French', nativeName: 'Français' },
      { code: 'de', name: 'German', nativeName: 'Deutsch' },
      { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
      { code: 'zh', name: 'Chinese', nativeName: '中文' },
      { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
      { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
    ];
  }

  /**
   * Detect locale from Accept-Language header
   */
  detectLocale(acceptLanguage: string): Locale {
    if (!acceptLanguage) return this.defaultLocale;

    const preferred = acceptLanguage
      .split(',')
      .map((part) => {
        const [lang, q] = part.trim().split(';q=');
        return { lang: lang.split('-')[0].toLowerCase(), quality: q ? parseFloat(q) : 1 };
      })
      .sort((a, b) => b.quality - a.quality);

    const available = this.getAvailableLocales().map((l) => l.code);
    for (const { lang } of preferred) {
      if (available.includes(lang)) return lang as Locale;
    }

    return this.defaultLocale;
  }

  /**
   * Format date according to locale
   */
  formatDate(date: Date | string, locale: string, format: 'short' | 'long' | 'time' = 'short'): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const localeMap: Record<string, string> = {
      en: 'en-US', es: 'es-ES', fr: 'fr-FR', de: 'de-DE',
      pt: 'pt-BR', zh: 'zh-CN', ar: 'ar-SA', hi: 'hi-IN',
    };

    const intlLocale = localeMap[locale] || 'en-US';

    switch (format) {
      case 'long':
        return d.toLocaleDateString(intlLocale, { year: 'numeric', month: 'long', day: 'numeric' });
      case 'time':
        return d.toLocaleTimeString(intlLocale, { hour: '2-digit', minute: '2-digit' });
      default:
        return d.toLocaleDateString(intlLocale, { year: 'numeric', month: '2-digit', day: '2-digit' });
    }
  }

  /**
   * Format number according to locale
   */
  formatNumber(value: number, locale: string, options?: Intl.NumberFormatOptions): string {
    const localeMap: Record<string, string> = {
      en: 'en-US', es: 'es-ES', fr: 'fr-FR', de: 'de-DE',
      pt: 'pt-BR', zh: 'zh-CN', ar: 'ar-SA', hi: 'hi-IN',
    };
    return new Intl.NumberFormat(localeMap[locale] || 'en-US', options).format(value);
  }

  /**
   * Format currency according to locale
   */
  formatCurrency(amount: number, locale: string, currency: string = 'USD'): string {
    return this.formatNumber(amount, locale, { style: 'currency', currency });
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private initializeTranslations(): void {
    // English (default)
    this.translations.set('en', {
      common: {
        save: 'Save',
        cancel: 'Cancel',
        delete: 'Delete',
        edit: 'Edit',
        search: 'Search',
        loading: 'Loading...',
        error: 'An error occurred',
        success: 'Operation successful',
        confirm: 'Confirm',
        back: 'Back',
        next: 'Next',
        close: 'Close',
        yes: 'Yes',
        no: 'No',
      },
      navigation: {
        dashboard: 'Dashboard',
        patients: 'Patients',
        schedule: 'Schedule',
        encounters: 'Encounters',
        billing: 'Billing',
        messages: 'Messages',
        reports: 'Reports',
        admin: 'Administration',
        settings: 'Settings',
        telehealth: 'Telehealth',
      },
      patient: {
        newPatient: 'New Patient',
        demographics: 'Demographics',
        medicalHistory: 'Medical History',
        medications: 'Medications',
        allergies: 'Allergies',
        conditions: 'Conditions',
        immunizations: 'Immunizations',
        labResults: 'Lab Results',
        vitalSigns: 'Vital Signs',
        documents: 'Documents',
        insurance: 'Insurance',
        careTeam: 'Care Team',
        firstName: 'First Name',
        lastName: 'Last Name',
        dateOfBirth: 'Date of Birth',
        gender: 'Gender',
        phone: 'Phone',
        email: 'Email',
        address: 'Address',
        mrn: 'Medical Record Number',
      },
      encounter: {
        newEncounter: 'New Encounter',
        chiefComplaint: 'Chief Complaint',
        assessment: 'Assessment',
        plan: 'Plan',
        diagnosis: 'Diagnosis',
        procedures: 'Procedures',
        notes: 'Clinical Notes',
        sign: 'Sign & Complete',
      },
      billing: {
        charges: 'Charges',
        claims: 'Claims',
        payments: 'Payments',
        statements: 'Statements',
        submitClaim: 'Submit Claim',
        balance: 'Balance',
      },
      auth: {
        login: 'Sign In',
        logout: 'Sign Out',
        username: 'Username',
        password: 'Password',
        forgotPassword: 'Forgot Password?',
        resetPassword: 'Reset Password',
      },
    });

    // Spanish
    this.translations.set('es', {
      common: {
        save: 'Guardar',
        cancel: 'Cancelar',
        delete: 'Eliminar',
        edit: 'Editar',
        search: 'Buscar',
        loading: 'Cargando...',
        error: 'Ocurrió un error',
        success: 'Operación exitosa',
        confirm: 'Confirmar',
        back: 'Atrás',
        next: 'Siguiente',
        close: 'Cerrar',
        yes: 'Sí',
        no: 'No',
      },
      navigation: {
        dashboard: 'Panel',
        patients: 'Pacientes',
        schedule: 'Agenda',
        encounters: 'Consultas',
        billing: 'Facturación',
        messages: 'Mensajes',
        reports: 'Informes',
        admin: 'Administración',
        settings: 'Configuración',
        telehealth: 'Telesalud',
      },
      patient: {
        newPatient: 'Nuevo Paciente',
        demographics: 'Datos Demográficos',
        medicalHistory: 'Historial Médico',
        medications: 'Medicamentos',
        allergies: 'Alergias',
        conditions: 'Condiciones',
        immunizations: 'Inmunizaciones',
        labResults: 'Resultados de Laboratorio',
        vitalSigns: 'Signos Vitales',
        documents: 'Documentos',
        insurance: 'Seguro',
        careTeam: 'Equipo de Atención',
        firstName: 'Nombre',
        lastName: 'Apellido',
        dateOfBirth: 'Fecha de Nacimiento',
        gender: 'Género',
        phone: 'Teléfono',
        email: 'Correo Electrónico',
        address: 'Dirección',
        mrn: 'Número de Expediente',
      },
      encounter: {
        newEncounter: 'Nueva Consulta',
        chiefComplaint: 'Motivo de Consulta',
        assessment: 'Evaluación',
        plan: 'Plan',
        diagnosis: 'Diagnóstico',
        procedures: 'Procedimientos',
        notes: 'Notas Clínicas',
        sign: 'Firmar y Completar',
      },
      billing: {
        charges: 'Cargos',
        claims: 'Reclamaciones',
        payments: 'Pagos',
        statements: 'Estados de Cuenta',
        submitClaim: 'Enviar Reclamación',
        balance: 'Saldo',
      },
      auth: {
        login: 'Iniciar Sesión',
        logout: 'Cerrar Sesión',
        username: 'Usuario',
        password: 'Contraseña',
        forgotPassword: '¿Olvidó su contraseña?',
        resetPassword: 'Restablecer Contraseña',
      },
    });

    // French
    this.translations.set('fr', {
      common: {
        save: 'Enregistrer',
        cancel: 'Annuler',
        delete: 'Supprimer',
        edit: 'Modifier',
        search: 'Rechercher',
        loading: 'Chargement...',
        error: 'Une erreur est survenue',
        success: 'Opération réussie',
        confirm: 'Confirmer',
        back: 'Retour',
        next: 'Suivant',
        close: 'Fermer',
        yes: 'Oui',
        no: 'Non',
      },
      navigation: {
        dashboard: 'Tableau de bord',
        patients: 'Patients',
        schedule: 'Planning',
        encounters: 'Consultations',
        billing: 'Facturation',
        messages: 'Messages',
        reports: 'Rapports',
        admin: 'Administration',
        settings: 'Paramètres',
        telehealth: 'Télésanté',
      },
      patient: {
        newPatient: 'Nouveau Patient',
        demographics: 'Démographie',
        medicalHistory: 'Antécédents Médicaux',
        medications: 'Médicaments',
        allergies: 'Allergies',
        conditions: 'Pathologies',
        immunizations: 'Vaccinations',
        labResults: 'Résultats de Laboratoire',
        vitalSigns: 'Signes Vitaux',
        documents: 'Documents',
        insurance: 'Assurance',
        careTeam: 'Équipe de Soins',
        firstName: 'Prénom',
        lastName: 'Nom',
        dateOfBirth: 'Date de Naissance',
        gender: 'Sexe',
        phone: 'Téléphone',
        email: 'Email',
        address: 'Adresse',
        mrn: 'Numéro de Dossier',
      },
      auth: {
        login: 'Connexion',
        logout: 'Déconnexion',
        username: "Nom d'utilisateur",
        password: 'Mot de passe',
        forgotPassword: 'Mot de passe oublié ?',
        resetPassword: 'Réinitialiser le mot de passe',
      },
    });

    // German
    this.translations.set('de', {
      common: {
        save: 'Speichern',
        cancel: 'Abbrechen',
        delete: 'Löschen',
        edit: 'Bearbeiten',
        search: 'Suchen',
        loading: 'Wird geladen...',
        error: 'Ein Fehler ist aufgetreten',
        success: 'Vorgang erfolgreich',
        confirm: 'Bestätigen',
        back: 'Zurück',
        next: 'Weiter',
        close: 'Schließen',
        yes: 'Ja',
        no: 'Nein',
      },
      navigation: {
        dashboard: 'Übersicht',
        patients: 'Patienten',
        schedule: 'Termine',
        encounters: 'Behandlungen',
        billing: 'Abrechnung',
        messages: 'Nachrichten',
        reports: 'Berichte',
        admin: 'Verwaltung',
        settings: 'Einstellungen',
        telehealth: 'Telemedizin',
      },
      auth: {
        login: 'Anmelden',
        logout: 'Abmelden',
        username: 'Benutzername',
        password: 'Passwort',
        forgotPassword: 'Passwort vergessen?',
        resetPassword: 'Passwort zurücksetzen',
      },
    });

    // Portuguese
    this.translations.set('pt', {
      common: {
        save: 'Salvar',
        cancel: 'Cancelar',
        delete: 'Excluir',
        edit: 'Editar',
        search: 'Pesquisar',
        loading: 'Carregando...',
        error: 'Ocorreu um erro',
        success: 'Operação bem-sucedida',
        confirm: 'Confirmar',
        back: 'Voltar',
        next: 'Próximo',
        close: 'Fechar',
        yes: 'Sim',
        no: 'Não',
      },
      navigation: {
        dashboard: 'Painel',
        patients: 'Pacientes',
        schedule: 'Agenda',
        encounters: 'Consultas',
        billing: 'Faturamento',
        messages: 'Mensagens',
        reports: 'Relatórios',
        admin: 'Administração',
        settings: 'Configurações',
        telehealth: 'Telessaúde',
      },
      auth: {
        login: 'Entrar',
        logout: 'Sair',
        username: 'Usuário',
        password: 'Senha',
        forgotPassword: 'Esqueceu a senha?',
        resetPassword: 'Redefinir Senha',
      },
    });

    // Chinese
    this.translations.set('zh', {
      common: {
        save: '保存',
        cancel: '取消',
        delete: '删除',
        edit: '编辑',
        search: '搜索',
        loading: '加载中...',
        error: '发生错误',
        success: '操作成功',
        confirm: '确认',
        back: '返回',
        next: '下一步',
        close: '关闭',
        yes: '是',
        no: '否',
      },
      navigation: {
        dashboard: '仪表板',
        patients: '患者',
        schedule: '日程',
        encounters: '就诊',
        billing: '账单',
        messages: '消息',
        reports: '报告',
        admin: '管理',
        settings: '设置',
        telehealth: '远程医疗',
      },
      auth: {
        login: '登录',
        logout: '退出',
        username: '用户名',
        password: '密码',
        forgotPassword: '忘记密码？',
        resetPassword: '重置密码',
      },
    });

    // Arabic
    this.translations.set('ar', {
      common: {
        save: 'حفظ',
        cancel: 'إلغاء',
        delete: 'حذف',
        edit: 'تعديل',
        search: 'بحث',
        loading: 'جاري التحميل...',
        error: 'حدث خطأ',
        success: 'تمت العملية بنجاح',
        confirm: 'تأكيد',
        back: 'رجوع',
        next: 'التالي',
        close: 'إغلاق',
        yes: 'نعم',
        no: 'لا',
      },
      navigation: {
        dashboard: 'لوحة التحكم',
        patients: 'المرضى',
        schedule: 'المواعيد',
        encounters: 'الزيارات',
        billing: 'الفواتير',
        messages: 'الرسائل',
        reports: 'التقارير',
        admin: 'الإدارة',
        settings: 'الإعدادات',
        telehealth: 'الرعاية عن بعد',
      },
      auth: {
        login: 'تسجيل الدخول',
        logout: 'تسجيل الخروج',
        username: 'اسم المستخدم',
        password: 'كلمة المرور',
        forgotPassword: 'نسيت كلمة المرور؟',
        resetPassword: 'إعادة تعيين كلمة المرور',
      },
    });

    // Hindi
    this.translations.set('hi', {
      common: {
        save: 'सहेजें',
        cancel: 'रद्द करें',
        delete: 'हटाएं',
        edit: 'संपादित करें',
        search: 'खोजें',
        loading: 'लोड हो रहा है...',
        error: 'एक त्रुटि हुई',
        success: 'ऑपरेशन सफल',
        confirm: 'पुष्टि करें',
        back: 'वापस',
        next: 'अगला',
        close: 'बंद करें',
        yes: 'हाँ',
        no: 'नहीं',
      },
      navigation: {
        dashboard: 'डैशबोर्ड',
        patients: 'रोगी',
        schedule: 'शेड्यूल',
        encounters: 'मुलाकातें',
        billing: 'बिलिंग',
        messages: 'संदेश',
        reports: 'रिपोर्ट',
        admin: 'प्रशासन',
        settings: 'सेटिंग्स',
        telehealth: 'टेलीहेल्थ',
      },
      auth: {
        login: 'साइन इन',
        logout: 'साइन आउट',
        username: 'उपयोगकर्ता नाम',
        password: 'पासवर्ड',
        forgotPassword: 'पासवर्ड भूल गए?',
        resetPassword: 'पासवर्ड रीसेट करें',
      },
    });
  }
}
