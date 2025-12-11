-- =====================================================
-- Performance Optimization: Missing Indexes
-- =====================================================
-- Based on pg_stat_user_tables analysis showing:
-- - participants: 6,448 sequential scans (CRITICAL)
-- - campaigns: 1,737 sequential scans (HIGH)
-- - email_logs/participant_emails: 504 sequential scans
-- - email_config: 261 sequential scans, 0 index usage
-- =====================================================

-- =====================================================
-- PARTICIPANTS TABLE INDEXES
-- Resolves: 6,448 full table scans
-- =====================================================

-- Composite index for common query pattern: event + email lookup
-- Used in: duplicate checking, participant lookup by email within event
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_participants_event_email 
ON participants("eventId", email);

-- Composite index for event + registration date (sorting/filtering)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_participants_event_registered 
ON participants("eventId", "registeredAt" DESC);

-- Lower-case email index for case-insensitive lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_participants_email_lower 
ON participants(LOWER(email));

-- =====================================================
-- CAMPAIGNS TABLE INDEXES
-- Resolves: 1,737 full table scans
-- =====================================================

-- Composite index for common query: event + status filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaigns_event_status 
ON campaigns(event_id, status);

-- Index for template lookups (foreign key)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaigns_template_id 
ON campaigns(template_id) 
WHERE template_id IS NOT NULL;

-- Index for user/creator filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaigns_created_by 
ON campaigns(created_by) 
WHERE created_by IS NOT NULL;

-- Composite index for dashboard queries: event + created_at
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaigns_event_created 
ON campaigns(event_id, created_at DESC);

-- =====================================================
-- PARTICIPANT_EMAILS TABLE INDEXES
-- Resolves: 504 full table scans
-- =====================================================

-- Composite index for event-scoped email history queries
-- Requires join through participants, but helps with participant lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_participant_emails_status_sent 
ON participant_emails(status, sent_at DESC);

-- Index for tracking updates (opened/clicked)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_participant_emails_tracking 
ON participant_emails(id) 
WHERE status IN ('sent', 'opened');

-- =====================================================
-- EMAIL_CONFIG TABLE INDEXES
-- Resolves: 261 full table scans, 0 index usage
-- =====================================================

-- Index for provider filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_config_provider 
ON email_config(provider);

-- Index for active config lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_config_active 
ON email_config(is_active) 
WHERE is_active = true;

-- =====================================================
-- EMAIL_TEMPLATES TABLE INDEXES
-- Foreign key optimization
-- =====================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_templates_event_id 
ON email_templates(event_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_templates_type 
ON email_templates(type) 
WHERE type IS NOT NULL;

-- =====================================================
-- AGENDA_ITEMS TABLE INDEXES
-- Optimize attendance/check-in queries
-- =====================================================

-- Composite for event + time range queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agenda_items_event_time 
ON agenda_items("eventId", "startTime", "endTime");

-- =====================================================
-- SEATING TABLES INDEXES
-- Run only if tables exist - wrapped in DO block
-- =====================================================

DO $$
BEGIN
  -- Seating assignments by event
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'seating_assignments' AND table_schema = 'public') THEN
    CREATE INDEX IF NOT EXISTS idx_seating_assignments_event ON seating_assignments(event_id);
    CREATE INDEX IF NOT EXISTS idx_seating_assignments_participant ON seating_assignments(participant_id);
  END IF;
  
  -- Seating tables by event
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'seating_tables' AND table_schema = 'public') THEN
    CREATE INDEX IF NOT EXISTS idx_seating_tables_event ON seating_tables(event_id);
  END IF;
END $$;

-- =====================================================
-- BADGE_TEMPLATES & RBAC INDEXES
-- Wrapped in DO block for safety
-- =====================================================

DO $$
BEGIN
  -- Badge templates
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'badge_templates' AND table_schema = 'public') THEN
    CREATE INDEX IF NOT EXISTS idx_badge_templates_event_id ON badge_templates(event_id);
  END IF;
  
  -- User profiles (RBAC)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles' AND table_schema = 'public') THEN
    CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
  END IF;
  
  -- User event roles (RBAC) - critical for RLS performance
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_event_roles' AND table_schema = 'public') THEN
    CREATE INDEX IF NOT EXISTS idx_user_event_roles_user_event ON user_event_roles(user_id, event_id);
    CREATE INDEX IF NOT EXISTS idx_user_event_roles_event ON user_event_roles(event_id);
  END IF;
END $$;

-- =====================================================
-- FUNCTION SEARCH PATH SECURITY FIX
-- Resolves: "Function Search Path Mutable" warnings
-- =====================================================

-- Fix cleanup_old_events function
CREATE OR REPLACE FUNCTION cleanup_old_events(days_old INTEGER DEFAULT 90)
RETURNS INTEGER 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM events
    WHERE "createdAt" < (NOW() - INTERVAL '1 day' * days_old)::TEXT
    RETURNING count(*) INTO deleted_count;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Fix update_campaigns_updated_at function
CREATE OR REPLACE FUNCTION update_campaigns_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fix update_email_config_updated_at function
CREATE OR REPLACE FUNCTION update_email_config_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fix update_participant_emails_updated_at function
CREATE OR REPLACE FUNCTION update_participant_emails_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fix get_campaign_participants function
CREATE OR REPLACE FUNCTION get_campaign_participants(
  p_event_id TEXT,
  p_target_type TEXT,
  p_target_filter JSONB DEFAULT '{}',
  p_target_participant_ids TEXT[] DEFAULT '{}'
)
RETURNS TABLE (
  id TEXT,
  name TEXT,
  email TEXT,
  phone TEXT,
  company TEXT,
  "position" TEXT
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_target_type = 'manual' THEN
    RETURN QUERY
    SELECT p.id, p.name, p.email, p.phone, p.company, p."position"
    FROM participants p
    WHERE p."eventId" = p_event_id
      AND p.id = ANY(p_target_participant_ids);
  ELSIF p_target_type = 'filtered' THEN
    RETURN QUERY
    SELECT p.id, p.name, p.email, p.phone, p.company, p."position"
    FROM participants p
    WHERE p."eventId" = p_event_id
      AND (
        (p_target_filter->>'company' IS NULL OR p.company = p_target_filter->>'company')
        AND (p_target_filter->>'position' IS NULL OR p."position" = p_target_filter->>'position')
      );
  ELSE
    RETURN QUERY
    SELECT p.id, p.name, p.email, p.phone, p.company, p."position"
    FROM participants p
    WHERE p."eventId" = p_event_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Fix update_campaign_progress function
CREATE OR REPLACE FUNCTION update_campaign_progress(
  p_campaign_id UUID,
  p_sent_increment INTEGER DEFAULT 0,
  p_failed_increment INTEGER DEFAULT 0
)
RETURNS void
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE campaigns
  SET 
    sent_count = sent_count + p_sent_increment,
    failed_count = failed_count + p_failed_increment,
    pending_count = total_recipients - (sent_count + p_sent_increment + failed_count + p_failed_increment),
    status = CASE 
      WHEN (sent_count + p_sent_increment + failed_count + p_failed_increment) >= total_recipients 
      THEN 'completed'
      ELSE status
    END,
    completed_at = CASE
      WHEN (sent_count + p_sent_increment + failed_count + p_failed_increment) >= total_recipients 
      THEN NOW()
      ELSE completed_at
    END
  WHERE id = p_campaign_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ANALYZE TABLES
-- Update statistics for query planner after index creation
-- =====================================================

ANALYZE participants;
ANALYZE campaigns;
ANALYZE participant_emails;
ANALYZE email_config;
ANALYZE email_templates;
ANALYZE agenda_items;
ANALYZE events;

-- =====================================================
-- VERIFICATION QUERY
-- Run this to verify indexes were created
-- =====================================================

SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('participants', 'campaigns', 'participant_emails', 'email_config', 'email_templates')
ORDER BY tablename, indexname;
