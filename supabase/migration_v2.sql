-- ============================================
-- EF1 CRM – Migration v2
-- Features: event_date on deals, next_followup_at on contacts
-- Run in: https://supabase.com/dashboard/project/rsejnqymtbjfigclqkaz/sql
-- ============================================

-- 1. Datum akce na dealech (event_date)
ALTER TABLE deals ADD COLUMN IF NOT EXISTS event_date DATE;

-- 2. Follow-up datum na kontaktech (next_followup_at)
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS next_followup_at DATE;

-- 3. Refresh views so they include new columns
CREATE OR REPLACE VIEW deals_with_relations AS
SELECT
  d.*,
  c.name   AS client_name,
  con.first_name || ' ' || con.last_name AS contact_name,
  con.primary_email  AS contact_email,
  ec.name  AS end_client_name
FROM deals d
LEFT JOIN clients c   ON c.id = d.client_id
LEFT JOIN contacts con ON con.id = d.contact_id
LEFT JOIN clients ec  ON ec.id = d.end_client_id;

CREATE OR REPLACE VIEW contacts_with_client AS
SELECT
  co.*,
  cl.name AS client_name,
  co.first_name || ' ' || co.last_name AS full_name,
  'K-' || ROW_NUMBER() OVER (ORDER BY co.created_at) AS contact_id_display
FROM contacts co
LEFT JOIN clients cl ON cl.id = co.client_id;
