// ============================================
// EF1 CRM Types
// ============================================

export interface Client {
  id: string;
  name: string;
  client_type: string | null;
  employee_count: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientWithStats extends Client {
  contact_count: number;
  deal_count: number;
  hr_contact_count: number;
}

export interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  salutation: string | null;
  primary_email: string | null;
  secondary_email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  client_id: string | null;
  company_name: string | null;
  position: string | null;
  departments: string[];
  email_status: string | null;
  programs: string[];
  is_verified: boolean;
  cannot_verify_work_email: boolean;
  cannot_verify_personal_email: boolean;
  note: string | null;
  next_followup_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContactWithClient extends Contact {
  client_name: string | null;
  full_name: string;
  contact_id_display: string;
}

export interface Deal {
  id: string;
  name: string;
  client_id: string | null;
  contact_id: string | null;
  inquiry_type: string | null;
  assigned_to: string[];
  status: string;
  note: string | null;
  end_client_id: string | null;
  is_updated: boolean;
  value: number | null;
  event_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface DealWithRelations extends Deal {
  client_name: string | null;
  contact_name: string | null;
  contact_email: string | null;
  end_client_name: string | null;
}

// ============================================
// Constants
// ============================================

export const DEPARTMENTS = ['HR', 'C-level Manager', 'Owner', 'IT'] as const;

export const EMAIL_STATUSES = [
  'Aktivní',
  'Chybí - kontaktovat přes Li',
  'Bounce',
  'Neověřen',
] as const;

export const CLIENT_TYPES = [
  'Korporát',
  'SMB',
  'Startup',
  'Agentura',
  'Státní správa',
  'Neziskovka',
  'Vzdělávací instituce',
] as const;

export const EMPLOYEE_COUNTS = [
  '1-50',
  '51-200',
  '201-500',
  '501-1000',
  '1000+',
] as const;

export const INQUIRY_TYPES = [
  'Přednáška / keynote',
  'Školení',
  'Workshop',
  'Program',
  'Jiné (interní program apod.)',
] as const;

// Active pipeline stages (shown as main Kanban columns)
export const DEAL_PIPELINE_STATUSES = [
  'Nový',
  'Jednáme',
  'Nabídka odeslaná',
  'Realizace',
  'Deal',
] as const;

// Closed/archived statuses (shown in collapsed archive section)
export const DEAL_CLOSED_STATUSES = [
  'Archiv',
  'Nevyšlo',
  'Malý budget',
  'Odmítnuto',
  'Odmítnuto klientem',
  'Bez reakce',
  'Filip nedostupný',
  'Předáno dál',
  'Nedohodli se',
  'V řešení',
  'Jiné',
] as const;

// All statuses combined
export const DEAL_STATUSES = [
  ...DEAL_PIPELINE_STATUSES,
  ...DEAL_CLOSED_STATUSES,
] as const;

export const DEAL_STATUS_COLORS: Record<string, string> = {
  'Nový': 'bg-blue-100 text-blue-800',
  'Jednáme': 'bg-yellow-100 text-yellow-800',
  'Nabídka odeslaná': 'bg-purple-100 text-purple-800',
  'Realizace': 'bg-cyan-100 text-cyan-800',
  'Deal': 'bg-green-100 text-green-800',
  'Archiv': 'bg-slate-100 text-slate-600',
  'V řešení': 'bg-yellow-100 text-yellow-800',
  'Nevyšlo': 'bg-red-100 text-red-800',
  'Malý budget': 'bg-orange-100 text-orange-800',
  'Odmítnuto': 'bg-red-100 text-red-800',
  'Odmítnuto klientem': 'bg-red-100 text-red-800',
  'Bez reakce': 'bg-gray-100 text-gray-800',
  'Filip nedostupný': 'bg-gray-100 text-gray-800',
  'Předáno dál': 'bg-indigo-100 text-indigo-800',
  'Nedohodli se': 'bg-red-100 text-red-800',
  'Jiné': 'bg-gray-100 text-gray-800',
};

export const ASSIGNED_PEOPLE = [
  'Filip',
  'Honza Hubka',
  'Kuba Heikenwälder',
] as const;

export const PROGRAMS = [
  'FAIL - archiv',
  'FAIL - podzim 2025',
  'FAIL - jaro 2026',
  'FAIL - podzim 2026',
] as const;
