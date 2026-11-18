CREATE TABLE admin_accounts (
  email TEXT PRIMARY KEY CHECK (email = LOWER(email)),
  password_hash TEXT NOT NULL CHECK (password_hash LIKE 'scrypt:%'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Developer-managed initial admin. Generate replacements with `npm run admin:hash -- <password>`.
INSERT INTO admin_accounts (email, password_hash)
VALUES (
  'admin@knot.dev',
  'scrypt:b76b32638d95b9876d86e9d4a97e8b83:a9ad278220c14a090969e9343a7375aaa1f3ea7b11d3da1c127b03bdd739a3bbbf185317ec2b45c1411ac7b9d75b2c4b3e4b3a443095ed57b124d74cf302e62d'
)
ON CONFLICT (email) DO NOTHING;
