-- ============================================================================
-- COREX: Initial Schema Migration
-- Description: Core database tables for the application
--
-- This migration creates:
-- 1. user_profiles - Extended user information linked to Supabase auth.users
-- 2. user_permissions - Fine-grained permission assignments
-- 3. api_keys - API key management for programmatic access
-- 4. audit_logs - System-wide audit trail
--
-- DEPENDENCY: Requires Supabase auth.users table
-- ============================================================================

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pg_trgm for text search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

-- User roles (matches src/types/entities.ts UserRole)
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('user', 'moderator', 'admin', 'super_admin');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- User status (matches src/types/entities.ts UserStatus)
DO $$ BEGIN
  CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended', 'pending');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Audit action types
DO $$ BEGIN
  CREATE TYPE audit_action AS ENUM (
    'create', 'read', 'update', 'delete',
    'login', 'logout', 'login_failed',
    'permission_granted', 'permission_revoked',
    'role_changed', 'api_key_created', 'api_key_revoked'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- USER PROFILES TABLE
-- Description: Extended user information linked to Supabase auth.users
-- 
-- This table extends the auth.users with application-specific data.
-- The user_id is a foreign key to auth.users(id).
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_profiles (
  -- Primary key matches auth.users(id)
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign key to Supabase auth.users
  -- ON DELETE CASCADE ensures profile is deleted when user is deleted
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Display information
  full_name VARCHAR(255),
  display_name VARCHAR(100),
  avatar_url TEXT,
  bio TEXT,
  
  -- Role and status (matches src/types/entities.ts)
  role user_role NOT NULL DEFAULT 'user',
  status user_status NOT NULL DEFAULT 'pending',
  
  -- Verification
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Activity tracking
  last_login_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ,
  login_count INTEGER NOT NULL DEFAULT 0,
  
  -- Preferences (JSON for flexibility)
  preferences JSONB NOT NULL DEFAULT '{
    "theme": "system",
    "locale": "en",
    "timezone": "UTC",
    "email_notifications": true,
    "push_notifications": false
  }'::jsonb,
  
  -- Custom metadata (extensible)
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add table comment
COMMENT ON TABLE user_profiles IS 'Extended user profiles linked to Supabase auth.users';
COMMENT ON COLUMN user_profiles.user_id IS 'Foreign key to auth.users(id)';
COMMENT ON COLUMN user_profiles.role IS 'User role for access control (user, moderator, admin, super_admin)';
COMMENT ON COLUMN user_profiles.status IS 'Account status (active, inactive, suspended, pending)';
COMMENT ON COLUMN user_profiles.preferences IS 'User preferences as JSON';

-- ============================================================================
-- USER PERMISSIONS TABLE
-- Description: Fine-grained permission assignments for users
-- 
-- Permissions are string identifiers matching src/server/security/types.ts
-- Examples: 'repos.view', 'repos.create', 'admin.access'
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign key to user_profiles
  user_id UUID NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  
  -- Permission identifier (e.g., 'repos.create', 'admin.access')
  permission VARCHAR(100) NOT NULL,
  
  -- Optional: Permission was granted by this admin
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Optional: Permission expires at this time
  expires_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure unique permission per user
  CONSTRAINT user_permissions_unique UNIQUE (user_id, permission)
);

-- Add table comment
COMMENT ON TABLE user_permissions IS 'Fine-grained permission assignments for users';
COMMENT ON COLUMN user_permissions.permission IS 'Permission identifier (e.g., repos.view, admin.access)';
COMMENT ON COLUMN user_permissions.expires_at IS 'Optional expiration time for temporary permissions';

-- ============================================================================
-- API KEYS TABLE
-- Description: API keys for programmatic access
-- 
-- Keys are hashed before storage for security.
-- The prefix is stored for identification (e.g., 'sk_live_abc123...').
-- ============================================================================

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Owner of the API key
  user_id UUID NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  
  -- Key identification
  name VARCHAR(100) NOT NULL,
  prefix VARCHAR(20) NOT NULL, -- First few chars for identification (e.g., 'sk_live_abc')
  key_hash VARCHAR(255) NOT NULL, -- SHA-256 hash of the actual key
  
  -- Permissions (null = inherit user permissions)
  permissions TEXT[], -- Array of permission strings
  
  -- Rate limiting
  rate_limit INTEGER, -- Requests per minute (null = default)
  
  -- Usage tracking
  last_used_at TIMESTAMPTZ,
  usage_count BIGINT NOT NULL DEFAULT 0,
  
  -- Expiration
  expires_at TIMESTAMPTZ,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure unique prefix
  CONSTRAINT api_keys_prefix_unique UNIQUE (prefix)
);

-- Add table comment
COMMENT ON TABLE api_keys IS 'API keys for programmatic access';
COMMENT ON COLUMN api_keys.prefix IS 'Key prefix for identification (e.g., sk_live_abc)';
COMMENT ON COLUMN api_keys.key_hash IS 'SHA-256 hash of the API key';
COMMENT ON COLUMN api_keys.permissions IS 'Optional permission override (null = inherit user permissions)';

-- ============================================================================
-- AUDIT LOGS TABLE
-- Description: System-wide audit trail for security and compliance
-- 
-- Records all significant actions in the system.
-- Immutable - no updates or deletes allowed via RLS.
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Actor (who performed the action)
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
  
  -- Action details
  action audit_action NOT NULL,
  resource_type VARCHAR(100) NOT NULL, -- e.g., 'user', 'repository', 'api_key'
  resource_id VARCHAR(255), -- ID of the affected resource
  
  -- Request context
  request_id VARCHAR(100), -- Correlation ID
  ip_address INET,
  user_agent TEXT,
  
  -- Details
  details JSONB NOT NULL DEFAULT '{}'::jsonb, -- Additional context
  
  -- Result
  success BOOLEAN NOT NULL DEFAULT TRUE,
  error_message TEXT,
  
  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add table comment
COMMENT ON TABLE audit_logs IS 'System-wide audit trail for security and compliance';
COMMENT ON COLUMN audit_logs.action IS 'Type of action performed';
COMMENT ON COLUMN audit_logs.resource_type IS 'Type of resource affected (e.g., user, repository)';
COMMENT ON COLUMN audit_logs.details IS 'Additional context as JSON';

-- ============================================================================
-- INDEXES
-- ============================================================================

-- user_profiles indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_status ON user_profiles(status);
CREATE INDEX IF NOT EXISTS idx_user_profiles_created_at ON user_profiles(created_at DESC);

-- user_permissions indexes
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_permission ON user_permissions(permission);

-- api_keys indexes
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active) WHERE is_active = TRUE;

-- audit_logs indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_request_id ON audit_logs(request_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for user_profiles
CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to create user profile on auth.users insert
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (user_id, full_name, avatar_url, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url',
    'pending'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profile when user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES: user_profiles
-- ============================================================================

-- Users can view their own profile
CREATE POLICY user_profiles_select_own ON user_profiles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can view all profiles
CREATE POLICY user_profiles_select_admin ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Users can update their own profile (except role/status)
CREATE POLICY user_profiles_update_own ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Only admins can update roles/status
CREATE POLICY user_profiles_update_admin ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Service role can do everything
CREATE POLICY user_profiles_service_all ON user_profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- RLS POLICIES: user_permissions
-- ============================================================================

-- Users can view their own permissions
CREATE POLICY user_permissions_select_own ON user_permissions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can view all permissions
CREATE POLICY user_permissions_select_admin ON user_permissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Only admins can manage permissions
CREATE POLICY user_permissions_manage_admin ON user_permissions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Service role can do everything
CREATE POLICY user_permissions_service_all ON user_permissions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- RLS POLICIES: api_keys
-- ============================================================================

-- Users can view their own API keys
CREATE POLICY api_keys_select_own ON api_keys
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can create their own API keys
CREATE POLICY api_keys_insert_own ON api_keys
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update/delete their own API keys
CREATE POLICY api_keys_update_own ON api_keys
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY api_keys_delete_own ON api_keys
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Service role can do everything
CREATE POLICY api_keys_service_all ON api_keys
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- RLS POLICIES: audit_logs
-- ============================================================================

-- Users can view their own audit logs
CREATE POLICY audit_logs_select_own ON audit_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can view all audit logs
CREATE POLICY audit_logs_select_admin ON audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Only service role can insert (no user can directly insert)
CREATE POLICY audit_logs_insert_service ON audit_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- No one can update or delete audit logs (immutable)
-- Service role is the only one with all access
CREATE POLICY audit_logs_service_all ON audit_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

/**
 * Get user's effective permissions
 * Combines role-based permissions with individual grants
 */
CREATE OR REPLACE FUNCTION get_user_permissions(p_user_id UUID)
RETURNS TEXT[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role user_role;
  v_permissions TEXT[];
BEGIN
  -- Get user's role
  SELECT role INTO v_role
  FROM user_profiles
  WHERE user_id = p_user_id;
  
  IF v_role IS NULL THEN
    RETURN ARRAY[]::TEXT[];
  END IF;
  
  -- Start with role-based permissions
  CASE v_role
    WHEN 'super_admin' THEN
      v_permissions := ARRAY[
        'repos.view', 'repos.create', 'repos.update', 'repos.delete', 'repos.refresh',
        'rankings.view', 'rankings.compute',
        'users.view', 'users.create', 'users.update', 'users.delete', 'users.change_role',
        'system.view_logs', 'system.view_jobs', 'system.manage_jobs', 'system.settings',
        'admin.access', 'admin.users', 'admin.system'
      ];
    WHEN 'admin' THEN
      v_permissions := ARRAY[
        'repos.view', 'repos.create', 'repos.update', 'repos.delete', 'repos.refresh',
        'rankings.view', 'rankings.compute',
        'users.view', 'users.create', 'users.update',
        'system.view_logs', 'system.view_jobs',
        'admin.access'
      ];
    WHEN 'moderator' THEN
      v_permissions := ARRAY[
        'repos.view', 'repos.create', 'repos.update',
        'rankings.view',
        'users.view'
      ];
    ELSE -- 'user'
      v_permissions := ARRAY[
        'repos.view',
        'rankings.view'
      ];
  END CASE;
  
  -- Add individual permission grants
  SELECT array_agg(DISTINCT permission) INTO v_permissions
  FROM (
    SELECT unnest(v_permissions) AS permission
    UNION
    SELECT permission
    FROM user_permissions
    WHERE user_id = p_user_id
      AND (expires_at IS NULL OR expires_at > NOW())
  ) combined;
  
  RETURN COALESCE(v_permissions, ARRAY[]::TEXT[]);
END;
$$;

COMMENT ON FUNCTION get_user_permissions IS 'Get all effective permissions for a user (role-based + individual grants)';

/**
 * Check if a user has a specific permission
 */
CREATE OR REPLACE FUNCTION user_has_permission(p_user_id UUID, p_permission TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN p_permission = ANY(get_user_permissions(p_user_id));
END;
$$;

COMMENT ON FUNCTION user_has_permission IS 'Check if a user has a specific permission';

/**
 * Log an audit event
 */
CREATE OR REPLACE FUNCTION log_audit_event(
  p_user_id UUID,
  p_action audit_action,
  p_resource_type VARCHAR(100),
  p_resource_id VARCHAR(255) DEFAULT NULL,
  p_details JSONB DEFAULT '{}'::jsonb,
  p_success BOOLEAN DEFAULT TRUE,
  p_error_message TEXT DEFAULT NULL,
  p_request_id VARCHAR(100) DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO audit_logs (
    user_id, action, resource_type, resource_id,
    details, success, error_message,
    request_id, ip_address, user_agent
  ) VALUES (
    p_user_id, p_action, p_resource_type, p_resource_id,
    p_details, p_success, p_error_message,
    p_request_id, p_ip_address, p_user_agent
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

COMMENT ON FUNCTION log_audit_event IS 'Log an audit event to the audit_logs table';
