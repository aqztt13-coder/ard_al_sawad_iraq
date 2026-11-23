import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  decodeJwtClaims,
  isAuthorizedAdminSession,
  isAuthorizedAdminUser,
  isValidPhotoStoragePath,
  MAX_RAW_UPLOAD_BYTES,
  validateImageUploadFile,
} from './adminAuth';

function makeFakeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.test-signature`;
}

function listFilesRecursive(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...listFilesRecursive(full));
    } else {
      results.push(full);
    }
  }
  return results;
}

/* ===========================
 * 1. Authentication & Role-Based Admin Authorization Tests
 * =========================== */
test('admin authorization rejects anonymous, regular authenticated users, and user_metadata spoofing', () => {
  assert.equal(isAuthorizedAdminUser(null), false);
  assert.equal(isAuthorizedAdminUser(undefined), false);
  assert.equal(isAuthorizedAdminSession(null), false);

  // Regular authenticated user with no admin role
  const regularUser = {
    id: 'user-regular-1',
    app_metadata: { provider: 'email' },
    user_metadata: { role: 'admin', is_admin: true, roles: ['admin'] }, // client-writable! Must be IGNORED
  };
  assert.equal(isAuthorizedAdminUser(regularUser), false);

  const regularSession = {
    access_token: makeFakeJwt({
      sub: 'user-regular-1',
      role: 'authenticated',
      app_metadata: { provider: 'email' },
      user_metadata: { role: 'admin', is_admin: true },
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: regularUser as never,
  };
  assert.equal(isAuthorizedAdminSession(regularSession), false);
});

test('admin authorization accepts trusted app_metadata and server-signed JWT custom claims, rejecting expired tokens', () => {
  const nowSec = 1_800_000_000;

  const adminByRole = {
    id: 'admin-1',
    app_metadata: { provider: 'email', role: 'admin' },
  };
  assert.equal(isAuthorizedAdminUser(adminByRole), true);

  const adminByRolesArray = {
    id: 'admin-2',
    app_metadata: { provider: 'email', roles: ['editor', 'admin'] },
  };
  assert.equal(isAuthorizedAdminUser(adminByRolesArray), true);

  const validSession = {
    access_token: makeFakeJwt({
      sub: 'admin-1',
      app_metadata: { role: 'admin' },
      exp: nowSec + 1200,
    }),
    expires_at: nowSec + 1200,
    user: adminByRole as never,
  };
  assert.equal(isAuthorizedAdminSession(validSession, nowSec), true);

  // Custom claim from Supabase Custom Access Token Hook (`app_role: 'admin'`)
  const hookClaimSession = {
    access_token: makeFakeJwt({
      sub: 'admin-3',
      app_role: 'admin',
      exp: nowSec + 1200,
    }),
    expires_at: nowSec + 1200,
    user: { id: 'admin-3', app_metadata: { provider: 'email' } } as never,
  };
  assert.equal(isAuthorizedAdminSession(hookClaimSession, nowSec), true);

  // Expired session must be rejected even if role is admin
  const expiredSession = {
    access_token: makeFakeJwt({
      sub: 'admin-1',
      app_metadata: { role: 'admin' },
      exp: nowSec - 10,
    }),
    expires_at: nowSec - 10,
    user: adminByRole as never,
  };
  assert.equal(isAuthorizedAdminSession(expiredSession, nowSec), false);
  assert.equal(decodeJwtClaims('not-a-jwt'), null);
});

test('public admin self-registration is removed from auth hook and login modal', () => {
  const authHook = fs.readFileSync(path.resolve('src/hooks/useSupabaseAuth.ts'), 'utf-8');
  const loginModal = fs.readFileSync(path.resolve('src/components/AdminLoginModal.tsx'), 'utf-8');

  assert.equal(/supabase\.auth\.signUp\s*\(/.test(authHook), false);
  assert.equal(/const\s+isAdmin\s*=\s*Boolean\(\s*user\s*\)/.test(authHook), false);
  assert.match(authHook, /isAuthorizedAdminSession/);
  assert.equal(/auth-tab-signup|onSignUp/.test(loginModal), false);
});

/* ===========================
 * 2. Database Access & Row Level Security (RLS) Policy Tests
 * =========================== */
test('SQL migrations enforce non-destructive RLS policies with trusted admin role checks', () => {
  const m1 = fs.readFileSync(
    path.resolve('supabase/migrations/202611220001_security_rls_and_storage.sql'),
    'utf-8'
  );
  const m2 = fs.readFileSync(
    path.resolve('supabase/migrations/202611220002_platform_data_tables.sql'),
    'utf-8'
  );
  const combined = `${m1}\n${m2}`;

  // Non-destructive requirement: no DROP TABLE or TRUNCATE
  assert.equal(/\bDROP\s+TABLE\b/i.test(combined), false);
  assert.equal(/\bTRUNCATE\b/i.test(combined), false);

  // Admin function inspects app_metadata / custom claims only, NEVER user_metadata
  assert.match(m1, /CREATE OR REPLACE FUNCTION public\.is_ard_alsawad_admin\(\)/);
  assert.match(m1, /auth\.jwt\(\)\s*->\s*'app_metadata'/);
  assert.equal(/auth\.jwt\(\)\s*->\s*'user_metadata'/i.test(m1), false);

  // RLS enabled on all core and platform tables
  const protectedTables = [
    'public.landmarks',
    'public.governorates_content',
    'public.visitor_reviews',
    'public.site_settings',
    'public.admin_audit_logs',
    'public.cultural_articles',
    'public.museum_artifacts',
    'public.tourism_services',
    'public.newsletter_subscribers',
  ];
  for (const table of protectedTables) {
    assert.match(
      combined,
      new RegExp(`ALTER TABLE ${table.replace('.', '\\.')} ENABLE ROW LEVEL SECURITY;`),
      `Expected RLS enabled on ${table}`
    );
  }

  // Landmarks & governorates write operations gated strictly by is_ard_alsawad_admin()
  assert.match(m1, /"landmarks_admin_insert"[\s\S]*?is_ard_alsawad_admin\(\)/);
  assert.match(m1, /"landmarks_admin_update"[\s\S]*?is_ard_alsawad_admin\(\)/);
  assert.match(m1, /"landmarks_admin_delete"[\s\S]*?is_ard_alsawad_admin\(\)/);
  assert.match(m1, /"governorates_content_admin_insert"[\s\S]*?is_ard_alsawad_admin\(\)/);
  assert.match(m1, /"governorates_content_admin_update"[\s\S]*?is_ard_alsawad_admin\(\)/);
  assert.match(m1, /"governorates_content_admin_delete"[\s\S]*?is_ard_alsawad_admin\(\)/);

  // Visitor reviews enforce pending moderation before publish
  assert.match(m2, /USING\s*\(status = 'approved' OR public\.is_ard_alsawad_admin\(\)\)/);
  assert.match(m2, /WITH CHECK\s*\(\s*status = 'pending'/);
  assert.match(m2, /CREATE OR REPLACE FUNCTION public\.report_visitor_review/);

  // Audit logs are append-only (no UPDATE or DELETE policy)
  assert.equal(/FOR\s+(UPDATE|DELETE)\s+ON\s+public\.admin_audit_logs/i.test(m2), false);

  // Newsletter subscribers cannot be read publicly
  assert.match(m2, /"newsletter_admin_read"[\s\S]*?is_ard_alsawad_admin\(\)/);
});

/* ===========================
 * 3. Storage Security Tests (`landmark-photos` bucket & client guards)
 * =========================== */
test('storage upload validation blocks SVGs, scripts, oversized files, and traversal paths', () => {
  assert.equal(
    validateImageUploadFile({ name: 'babylon.jpg', type: 'image/jpeg', size: 1024 * 500 }).ok,
    true
  );
  assert.equal(
    validateImageUploadFile({ name: 'marshes.webp', type: 'image/webp', size: 1024 * 200 }).ok,
    true
  );
  // Reject SVG (XSS vector)
  assert.equal(
    validateImageUploadFile({ name: 'xss.svg', type: 'image/svg+xml', size: 1024 }).ok,
    false
  );
  // Reject MIME/extension mismatch
  assert.equal(
    validateImageUploadFile({ name: 'payload.html', type: 'image/jpeg', size: 1024 }).ok,
    false
  );
  // Reject oversized file
  assert.equal(
    validateImageUploadFile({
      name: 'huge.jpg',
      type: 'image/jpeg',
      size: MAX_RAW_UPLOAD_BYTES + 1,
    }).ok,
    false
  );
  // Reject path traversal filename
  assert.equal(
    validateImageUploadFile({ name: '../evil.jpg', type: 'image/jpeg', size: 1024 }).ok,
    false
  );

  // Object path checks
  assert.equal(isValidPhotoStoragePath('landmarks/iq-0001/1700000-abc123.jpg'), true);
  assert.equal(isValidPhotoStoragePath('governorates/iq-gov-01/1700000-abc123.webp'), true);
  assert.equal(isValidPhotoStoragePath('landmarks/../secret/photo.jpg'), false);
  assert.equal(isValidPhotoStoragePath('avatars/user1/pic.jpg'), false);
  assert.equal(isValidPhotoStoragePath('landmarks/iq-0001/evil.svg'), false);

  // Verify Storage bucket SQL enforces admin-only writes & allowed MIME types
  const m1 = fs.readFileSync(
    path.resolve('supabase/migrations/202611220001_security_rls_and_storage.sql'),
    'utf-8'
  );
  assert.match(m1, /file_size_limit.*5242880/s);
  assert.match(m1, /ARRAY\['image\/jpeg', 'image\/png', 'image\/webp'\]/);
  assert.match(m1, /"landmark_photos_admin_insert"[\s\S]*?is_ard_alsawad_admin\(\)/);
  assert.match(m1, /"landmark_photos_admin_delete"[\s\S]*?is_ard_alsawad_admin\(\)/);
});

/* ===========================
 * 4. Credential Exposure & Secret Hygiene Tests
 * =========================== */
test('no hardcoded Supabase credentials, service-role keys, or secrets exist in frontend source', () => {
  const srcFiles = listFilesRecursive(path.resolve('src')).filter(
    (f) => /\.(ts|tsx|js|jsx|json)$/.test(f) && !f.endsWith('security.test.ts')
  );

  const forbiddenPatterns: Array<{ label: string; regex: RegExp }> = [
    { label: 'Hardcoded Supabase publishable key', regex: /sb_publishable_[A-Za-z0-9_-]+/ },
    { label: 'Hardcoded Supabase secret/service key', regex: /sb_secret_[A-Za-z0-9_-]+|service_role/i },
    { label: 'Hardcoded live Supabase project URL', regex: /ckurlrrxifyowuxyqpwe\.supabase\.co/i },
    { label: 'Hardcoded JWT credential', regex: /eyJhbGciOi[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/ },
  ];

  for (const file of srcFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    for (const { label, regex } of forbiddenPatterns) {
      assert.equal(
        regex.test(content),
        false,
        `${label} found in ${path.relative(process.cwd(), file)}`
      );
    }
  }

  const supabaseClientSource = fs.readFileSync(path.resolve('src/lib/supabase.ts'), 'utf-8');
  assert.match(supabaseClientSource, /import\.meta\.env\.VITE_SUPABASE_URL/);
  assert.match(supabaseClientSource, /import\.meta\.env\.VITE_SUPABASE_ANON_KEY/);
  assert.match(supabaseClientSource, /export const isSupabaseConfigured/);
});
