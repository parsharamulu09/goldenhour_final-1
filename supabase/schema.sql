
-- Enable RLS
CREATE TYPE user_role AS ENUM ('AMBULANCE', 'HOSPITAL', 'POLICE');
CREATE TYPE severity_level AS ENUM ('LOW', 'MEDIUM', 'CRITICAL');
CREATE TYPE case_status AS ENUM ('TRANSIT', 'ARRIVED');

-- Extended Profiles
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'HOSPITAL',
  unit_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Extended Cases
CREATE TABLE cases (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  ambulance_id TEXT NOT NULL,
  hospital_id TEXT NOT NULL,
  
  -- Patient Identification Info
  patient_name TEXT,
  blood_group TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  id_proof_type TEXT,
  temporary_id TEXT,
  
  is_unknown BOOLEAN DEFAULT TRUE,
  severity severity_level DEFAULT 'MEDIUM',
  eta INTEGER DEFAULT 15,
  status case_status DEFAULT 'TRANSIT',
  notes TEXT,
  gemini_summary TEXT,
  
  -- Police Info
  age_est TEXT,
  physical_description TEXT,
  photo_url TEXT,
  location_gps TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Readiness
CREATE TABLE readiness (
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE PRIMARY KEY,
  icu_ready BOOLEAN DEFAULT FALSE,
  blood_ready BOOLEAN DEFAULT FALSE,
  specialist_ready BOOLEAN DEFAULT FALSE,
  equipment_ready BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Traffic Logs (For Police Central Reporting)
CREATE TABLE incident_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  case_id UUID REFERENCES cases(id),
  log_type TEXT DEFAULT 'TRAFFIC_ACCIDENT',
  reported_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Realtime Configuration
ALTER PUBLICATION supabase_realtime ADD TABLE cases, readiness, incident_logs;

-- Full emergency case payload for voice + EMS ↔ hospital sync (JSON mirror of app state)
CREATE TABLE IF NOT EXISTS emergency_cases (
  id TEXT PRIMARY KEY,
  case_payload JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER PUBLICATION supabase_realtime ADD TABLE emergency_cases;
