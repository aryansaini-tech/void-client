-- Additive extension of legacy PostgreSQL schema. Apply explicitly after backup.
BEGIN;
CREATE TABLE IF NOT EXISTS "VoidSchemaMigration" (id TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS "VoidDiscordIdentity" (
 discord_id TEXT PRIMARY KEY CHECK (discord_id ~ '^[0-9]{17,20}$'),
 user_id TEXT UNIQUE NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT,
 display_name TEXT NOT NULL, avatar_hash TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), last_login TIMESTAMPTZ DEFAULT now()
);
-- Keep every verified legacy Discord link visible without fabricating a provider-specific last login.
DO $$ BEGIN
 IF EXISTS (SELECT a."userId" FROM "Account" a WHERE a."providerId"='discord' AND a."accountId" ~ '^[0-9]{17,20}$' GROUP BY a."userId" HAVING count(*)>1)
 OR EXISTS (SELECT 1 FROM "Account" a JOIN "VoidDiscordIdentity" d ON d.discord_id=a."accountId" WHERE a."providerId"='discord' AND d.user_id<>a."userId") THEN
  RAISE EXCEPTION 'Ambiguous legacy Discord identity mapping. Resolve on a restored development copy before migration.';
 END IF;
END $$;
INSERT INTO "VoidDiscordIdentity"(discord_id,user_id,display_name,avatar_hash,created_at,last_login)
SELECT a."accountId",a."userId",u.name,NULL,a."createdAt",NULL
FROM "Account" a JOIN "User" u ON u.id=a."userId"
WHERE a."providerId"='discord' AND a."accountId" ~ '^[0-9]{17,20}$'
ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS "VoidSession" (
 token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES "User"(id),
 csrf_nonce TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), expires_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS "VoidCosmetic" (
 item_id TEXT PRIMARY KEY REFERENCES "Product"(id) ON DELETE RESTRICT,
 kind TEXT NOT NULL DEFAULT 'store_item', slot TEXT,
 CHECK (kind IN ('cape','cosmetic','store_item')), CHECK (slot IS NULL OR slot ~ '^[a-z0-9_-]{1,40}$')
);
CREATE TABLE IF NOT EXISTS "VoidEntitlement" (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES "User"(id), item_id TEXT NOT NULL REFERENCES "Product"(id),
 source TEXT NOT NULL CHECK(source IN ('purchase','admin')),
 provider_payment_id TEXT REFERENCES "Payment"("providerPaymentId"),
 status TEXT NOT NULL CHECK(status IN ('active','revoked')) DEFAULT 'active',
 granted_at TIMESTAMPTZ NOT NULL DEFAULT now(), revoked_at TIMESTAMPTZ, revoked_by TEXT, reason TEXT,
 CHECK ((source='purchase' AND provider_payment_id IS NOT NULL) OR (source='admin' AND provider_payment_id IS NULL)),
 UNIQUE(provider_payment_id,item_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS void_admin_entitlement ON "VoidEntitlement"(user_id,item_id) WHERE source='admin';
CREATE INDEX IF NOT EXISTS void_entitlement_user ON "VoidEntitlement"(user_id,status);
CREATE TABLE IF NOT EXISTS "VoidEquipped" (
 user_id TEXT NOT NULL REFERENCES "User"(id), slot TEXT NOT NULL, item_id TEXT NOT NULL REFERENCES "Product"(id),
 PRIMARY KEY(user_id,slot)
);
CREATE TABLE IF NOT EXISTS "VoidLauncherCode" (
 code_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES "User"(id), challenge TEXT NOT NULL,
 redirect_uri TEXT NOT NULL, expires_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS "VoidLauncherToken" (
 id TEXT PRIMARY KEY, token_hash TEXT UNIQUE NOT NULL, user_id TEXT NOT NULL REFERENCES "User"(id),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), expires_at TIMESTAMPTZ NOT NULL, last_used_at TIMESTAMPTZ, revoked_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS "VoidAudit" (
 id BIGSERIAL PRIMARY KEY, actor_id TEXT, player_id TEXT, item_id TEXT, action TEXT NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), reason TEXT
);
CREATE OR REPLACE FUNCTION void_audit_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Audit entries are append-only'; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='void_audit_immutable_trigger' AND tgrelid='"VoidAudit"'::regclass) THEN
 CREATE TRIGGER void_audit_immutable_trigger BEFORE UPDATE OR DELETE ON "VoidAudit" FOR EACH ROW EXECUTE FUNCTION void_audit_immutable();
END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='void_audit_no_truncate' AND tgrelid='"VoidAudit"'::regclass) THEN
 CREATE TRIGGER void_audit_no_truncate BEFORE TRUNCATE ON "VoidAudit" FOR EACH STATEMENT EXECUTE FUNCTION void_audit_immutable();
END IF; END $$;
INSERT INTO "VoidSchemaMigration"(id) VALUES('20261125_shared_discord') ON CONFLICT DO NOTHING;
COMMIT;
