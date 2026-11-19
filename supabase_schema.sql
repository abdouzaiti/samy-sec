-- ========================================================
-- Schema Solution for Samy Academy (Supabase Database)
-- ========================================================
-- Complete SQL definitions required to run the Samy Academy
-- administration & secretariat dashboard.
--
-- HOW TO DEPLOY:
-- 1. Go to your Supabase Dashboard (https://supabase.com).
-- 2. Select your Samy Academy project.
-- 3. Click "SQL Editor" in the left sidebar navigation.
-- 4. Create a new query (Click "+ New query").
-- 5. Paste this entire script and click "RUN".

-- ==========================================
-- 1. CREATE TABLE DEFINITIONS
-- ==========================================

-- A. CREATE classes TABLE
CREATE TABLE IF NOT EXISTS public.classes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  teacher_id TEXT,
  "teacherId" TEXT
);

-- B. CREATE students TABLE
CREATE TABLE IF NOT EXISTS public.students (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  "parentPhone" TEXT,
  parent_phone TEXT,
  secondary_phone TEXT,
  email TEXT,
  birth_date TEXT,
  address TEXT,
  "paymentStatus" TEXT DEFAULT 'Pending' CHECK ("paymentStatus" IN ('Paid', 'Pending', 'Unpaid')),
  payment_status TEXT DEFAULT 'Pending' CHECK (payment_status IN ('Paid', 'Pending', 'Unpaid')),
  "classId" TEXT NOT NULL DEFAULT '',
  class_id TEXT,
  class_ids JSONB DEFAULT '[]'::jsonb,
  "tokenId" TEXT,
  token_id TEXT,
  sessions_completed INTEGER DEFAULT 0,
  current_month INTEGER DEFAULT 1,
  paid_months JSONB DEFAULT '[]'::jsonb,
  attendance_data JSONB DEFAULT '{}'::jsonb,
  attendance_dates JSONB DEFAULT '{}'::jsonb
);

-- C. CREATE teachers TABLE
CREATE TABLE IF NOT EXISTS public.teachers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  secondary_phone TEXT,
  birth_date TEXT,
  address TEXT,
  subject TEXT NOT NULL,
  salary NUMERIC NOT NULL DEFAULT 0,
  "paymentStatus" TEXT DEFAULT 'Unpaid' CHECK ("paymentStatus" IN ('Paid', 'Pending', 'Unpaid')),
  payment_status TEXT DEFAULT 'Unpaid' CHECK (payment_status IN ('Paid', 'Pending', 'Unpaid')),
  "lastPaymentDate" TEXT,
  last_payment_date TEXT,
  "tokenId" TEXT,
  token_id TEXT,
  current_month INTEGER DEFAULT 1,
  paid_months JSONB DEFAULT '[]'::jsonb
);

-- D. CREATE pointage_logs TABLE
CREATE TABLE IF NOT EXISTS public.pointage_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "personId" TEXT NOT NULL,
  person_id TEXT,
  "personType" TEXT NOT NULL CHECK ("personType" IN ('student', 'teacher')),
  person_type TEXT CHECK (person_type IN ('student', 'teacher')),
  "personName" TEXT NOT NULL,
  person_name TEXT,
  "tokenId" TEXT NOT NULL,
  token_id TEXT,
  timestamp TEXT NOT NULL,
  details TEXT NOT NULL
);

-- E. CREATE attendance_records TABLE
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  student_id TEXT NOT NULL,
  session_date TEXT NOT NULL,
  is_present BOOLEAN NOT NULL DEFAULT true
);

-- F. CREATE expenses TABLE
CREATE TABLE IF NOT EXISTS public.expenses (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'other',
  date TEXT NOT NULL,
  month INTEGER NOT NULL DEFAULT 1,
  year INTEGER NOT NULL DEFAULT 2026,
  notes TEXT
);

-- G. CREATE payments TABLE
CREATE TABLE IF NOT EXISTS public.payments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  student_id TEXT NOT NULL,
  student_name TEXT NOT NULL,
  class_id TEXT NOT NULL DEFAULT '',
  month INTEGER NOT NULL DEFAULT 1,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  sarf NUMERIC NOT NULL DEFAULT 0,
  session_dates JSONB DEFAULT '[]'::jsonb,
  timestamp TEXT NOT NULL
);

-- H. CREATE timetable_config TABLE
CREATE TABLE IF NOT EXISTS public.timetable_config (
  id TEXT PRIMARY KEY,
  days JSONB NOT NULL DEFAULT '["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"]'::jsonb,
  time_slots JSONB NOT NULL DEFAULT '["08:00 - 10:00", "10:00 - 12:00", "13:00 - 15:00", "15:00 - 17:00", "17:00 - 19:00", "19:00 - 21:00"]'::jsonb,
  rooms JSONB NOT NULL DEFAULT '["Salle 1", "Salle 2", "Salle 3", "Salle 4"]'::jsonb,
  cells JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- I. CREATE rent_vault_config TABLE
CREATE TABLE IF NOT EXISTS public.rent_vault_config (
  id TEXT PRIMARY KEY,
  target_annual_rent NUMERIC NOT NULL DEFAULT 180000,
  deposits JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- J. CREATE admin_accounts TABLE
CREATE TABLE IF NOT EXISTS public.admin_accounts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  display_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'secretary' CHECK (role IN ('director', 'secretary')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (now()::text)
);


-- ========================================================
-- 2. ENSURE ALL COLUMNS EXIST ON EXISTING TABLES
-- ========================================================
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT 0;
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS teacher_id TEXT;
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS "teacherId" TEXT;

ALTER TABLE public.students ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS "classId" TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS class_id TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS class_ids JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS "tokenId" TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS token_id TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS "parentPhone" TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS parent_phone TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS secondary_phone TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS birth_date TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS "paymentStatus" TEXT DEFAULT 'Pending';
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'Pending';
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS sessions_completed INTEGER DEFAULT 0;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS current_month INTEGER DEFAULT 1;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS paid_months JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS attendance_data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS attendance_dates JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS secondary_phone TEXT;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS birth_date TEXT;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS salary NUMERIC DEFAULT 0;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS "tokenId" TEXT;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS token_id TEXT;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS "paymentStatus" TEXT DEFAULT 'Unpaid';
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'Unpaid';
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS "lastPaymentDate" TEXT;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS last_payment_date TEXT;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS current_month INTEGER DEFAULT 1;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS paid_months JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.pointage_logs ADD COLUMN IF NOT EXISTS "personId" TEXT;
ALTER TABLE public.pointage_logs ADD COLUMN IF NOT EXISTS person_id TEXT;
ALTER TABLE public.pointage_logs ADD COLUMN IF NOT EXISTS "personType" TEXT;
ALTER TABLE public.pointage_logs ADD COLUMN IF NOT EXISTS person_type TEXT;
ALTER TABLE public.pointage_logs ADD COLUMN IF NOT EXISTS "personName" TEXT;
ALTER TABLE public.pointage_logs ADD COLUMN IF NOT EXISTS person_name TEXT;
ALTER TABLE public.pointage_logs ADD COLUMN IF NOT EXISTS "tokenId" TEXT;
ALTER TABLE public.pointage_logs ADD COLUMN IF NOT EXISTS token_id TEXT;
ALTER TABLE public.pointage_logs ADD COLUMN IF NOT EXISTS timestamp TEXT;
ALTER TABLE public.pointage_logs ADD COLUMN IF NOT EXISTS details TEXT;


-- ==========================================
-- 3. AUTOMATED DB SYNCHRONIZATION TRIGGERS
-- ==========================================

CREATE OR REPLACE FUNCTION sync_classes_keys()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.teacher_id IS DISTINCT FROM OLD.teacher_id THEN
      NEW."teacherId" := NEW.teacher_id;
    ELSIF NEW."teacherId" IS DISTINCT FROM OLD."teacherId" THEN
      NEW.teacher_id := NEW."teacherId";
    END IF;
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.teacher_id IS NOT NULL AND NEW."teacherId" IS NULL THEN
      NEW."teacherId" := NEW.teacher_id;
    ELSIF NEW."teacherId" IS NOT NULL AND NEW.teacher_id IS NULL THEN
      NEW.teacher_id := NEW."teacherId";
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_sync_classes_keys
BEFORE INSERT OR UPDATE ON public.classes
FOR EACH ROW
EXECUTE FUNCTION sync_classes_keys();

CREATE OR REPLACE FUNCTION sync_students_keys()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.parent_phone IS DISTINCT FROM OLD.parent_phone THEN
      NEW."parentPhone" := NEW.parent_phone;
    ELSIF NEW."parentPhone" IS DISTINCT FROM OLD."parentPhone" THEN
      NEW.parent_phone := NEW."parentPhone";
    END IF;
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.parent_phone IS NOT NULL AND NEW."parentPhone" IS NULL THEN
      NEW."parentPhone" := NEW.parent_phone;
    ELSIF NEW."parentPhone" IS NOT NULL AND NEW.parent_phone IS NULL THEN
      NEW.parent_phone := NEW."parentPhone";
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
      NEW."paymentStatus" := NEW.payment_status;
    ELSIF NEW."paymentStatus" IS DISTINCT FROM OLD."paymentStatus" THEN
      NEW.payment_status := NEW."paymentStatus";
    END IF;
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.payment_status IS NOT NULL AND NEW."paymentStatus" IS NULL THEN
      NEW."paymentStatus" := NEW.payment_status;
    ELSIF NEW."paymentStatus" IS NOT NULL AND NEW.payment_status IS NULL THEN
      NEW.payment_status := NEW."paymentStatus";
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.class_id IS DISTINCT FROM OLD.class_id THEN
      NEW."classId" := NEW.class_id;
    ELSIF NEW."classId" IS DISTINCT FROM OLD."classId" THEN
      NEW.class_id := NEW."classId";
    END IF;
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.class_id IS NOT NULL AND NEW."classId" IS NULL THEN
      NEW."classId" := NEW.class_id;
    ELSIF NEW."classId" IS NOT NULL AND NEW.class_id IS NULL THEN
      NEW.class_id := NEW."classId";
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.token_id IS DISTINCT FROM OLD.token_id THEN
      NEW."tokenId" := NEW.token_id;
    ELSIF NEW."tokenId" IS DISTINCT FROM OLD."tokenId" THEN
      NEW.token_id := NEW."tokenId";
    END IF;
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.token_id IS NOT NULL AND NEW."tokenId" IS NULL THEN
      NEW."tokenId" := NEW.token_id;
    ELSIF NEW."tokenId" IS NOT NULL AND NEW.token_id IS NULL THEN
      NEW.token_id := NEW."tokenId";
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_sync_students_keys
BEFORE INSERT OR UPDATE ON public.students
FOR EACH ROW
EXECUTE FUNCTION sync_students_keys();

CREATE OR REPLACE FUNCTION sync_teachers_keys()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
      NEW."paymentStatus" := NEW.payment_status;
    ELSIF NEW."paymentStatus" IS DISTINCT FROM OLD."paymentStatus" THEN
      NEW.payment_status := NEW."paymentStatus";
    END IF;
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.payment_status IS NOT NULL AND NEW."paymentStatus" IS NULL THEN
      NEW."paymentStatus" := NEW.payment_status;
    ELSIF NEW."paymentStatus" IS NOT NULL AND NEW.payment_status IS NULL THEN
      NEW.payment_status := NEW."paymentStatus";
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.last_payment_date IS DISTINCT FROM OLD.last_payment_date THEN
      NEW."lastPaymentDate" := NEW.last_payment_date;
    ELSIF NEW."lastPaymentDate" IS DISTINCT FROM OLD."lastPaymentDate" THEN
      NEW.last_payment_date := NEW."lastPaymentDate";
    END IF;
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.last_payment_date IS NOT NULL AND NEW."lastPaymentDate" IS NULL THEN
      NEW."lastPaymentDate" := NEW.last_payment_date;
    ELSIF NEW."lastPaymentDate" IS NOT NULL AND NEW.last_payment_date IS NULL THEN
      NEW.last_payment_date := NEW."lastPaymentDate";
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.token_id IS DISTINCT FROM OLD.token_id THEN
      NEW."tokenId" := NEW.token_id;
    ELSIF NEW."tokenId" IS DISTINCT FROM OLD."tokenId" THEN
      NEW.token_id := NEW."tokenId";
    END IF;
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.token_id IS NOT NULL AND NEW."tokenId" IS NULL THEN
      NEW."tokenId" := NEW.token_id;
    ELSIF NEW."tokenId" IS NOT NULL AND NEW.token_id IS NULL THEN
      NEW.token_id := NEW."tokenId";
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_sync_teachers_keys
BEFORE INSERT OR UPDATE ON public.teachers
FOR EACH ROW
EXECUTE FUNCTION sync_teachers_keys();

CREATE OR REPLACE FUNCTION sync_pointage_logs_keys()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.person_id IS DISTINCT FROM OLD.person_id THEN
      NEW."personId" := NEW.person_id;
    ELSIF NEW."personId" IS DISTINCT FROM OLD."personId" THEN
      NEW.person_id := NEW."personId";
    END IF;
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.person_id IS NOT NULL AND NEW."personId" IS NULL THEN
      NEW."personId" := NEW.person_id;
    ELSIF NEW."personId" IS NOT NULL AND NEW.person_id IS NULL THEN
      NEW.person_id := NEW."personId";
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.person_type IS DISTINCT FROM OLD.person_type THEN
      NEW."personType" := NEW.person_type;
    ELSIF NEW."personType" IS DISTINCT FROM OLD."personType" THEN
      NEW.person_type := NEW."personType";
    END IF;
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.person_type IS NOT NULL AND NEW."personType" IS NULL THEN
      NEW."personType" := NEW.person_type;
    ELSIF NEW."personType" IS NOT NULL AND NEW.person_type IS NULL THEN
      NEW.person_type := NEW."personType";
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.person_name IS DISTINCT FROM OLD.person_name THEN
      NEW."personName" := NEW.person_name;
    ELSIF NEW."personName" IS DISTINCT FROM OLD."personName" THEN
      NEW.person_name := NEW."personName";
    END IF;
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.person_name IS NOT NULL AND NEW."personName" IS NULL THEN
      NEW."personName" := NEW.person_name;
    ELSIF NEW."personName" IS NOT NULL AND NEW.person_name IS NULL THEN
      NEW.person_name := NEW."personName";
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.token_id IS DISTINCT FROM OLD.token_id THEN
      NEW."tokenId" := NEW.token_id;
    ELSIF NEW."tokenId" IS DISTINCT FROM OLD."tokenId" THEN
      NEW.token_id := NEW."tokenId";
    END IF;
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.token_id IS NOT NULL AND NEW."tokenId" IS NULL THEN
      NEW."tokenId" := NEW.token_id;
    ELSIF NEW."tokenId" IS NOT NULL AND NEW.token_id IS NULL THEN
      NEW.token_id := NEW."tokenId";
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_sync_pointage_logs_keys
BEFORE INSERT OR UPDATE ON public.pointage_logs
FOR EACH ROW
EXECUTE FUNCTION sync_pointage_logs_keys();


-- ==========================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pointage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rent_vault_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on classes" ON public.classes;
CREATE POLICY "Allow all on classes" ON public.classes FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on students" ON public.students;
CREATE POLICY "Allow all on students" ON public.students FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on teachers" ON public.teachers;
CREATE POLICY "Allow all on teachers" ON public.teachers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on pointage_logs" ON public.pointage_logs;
CREATE POLICY "Allow all on pointage_logs" ON public.pointage_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on attendance_records" ON public.attendance_records;
CREATE POLICY "Allow all on attendance_records" ON public.attendance_records FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on expenses" ON public.expenses;
CREATE POLICY "Allow all on expenses" ON public.expenses FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on payments" ON public.payments;
CREATE POLICY "Allow all on payments" ON public.payments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on timetable_config" ON public.timetable_config;
CREATE POLICY "Allow all on timetable_config" ON public.timetable_config FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on rent_vault_config" ON public.rent_vault_config;
CREATE POLICY "Allow all on rent_vault_config" ON public.rent_vault_config FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.admin_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on admin_accounts" ON public.admin_accounts;
CREATE POLICY "Allow all on admin_accounts" ON public.admin_accounts FOR ALL USING (true) WITH CHECK (true);


-- ==========================================
-- 4.5. GRANT ROLE PRIVILEGES (REQUIRED FOR ANON / PUBLISHABLE KEY)
-- ==========================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.classes TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.students TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.teachers TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.pointage_logs TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.attendance_records TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.expenses TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.payments TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.timetable_config TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.rent_vault_config TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.admin_accounts TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- ==========================================
-- 5. PERFORMANCE INDEXES
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_students_class_id ON public.students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_class_id_camel ON public.students("classId");
CREATE INDEX IF NOT EXISTS idx_teachers_payment_status ON public.teachers(payment_status);
CREATE INDEX IF NOT EXISTS idx_pointage_logs_tokenId ON public.pointage_logs("tokenId");
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(date);
CREATE INDEX IF NOT EXISTS idx_payments_student_id ON public.payments(student_id);


-- =========================================================
-- 6. INITIAL SEED DATA FOR SAMY ACADEMY (NON-DESTRUCTIVE)
-- =========================================================

INSERT INTO public.classes (id, name, price, description, teacher_id) VALUES
('class-1', 'Terminale - Mathématiques', 2500, 'Préparation intensive au Baccalauréat, analyse, algèbre et probabilités.', 'teacher-1'),
('class-2', 'Terminale - Physique & Chimie', 2500, 'Programme officiel du Bac, mécanique, électricité et réactions chimiques.', 'teacher-2'),
('class-3', 'BEM - Mathématiques', 1800, 'Préparation complète à l''épreuve de maths du Brevet BEM.', 'teacher-1'),
('class-4', 'Lycée - Anglais Général', 1500, 'Amélioration de l''anglais écrit, parlé et grammaire de niveau secondaire.', 'teacher-4'),
('class-5', 'Français - Soutien Moyen', 1600, 'Vocabulaire, conjugaison et productions d''écrits pour le collège.', 'teacher-3')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.teachers (id, name, email, subject, salary, payment_status, last_payment_date, token_id) VALUES
('teacher-1', 'Prof. Slimane Belkacem', 's.belkacem@samyacademy.dz', 'Mathematics', 45000, 'Paid', '2026-06-05', 'T201'),
('teacher-2', 'Dr. Yasmina Mansouri', 'y.mansouri@samyacademy.dz', 'Physics', 48050, 'Unpaid', NULL, 'T202'),
('teacher-3', 'Prof. Mourad Bouzidi', 'm.bouzidi@samyacademy.dz', 'French', 38000, 'Pending', NULL, 'T203'),
('teacher-4', 'Prof. Amina Ouchene', 'a.ouchene@samyacademy.dz', 'English', 35000, 'Paid', '2026-06-08', 'T204')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (id, name, parent_phone, payment_status, class_id, class_ids, token_id, current_month, paid_months) VALUES
('student-1', 'Abderrahmane Zaiti', '0661245892', 'Paid', 'class-1', '["class-1","class-2"]'::jsonb, 'S101', 1, '[1]'::jsonb),
('student-2', 'Leila Kaddour', '0555321456', 'Pending', 'class-1', '["class-1","class-3"]'::jsonb, 'S102', 1, '[1]'::jsonb),
('student-3', 'Yanis Amrani', '0772183495', 'Unpaid', 'class-2', '["class-2"]'::jsonb, 'S103', 1, '[1]'::jsonb),
('student-4', 'Fatma-Zohra Mansouri', '0561234567', 'Paid', 'class-3', '["class-3","class-4"]'::jsonb, 'S104', 1, '[1]'::jsonb),
('student-5', 'Amine Bouzidi', '0662895412', 'Pending', 'class-4', '["class-4","class-5"]'::jsonb, 'S105', 1, '[1]'::jsonb),
('student-6', 'Meriem Ouchene', '0770987654', 'Paid', 'class-5', '["class-5"]'::jsonb, 'S106', 1, '[1]'::jsonb),
('student-7', 'Anis Belkacem', '0551743621', 'Unpaid', 'class-2', '["class-2","class-1"]'::jsonb, 'S107', 1, '[1]'::jsonb),
('student-8', 'Khadidja Haddad', '0663152436', 'Paid', 'class-3', '["class-3"]'::jsonb, 'S108', 1, '[1]'::jsonb),
('student-9', 'Oussama Sifi', '0792345678', 'Unpaid', 'class-5', '["class-5"]'::jsonb, 'S109', 1, '[1]'::jsonb)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.admin_accounts (id, username, password, display_name, email, phone, role, is_active, created_at) VALUES
('1', 'director', 'mostarunclub', 'Director', 'director@samyacademy.dz', '', 'director', true, '2026-01-01T00:00:00.000Z'),
('2', 'secretary', 'samy123', 'Secrétariat Samy Academy', 'secretary@samyacademy.dz', '', 'secretary', true, '2026-01-01T00:00:00.000Z')
ON CONFLICT (id) DO NOTHING;
