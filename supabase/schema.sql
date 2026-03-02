-- ============================================
-- EF1 CRM Database Schema
-- ============================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. KLIENTI (Companies)
-- ============================================
CREATE TABLE clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  client_type TEXT, -- e.g. 'Agentura', 'Korporát', 'SMB', 'Startup'
  employee_count TEXT, -- e.g. '1-50', '51-200', '201-500', '500+'
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ============================================
-- 2. KONTAKTY (People)
-- ============================================
CREATE TABLE contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  salutation TEXT, -- oslovení (Honzo, Petře, ...)
  primary_email TEXT,
  secondary_email TEXT,
  phone TEXT,
  linkedin_url TEXT,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  company_name TEXT, -- textový název firmy
  position TEXT, -- pracovní pozice
  departments TEXT[] DEFAULT '{}', -- HR, C-level Manager, Owner, IT
  email_status TEXT DEFAULT 'Aktivní', -- Aktivní, Chybí - kontaktovat přes Li, Bounce
  programs TEXT[] DEFAULT '{}', -- FAIL - archiv, FAIL - jaro 2026, ...
  is_verified BOOLEAN DEFAULT false,
  cannot_verify_work_email BOOLEAN DEFAULT false,
  cannot_verify_personal_email BOOLEAN DEFAULT false,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ============================================
-- 3. DEALS (Opportunities)
-- ============================================
CREATE TABLE deals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL, -- e.g. "ČSOB | Školení"
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  inquiry_type TEXT, -- Školení, Přednáška / keynote, Workshop, Program, Jiné
  assigned_to TEXT[] DEFAULT '{}', -- Filip, Honza Hubka, Kuba Heikenwälder, ...
  status TEXT DEFAULT 'Nový', -- Kanban column
  note TEXT,
  end_client_id UUID REFERENCES clients(id) ON DELETE SET NULL, -- koncový klient (přes agenturu)
  is_updated BOOLEAN DEFAULT false,
  value NUMERIC, -- hodnota dealu v Kč (optional)
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_contacts_client_id ON contacts(client_id);
CREATE INDEX idx_contacts_primary_email ON contacts(primary_email);
CREATE INDEX idx_contacts_last_name ON contacts(last_name);
CREATE INDEX idx_deals_client_id ON deals(client_id);
CREATE INDEX idx_deals_contact_id ON deals(contact_id);
CREATE INDEX idx_deals_status ON deals(status);
CREATE INDEX idx_clients_name ON clients(name);

-- Full-text search indexes
CREATE INDEX idx_contacts_search ON contacts
  USING gin(to_tsvector('simple', coalesce(first_name, '') || ' ' || coalesce(last_name, '') || ' ' || coalesce(primary_email, '') || ' ' || coalesce(company_name, '')));

CREATE INDEX idx_clients_search ON clients
  USING gin(to_tsvector('simple', coalesce(name, '')));

-- ============================================
-- TRIGGERS for updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER deals_updated_at
  BEFORE UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access
CREATE POLICY "Authenticated users can read clients"
  ON clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert clients"
  ON clients FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update clients"
  ON clients FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete clients"
  ON clients FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read contacts"
  ON contacts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert contacts"
  ON contacts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update contacts"
  ON contacts FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete contacts"
  ON contacts FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read deals"
  ON deals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert deals"
  ON deals FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update deals"
  ON deals FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete deals"
  ON deals FOR DELETE TO authenticated USING (true);

-- ============================================
-- VIEWS
-- ============================================

-- Kontakt s názvem firmy (pro rychlý přehled)
CREATE OR REPLACE VIEW contacts_with_client AS
SELECT
  c.*,
  cl.name AS client_name,
  c.first_name || ' ' || c.last_name AS full_name,
  c.first_name || ' ' || c.last_name || ' - ' || coalesce(cl.name, c.company_name, '') AS contact_id_display
FROM contacts c
LEFT JOIN clients cl ON c.client_id = cl.id;

-- Deal s propojením
CREATE OR REPLACE VIEW deals_with_relations AS
SELECT
  d.*,
  cl.name AS client_name,
  co.first_name || ' ' || co.last_name AS contact_name,
  co.primary_email AS contact_email,
  ecl.name AS end_client_name
FROM deals d
LEFT JOIN clients cl ON d.client_id = cl.id
LEFT JOIN contacts co ON d.contact_id = co.id
LEFT JOIN clients ecl ON d.end_client_id = ecl.id;

-- Klient se statistikami
CREATE OR REPLACE VIEW clients_with_stats AS
SELECT
  cl.*,
  count(DISTINCT co.id) AS contact_count,
  count(DISTINCT d.id) AS deal_count,
  count(DISTINCT CASE WHEN co.departments @> ARRAY['HR'] THEN co.id END) AS hr_contact_count
FROM clients cl
LEFT JOIN contacts co ON co.client_id = cl.id
LEFT JOIN deals d ON d.client_id = cl.id
GROUP BY cl.id;
