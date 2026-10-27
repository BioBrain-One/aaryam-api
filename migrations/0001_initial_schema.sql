-- Aaryam application database: Lovable PostgreSQL -> Cloudflare D1/SQLite
-- Generated from the exported public schema and constraints.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS "ai_credentials" (
    "name" TEXT PRIMARY KEY NOT NULL CHECK (name IN ('CF_ACCOUNT_ID','CF_GATEWAY_ID','CF_API_TOKEN','CF_AIG_TOKEN','CF_CUSTOM_PROVIDER_KEY')),
    "ciphertext" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "hint" TEXT NOT NULL DEFAULT '',
    "updated_by" TEXT,
    "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ai_settings" (
    "id" INTEGER PRIMARY KEY NOT NULL DEFAULT 1 CHECK (id = 1),
    "provider" TEXT NOT NULL DEFAULT 'cloudflare' CHECK (provider IN ('cloudflare','lovable','off')),
    "stt_model" TEXT NOT NULL DEFAULT '@cf/openai/whisper-large-v3-turbo',
    "coach_model" TEXT NOT NULL DEFAULT 'workers-ai/@cf/meta/llama-3.3-70b-instruct-fp8-fast',
    "fallback" TEXT NOT NULL DEFAULT 'rules' CHECK (fallback IN ('lovable','rules')),
    "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ai_usage" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "user_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT,
    "ok" INTEGER NOT NULL,
    "ms" INTEGER NOT NULL DEFAULT 0,
    "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "chants" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "slug" TEXT NOT NULL UNIQUE,
    "title" TEXT NOT NULL,
    "text_sanskrit" TEXT NOT NULL DEFAULT '',
    "text_transliterated" TEXT NOT NULL DEFAULT '',
    "meaning" TEXT,
    "recommended_count" INTEGER NOT NULL DEFAULT 108,
    "audio_kind" TEXT NOT NULL DEFAULT 'file',
    "audio_url" TEXT,
    "reciter" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "published" INTEGER NOT NULL DEFAULT true,
    "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "svara_marks" TEXT,
    "reference_audio_url" TEXT
);

CREATE TABLE IF NOT EXISTS "donation_classes" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "slug" TEXT NOT NULL UNIQUE,
    "name" TEXT NOT NULL,
    "sanskrit" TEXT NOT NULL DEFAULT '',
    "purpose" TEXT NOT NULL DEFAULT '',
    "detail" TEXT NOT NULL DEFAULT '',
    "amounts" TEXT NOT NULL DEFAULT '[]',
    "unit" TEXT NOT NULL DEFAULT '',
    "impact" TEXT NOT NULL DEFAULT '',
    "accent" TEXT NOT NULL DEFAULT 'gold',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "published" INTEGER NOT NULL DEFAULT true,
    "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "donation_drives" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "slug" TEXT NOT NULL UNIQUE,
    "class_slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "time" TEXT NOT NULL DEFAULT '',
    "venue" TEXT NOT NULL DEFAULT '',
    "need" TEXT NOT NULL DEFAULT '',
    "target" REAL NOT NULL DEFAULT 0,
    "raised" REAL NOT NULL DEFAULT 0,
    "volunteers" INTEGER NOT NULL DEFAULT false,
    "published" INTEGER NOT NULL DEFAULT true,
    "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata'
);

CREATE TABLE IF NOT EXISTS "donations" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "user_id" TEXT,
    "donor_name" TEXT,
    "donor_phone" TEXT,
    "class_slug" TEXT NOT NULL,
    "drive_slug" TEXT,
    "amount" REAL NOT NULL CHECK (amount > 0),
    "method" TEXT NOT NULL DEFAULT 'upi',
    "upi_reference" TEXT,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "verified_at" TEXT,
    "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "event_signups" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "user_id" TEXT NOT NULL UNIQUE,
    "event_key" TEXT NOT NULL UNIQUE,
    "event_title" TEXT NOT NULL DEFAULT '',
    "event_date" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'live',
    "notify" INTEGER NOT NULL DEFAULT true,
    "attending" INTEGER NOT NULL DEFAULT false,
    "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE ("user_id", "event_key")
);

CREATE TABLE IF NOT EXISTS "festivals" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "month_day" TEXT NOT NULL UNIQUE,
    "date_override" TEXT,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'major',
    "note" TEXT NOT NULL DEFAULT '',
    "activity_event_id" TEXT,
    "activity_title" TEXT,
    "activity_time" TEXT,
    "activity_duration_minutes" INTEGER,
    "activity_venue" TEXT,
    "activity_seva" TEXT,
    "activity_registration" INTEGER NOT NULL DEFAULT false,
    "activity_stream_url" TEXT,
    "activity_capacity" INTEGER,
    "published" INTEGER NOT NULL DEFAULT true,
    "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activity_timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata'
);

CREATE TABLE IF NOT EXISTS "live_events" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "slug" TEXT NOT NULL UNIQUE,
    "title" TEXT NOT NULL,
    "speaker" TEXT NOT NULL DEFAULT '',
    "date" TEXT NOT NULL,
    "time" TEXT NOT NULL DEFAULT '',
    "duration_minutes" INTEGER NOT NULL DEFAULT 60,
    "channel" TEXT NOT NULL DEFAULT '',
    "stream_url" TEXT,
    "description" TEXT NOT NULL DEFAULT '',
    "published" INTEGER NOT NULL DEFAULT true,
    "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata'
);

CREATE TABLE IF NOT EXISTS "panchang_days" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "date" TEXT NOT NULL UNIQUE,
    "tithi" TEXT NOT NULL,
    "nakshatra" TEXT NOT NULL,
    "navamsha" TEXT NOT NULL DEFAULT '',
    "yoga" TEXT,
    "karana" TEXT,
    "sunrise" TEXT NOT NULL DEFAULT '',
    "sunset" TEXT NOT NULL DEFAULT '',
    "auspicious_muhurta_start" TEXT NOT NULL DEFAULT '',
    "auspicious_muhurta_end" TEXT NOT NULL DEFAULT '',
    "rahu_kalam" TEXT NOT NULL DEFAULT '',
    "gurudev_daily_message" TEXT NOT NULL DEFAULT '',
    "published" INTEGER NOT NULL DEFAULT true,
    "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "payment_settings" (
    "id" INTEGER PRIMARY KEY NOT NULL DEFAULT 1 CHECK (id = 1),
    "upi_id" TEXT NOT NULL DEFAULT 'aaryamfoundation@upi',
    "payee_name" TEXT NOT NULL DEFAULT 'Aaryam Foundation',
    "qr_image_url" TEXT,
    "instructions" TEXT NOT NULL DEFAULT 'Pay to the UPI ID above, then enter the 12-digit UPI reference number so the seva desk can confirm and issue your receipt.',
    "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "practice_sessions" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "user_id" TEXT NOT NULL,
    "chant_slug" TEXT NOT NULL,
    "overall" INTEGER NOT NULL,
    "pronunciation" INTEGER NOT NULL,
    "rhythm" INTEGER NOT NULL,
    "svara" INTEGER NOT NULL,
    "svara_method" TEXT NOT NULL DEFAULT 'steadiness',
    "errors" TEXT NOT NULL DEFAULT '[]',
    "tips" TEXT NOT NULL DEFAULT '[]',
    "duration_s" REAL NOT NULL DEFAULT 0,
    "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "profiles" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "email" TEXT,
    "full_name" TEXT,
    "phone" TEXT,
    "dob" TEXT,
    "gender" TEXT,
    "region" TEXT,
    "mode" TEXT NOT NULL DEFAULT 'youth',
    "theme" TEXT NOT NULL DEFAULT 'light',
    "onboarded" INTEGER NOT NULL DEFAULT false,
    "birthday_message" TEXT,
    "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "latitude" REAL,
    "longitude" REAL,
    "timezone" TEXT,
    "place_label" TEXT
);

CREATE TABLE IF NOT EXISTS "rituals" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "slug" TEXT NOT NULL UNIQUE,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'Daily',
    "duration_minutes" INTEGER NOT NULL DEFAULT 15,
    "overview" TEXT NOT NULL DEFAULT '',
    "procedure_steps" TEXT NOT NULL DEFAULT '[]',
    "samagri_list" TEXT NOT NULL DEFAULT '[]',
    "audio_url" TEXT,
    "dos_and_donts" TEXT NOT NULL DEFAULT '',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "published" INTEGER NOT NULL DEFAULT true,
    "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "user_roles" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "user_id" TEXT NOT NULL UNIQUE,
    "role" TEXT NOT NULL UNIQUE,
    "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE ("user_id", "role")
);

CREATE INDEX IF NOT EXISTS "idx_donations_user_id" ON "donations" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_event_signups_user_id" ON "event_signups" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_practice_sessions_user_id" ON "practice_sessions" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_user_roles_user_id" ON "user_roles" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_donations_class_slug" ON "donations" ("class_slug");
CREATE INDEX IF NOT EXISTS "idx_donation_drives_class_slug" ON "donation_drives" ("class_slug");
CREATE INDEX IF NOT EXISTS "idx_practice_sessions_chant_slug" ON "practice_sessions" ("chant_slug");
CREATE INDEX IF NOT EXISTS "idx_festivals_date_override" ON "festivals" ("date_override");
CREATE INDEX IF NOT EXISTS "idx_live_events_date" ON "live_events" ("date");
CREATE INDEX IF NOT EXISTS "idx_panchang_days_date" ON "panchang_days" ("date");
