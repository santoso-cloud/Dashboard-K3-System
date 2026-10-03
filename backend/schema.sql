-- INSTALL BARU: jalankan pada database kosong. Jika tabel sudah ada, transaksi dibatalkan.
BEGIN;
SET LOCAL search_path = public;
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(80) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  employee_number VARCHAR(50),
  name VARCHAR(150) NOT NULL,
  username VARCHAR(80) NOT NULL UNIQUE,
  email VARCHAR(180) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  phone VARCHAR(40),
  department VARCHAR(120),
  position VARCHAR(120),
  photo_url TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (status IN ('active', 'inactive', 'suspended', 'pending'))
);

CREATE TABLE incidents (
  id SERIAL PRIMARY KEY,
  title VARCHAR(180) NOT NULL,
  category VARCHAR(100),
  location VARCHAR(180),
  reporter VARCHAR(150),
  incident_date TIMESTAMPTZ,
  status VARCHAR(40) NOT NULL DEFAULT 'Open',
  description TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE observations (
  id SERIAL PRIMARY KEY,
  type VARCHAR(100),
  location VARCHAR(180),
  created_by VARCHAR(150),
  observation_date TIMESTAMPTZ,
  findings TEXT,
  follow_up TEXT,
  status VARCHAR(40) NOT NULL DEFAULT 'Open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE inspections (
  id SERIAL PRIMARY KEY,
  title VARCHAR(180),
  location VARCHAR(180),
  inspector VARCHAR(150),
  inspection_date TIMESTAMPTZ,
  findings TEXT,
  status VARCHAR(40) NOT NULL DEFAULT 'Open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE work_permits (
  id SERIAL PRIMARY KEY,
  work_type VARCHAR(120) NOT NULL,
  location VARCHAR(180),
  applicant VARCHAR(150),
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  status VARCHAR(40) NOT NULL DEFAULT 'Pending',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE trainings (
  id SERIAL PRIMARY KEY,
  name VARCHAR(180) NOT NULL,
  category VARCHAR(100),
  trainer VARCHAR(150),
  capacity INTEGER DEFAULT 0 CHECK (capacity >= 0),
  scheduled_at TIMESTAMPTZ,
  duration VARCHAR(80),
  status VARCHAR(40) NOT NULL DEFAULT 'Scheduled',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ppe_equipment (
  id SERIAL PRIMARY KEY,
  name VARCHAR(180) NOT NULL,
  category VARCHAR(100),
  code VARCHAR(80),
  location VARCHAR(180),
  status VARCHAR(40) NOT NULL DEFAULT 'Tersedia',
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE documents (
  id SERIAL PRIMARY KEY,
  name VARCHAR(180) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  file_type VARCHAR(50),
  version VARCHAR(30),
  status VARCHAR(40) NOT NULL DEFAULT 'Active',
  file_url TEXT,
  uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audits (
  id SERIAL PRIMARY KEY,
  name VARCHAR(180) NOT NULL,
  type VARCHAR(100),
  location VARCHAR(180),
  auditor VARCHAR(150),
  audit_date TIMESTAMPTZ,
  status VARCHAR(40) NOT NULL DEFAULT 'Planned',
  findings TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE corrective_actions (
  id SERIAL PRIMARY KEY,
  source VARCHAR(120),
  description TEXT NOT NULL,
  priority VARCHAR(40) NOT NULL DEFAULT 'Medium',
  assignee VARCHAR(150),
  due_date DATE,
  status VARCHAR(40) NOT NULL DEFAULT 'Open',
  resolution TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE risk_register (
  id SERIAL PRIMARY KEY,
  description TEXT NOT NULL,
  category VARCHAR(100),
  location VARCHAR(180),
  likelihood INTEGER CHECK (likelihood BETWEEN 1 AND 5),
  impact INTEGER CHECK (impact BETWEEN 1 AND 5),
  risk_score INTEGER,
  risk_level VARCHAR(40),
  status VARCHAR(40) NOT NULL DEFAULT 'Open',
  owner VARCHAR(150),
  mitigation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE reports (
  id SERIAL PRIMARY KEY,
  type VARCHAR(100),
  description TEXT,
  location VARCHAR(180),
  reporter VARCHAR(150),
  report_date TIMESTAMPTZ,
  status VARCHAR(40) NOT NULL DEFAULT 'Open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE settings (
  id BIGSERIAL PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value JSONB NOT NULL DEFAULT 'null'::jsonb,
  setting_group VARCHAR(80),
  description TEXT,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE near_misses (
 id SERIAL PRIMARY KEY,
 title VARCHAR(180) NOT NULL,
 category VARCHAR(100),
 location VARCHAR(180),
 description TEXT,
 incident_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 potential_severity VARCHAR(40),
 immediate_action TEXT,
 status VARCHAR(40) NOT NULL DEFAULT 'Open',
 reported_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE training_participants (
 id SERIAL PRIMARY KEY,
 training_id INTEGER NOT NULL REFERENCES trainings(id) ON DELETE RESTRICT,
 user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 attendance_status VARCHAR(30) NOT NULL DEFAULT 'Registered' CHECK (attendance_status IN ('Registered','Present','Absent','Cancelled')),
 score NUMERIC(5,2) CHECK (score BETWEEN 0 AND 100),
 certificate_url TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE (training_id, user_id)
);
CREATE TABLE ppe_assignments (
 id SERIAL PRIMARY KEY,
 equipment_id INTEGER NOT NULL REFERENCES ppe_equipment(id) ON DELETE RESTRICT,
 user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 quantity INTEGER NOT NULL CHECK (quantity > 0),
 issued_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 returned_at TIMESTAMPTZ,
 issued_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
 notes TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CHECK (returned_at IS NULL OR returned_at >= issued_at)
);
CREATE TABLE audit_findings (
 id SERIAL PRIMARY KEY,
 audit_id INTEGER NOT NULL REFERENCES audits(id) ON DELETE RESTRICT,
 description TEXT NOT NULL,
 severity VARCHAR(30) NOT NULL DEFAULT 'Minor' CHECK (severity IN ('Observation','Minor','Major','Critical')),
 assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
 due_date DATE,
 status VARCHAR(40) NOT NULL DEFAULT 'Open',
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE notifications (
 id SERIAL PRIMARY KEY,
 user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 title VARCHAR(180) NOT NULL,
 message TEXT NOT NULL,
 type VARCHAR(50) NOT NULL DEFAULT 'info',
 link TEXT,
 read_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE activity_logs (
 id BIGSERIAL PRIMARY KEY,
 user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
 action VARCHAR(100) NOT NULL,
 entity_type VARCHAR(80),
 entity_id BIGINT,
 metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE observations ADD COLUMN reported_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE inspections ADD COLUMN inspector_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE inspections ADD COLUMN observation_id INTEGER REFERENCES observations(id) ON DELETE SET NULL;
ALTER TABLE work_permits ADD COLUMN requested_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE work_permits ADD COLUMN approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE trainings ADD COLUMN created_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE audits ADD COLUMN auditor_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE corrective_actions ADD COLUMN assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE corrective_actions ADD COLUMN incident_id INTEGER REFERENCES incidents(id) ON DELETE SET NULL;
ALTER TABLE corrective_actions ADD COLUMN observation_id INTEGER REFERENCES observations(id) ON DELETE SET NULL;
ALTER TABLE corrective_actions ADD COLUMN inspection_id INTEGER REFERENCES inspections(id) ON DELETE SET NULL;
ALTER TABLE corrective_actions ADD COLUMN near_miss_id INTEGER REFERENCES near_misses(id) ON DELETE SET NULL;
ALTER TABLE corrective_actions ADD COLUMN audit_finding_id INTEGER REFERENCES audit_findings(id) ON DELETE SET NULL;
ALTER TABLE risk_register ADD COLUMN owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE reports ADD COLUMN created_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE work_permits ADD CONSTRAINT work_permits_dates_check CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date);
CREATE UNIQUE INDEX users_username_ci_idx ON users (lower(username));
CREATE UNIQUE INDEX users_email_ci_idx ON users (lower(email));
CREATE INDEX notifications_unread_idx ON notifications (user_id, created_at DESC) WHERE read_at IS NULL;
CREATE INDEX incidents_status_idx ON incidents(status);
CREATE INDEX incidents_date_idx ON incidents(incident_date);
CREATE INDEX observations_status_idx ON observations(status);
CREATE INDEX work_permits_status_idx ON work_permits(status);
CREATE INDEX trainings_status_idx ON trainings(status);
CREATE INDEX corrective_actions_status_idx ON corrective_actions(status);
CREATE INDEX risk_register_status_idx ON risk_register(status);
CREATE INDEX reports_status_idx ON reports(status);
CREATE INDEX users_role_id_idx ON users (role_id);
CREATE INDEX incidents_created_by_idx ON incidents (created_by);
CREATE INDEX observations_reported_by_idx ON observations (reported_by);
CREATE INDEX inspections_inspector_id_idx ON inspections (inspector_id);
CREATE INDEX inspections_observation_id_idx ON inspections (observation_id);
CREATE INDEX work_permits_requested_by_idx ON work_permits (requested_by);
CREATE INDEX work_permits_approved_by_idx ON work_permits (approved_by);
CREATE INDEX trainings_created_by_idx ON trainings (created_by);
CREATE INDEX documents_uploaded_by_idx ON documents (uploaded_by);
CREATE INDEX audits_auditor_id_idx ON audits (auditor_id);
CREATE INDEX corrective_actions_assigned_to_idx ON corrective_actions (assigned_to);
CREATE INDEX corrective_actions_incident_id_idx ON corrective_actions (incident_id);
CREATE INDEX corrective_actions_observation_id_idx ON corrective_actions (observation_id);
CREATE INDEX corrective_actions_inspection_id_idx ON corrective_actions (inspection_id);
CREATE INDEX corrective_actions_near_miss_id_idx ON corrective_actions (near_miss_id);
CREATE INDEX corrective_actions_audit_finding_id_idx ON corrective_actions (audit_finding_id);
CREATE INDEX risk_register_owner_id_idx ON risk_register (owner_id);
CREATE INDEX reports_created_by_idx ON reports (created_by);
CREATE INDEX settings_updated_by_idx ON settings (updated_by);
CREATE INDEX near_misses_reported_by_idx ON near_misses (reported_by);
CREATE INDEX training_participants_training_id_idx ON training_participants (training_id);
CREATE INDEX training_participants_user_id_idx ON training_participants (user_id);
CREATE INDEX ppe_assignments_equipment_id_idx ON ppe_assignments (equipment_id);
CREATE INDEX ppe_assignments_user_id_idx ON ppe_assignments (user_id);
CREATE INDEX ppe_assignments_issued_by_idx ON ppe_assignments (issued_by);
CREATE INDEX audit_findings_audit_id_idx ON audit_findings (audit_id);
CREATE INDEX audit_findings_assigned_to_idx ON audit_findings (assigned_to);
CREATE INDEX notifications_user_id_idx ON notifications (user_id);
CREATE INDEX activity_logs_user_id_idx ON activity_logs (user_id);
INSERT INTO roles (name, description) VALUES ('Super Admin', 'Akses penuh sistem');
INSERT INTO roles (name, description) VALUES ('Admin', 'Administrasi sistem');
INSERT INTO roles (name, description) VALUES ('Safety Officer', 'Pengelolaan keselamatan kerja');
INSERT INTO roles (name, description) VALUES ('Supervisor', 'Pemantauan dan persetujuan operasional');
INSERT INTO roles (name, description) VALUES ('Staff', 'Akses operasional dasar');
INSERT INTO settings (setting_key, setting_value, setting_group, is_public) VALUES ('company_name', '"PT JASIL K3"'::jsonb, 'general', TRUE);
INSERT INTO settings (setting_key, setting_value, setting_group, is_public) VALUES ('system_name', '"JASIL SAFETY"'::jsonb, 'general', TRUE);
INSERT INTO settings (setting_key, setting_value, setting_group, is_public) VALUES ('timezone', '"Asia/Jakarta"'::jsonb, 'general', TRUE);
INSERT INTO settings (setting_key, setting_value, setting_group, is_public) VALUES ('language', '"Bahasa Indonesia"'::jsonb, 'general', TRUE);
INSERT INTO settings (setting_key, setting_value, setting_group, is_public) VALUES ('date_format', '"DD/MM/YYYY"'::jsonb, 'general', TRUE);
INSERT INTO settings (setting_key, setting_value, setting_group, is_public) VALUES ('password_min_length', '8'::jsonb, 'security', FALSE);
INSERT INTO settings (setting_key, setting_value, setting_group, is_public) VALUES ('max_login_attempts', '5'::jsonb, 'security', FALSE);
INSERT INTO settings (setting_key, setting_value, setting_group, is_public) VALUES ('session_timeout', '60'::jsonb, 'security', FALSE);
INSERT INTO settings (setting_key, setting_value, setting_group, is_public) VALUES ('require_2fa', 'false'::jsonb, 'security', FALSE);
INSERT INTO settings (setting_key, setting_value, setting_group, is_public) VALUES ('notify_incidents', 'true'::jsonb, 'notifications', FALSE);
INSERT INTO settings (setting_key, setting_value, setting_group, is_public) VALUES ('notify_corrective_actions', 'true'::jsonb, 'notifications', FALSE);
INSERT INTO settings (setting_key, setting_value, setting_group, is_public) VALUES ('notify_training', 'true'::jsonb, 'notifications', FALSE);
INSERT INTO settings (setting_key, setting_value, setting_group, is_public) VALUES ('dashboard_theme', '"Terang"'::jsonb, 'appearance', TRUE);
INSERT INTO settings (setting_key, setting_value, setting_group, is_public) VALUES ('show_sidebar', 'true'::jsonb, 'appearance', TRUE);
INSERT INTO settings (setting_key, setting_value, setting_group, is_public) VALUES ('show_dashboard_cards', 'true'::jsonb, 'appearance', TRUE);
CREATE FUNCTION k3_set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = CURRENT_TIMESTAMP; RETURN NEW; END;
$$;
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION k3_set_updated_at();
CREATE TRIGGER incidents_updated_at BEFORE UPDATE ON incidents FOR EACH ROW EXECUTE FUNCTION k3_set_updated_at();
CREATE TRIGGER observations_updated_at BEFORE UPDATE ON observations FOR EACH ROW EXECUTE FUNCTION k3_set_updated_at();
CREATE TRIGGER inspections_updated_at BEFORE UPDATE ON inspections FOR EACH ROW EXECUTE FUNCTION k3_set_updated_at();
CREATE TRIGGER work_permits_updated_at BEFORE UPDATE ON work_permits FOR EACH ROW EXECUTE FUNCTION k3_set_updated_at();
CREATE TRIGGER trainings_updated_at BEFORE UPDATE ON trainings FOR EACH ROW EXECUTE FUNCTION k3_set_updated_at();
CREATE TRIGGER ppe_equipment_updated_at BEFORE UPDATE ON ppe_equipment FOR EACH ROW EXECUTE FUNCTION k3_set_updated_at();
CREATE TRIGGER documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION k3_set_updated_at();
CREATE TRIGGER audits_updated_at BEFORE UPDATE ON audits FOR EACH ROW EXECUTE FUNCTION k3_set_updated_at();
CREATE TRIGGER corrective_actions_updated_at BEFORE UPDATE ON corrective_actions FOR EACH ROW EXECUTE FUNCTION k3_set_updated_at();
CREATE TRIGGER risk_register_updated_at BEFORE UPDATE ON risk_register FOR EACH ROW EXECUTE FUNCTION k3_set_updated_at();
CREATE TRIGGER reports_updated_at BEFORE UPDATE ON reports FOR EACH ROW EXECUTE FUNCTION k3_set_updated_at();
CREATE TRIGGER settings_updated_at BEFORE UPDATE ON settings FOR EACH ROW EXECUTE FUNCTION k3_set_updated_at();
CREATE TRIGGER near_misses_updated_at BEFORE UPDATE ON near_misses FOR EACH ROW EXECUTE FUNCTION k3_set_updated_at();
CREATE TRIGGER training_participants_updated_at BEFORE UPDATE ON training_participants FOR EACH ROW EXECUTE FUNCTION k3_set_updated_at();
CREATE TRIGGER ppe_assignments_updated_at BEFORE UPDATE ON ppe_assignments FOR EACH ROW EXECUTE FUNCTION k3_set_updated_at();
CREATE TRIGGER audit_findings_updated_at BEFORE UPDATE ON audit_findings FOR EACH ROW EXECUTE FUNCTION k3_set_updated_at();
COMMIT;
