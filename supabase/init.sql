-- =====================================================
-- جداول Supabase
-- =====================================================

-- مدارس
CREATE TABLE IF NOT EXISTS schools (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name TEXT NOT NULL,
    code TEXT,
    type TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE schools ENABLE ROW LEVEL SECURITY;

-- مدیران
CREATE TABLE IF NOT EXISTS managers (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    school_id BIGINT REFERENCES schools(id),
    role TEXT DEFAULT 'manager',
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE managers ENABLE ROW LEVEL SECURITY;

-- پروفایل‌های احراز هویت (برای Supabase Auth)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    name TEXT,
    school_id BIGINT REFERENCES schools(id),
    role TEXT DEFAULT 'manager',
    password_hash TEXT NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- دانش‌آموزان
CREATE TABLE IF NOT EXISTS students (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name TEXT NOT NULL,
    code TEXT,
    grade TEXT,
    phone TEXT,
    school_id BIGINT NOT NULL REFERENCES schools(id),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- تراکنش‌ها
CREATE TABLE IF NOT EXISTS transactions (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    account TEXT NOT NULL,
    debit BIGINT DEFAULT 0,
    credit BIGINT DEFAULT 0,
    kind TEXT CHECK (kind IN ('income', 'expense')),
    comment TEXT,
    payment_method TEXT,
    tracking_code TEXT,
    student_id BIGINT REFERENCES students(id),
    school_id BIGINT NOT NULL REFERENCES schools(id),
    reconciled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- داده‌های پیش‌فرض
-- =====================================================

INSERT INTO schools (name, code, type, active) VALUES
    ('دبستان نور ۱', 'NUR1', '', TRUE),
    ('دبستان نور ۲', 'NUR2', '', TRUE),
    ('دبستان تبیان ۱', 'TBY1', '', TRUE),
    ('دبستان تبیان ۲', 'TBY2', '', TRUE),
    ('مهدالرضا مرکزی شیفت صبح', 'MHD1', '', TRUE),
    ('مهدالرضا مرکزی شیفت عصر', 'MHD2', '', TRUE),
    ('مهدالرضا ابراهیم خلیل', 'MHD3', '', TRUE),
    ('مهدالرضا سروستان', 'MHD4', '', TRUE),
    ('مهدالرضا منظریه', 'MHD5', '', TRUE)
ON CONFLICT DO NOTHING;

-- =====================================================
-- سیاست‌های RLS (Row Level Security)
-- =====================================================

-- مدیران تنها داده‌های مدرسهٔ خود را ببینند
CREATE POLICY "managers_school_access" ON managers
    FOR SELECT USING (
        auth.uid()::text = id::text OR role = 'admin'
    );

-- دانش‌آموزان فقط برای مدرسهٔ جاری
CREATE POLICY "students_school_access" ON students
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM managers m
            WHERE m.school_id = students.school_id
            AND (m.role = 'admin' OR m.school_id = students.school_id)
        )
    );

-- تراکنش‌ها برای مدرسهٔ مربوطه
CREATE POLICY "transactions_school_access" ON transactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM managers m
            WHERE (m.role = 'admin' OR m.school_id = transactions.school_id)
        )
    );

-- =====================================================
-- شاخص‌ها برای عملکرد بهتر
-- =====================================================

CREATE INDEX idx_schools_active ON schools(active);
CREATE INDEX idx_managers_school_id ON managers(school_id);
CREATE INDEX idx_managers_username ON managers(username);
CREATE INDEX idx_students_school_id ON students(school_id);
CREATE INDEX idx_transactions_school_id ON transactions(school_id);
CREATE INDEX idx_transactions_date ON transactions(date);
