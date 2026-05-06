CREATE TABLE IF NOT EXISTS ml_commercial.admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username varchar(255) NOT NULL UNIQUE,
  password_hash varchar(255) NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
