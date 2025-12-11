-- =====================================================
-- Performance Optimization: Missing Indexes
-- =====================================================
-- RUN THIS DIRECTLY IN SUPABASE SQL EDITOR
-- =====================================================

-- PARTICIPANTS TABLE INDEXES (6,448 seq scans)
CREATE INDEX IF NOT EXISTS idx_participants_event_email 
ON participants("eventId", email);

CREATE INDEX IF NOT EXISTS idx_participants_event_registered 
ON participants("eventId", "registeredAt" DESC);

CREATE INDEX IF NOT EXISTS idx_participants_email_lower 
ON participants(LOWER(email));

-- CAMPAIGNS TABLE INDEXES (1,737 seq scans)
CREATE INDEX IF NOT EXISTS idx_campaigns_event_status 
ON campaigns(event_id, status);

CREATE INDEX IF NOT EXISTS idx_campaigns_template_id 
ON campaigns(template_id) 
WHERE template_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_campaigns_created_by 
ON campaigns(created_by) 
WHERE created_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_campaigns_event_created 
ON campaigns(event_id, created_at DESC);

-- PARTICIPANT_EMAILS TABLE INDEXES (504 seq scans)
CREATE INDEX IF NOT EXISTS idx_participant_emails_status_sent 
ON participant_emails(status, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_participant_emails_tracking 
ON participant_emails(id) 
WHERE status IN ('sent', 'opened');

-- EMAIL_CONFIG TABLE INDEXES (261 seq scans)
CREATE INDEX IF NOT EXISTS idx_email_config_provider 
ON email_config(provider);

CREATE INDEX IF NOT EXISTS idx_email_config_active 
ON email_config(is_active) 
WHERE is_active = true;

-- EMAIL_TEMPLATES TABLE INDEXES
CREATE INDEX IF NOT EXISTS idx_email_templates_event_id 
ON email_templates(event_id);

CREATE INDEX IF NOT EXISTS idx_email_templates_type 
ON email_templates(type) 
WHERE type IS NOT NULL;

-- AGENDA_ITEMS TABLE INDEXES
CREATE INDEX IF NOT EXISTS idx_agenda_items_event_time 
ON agenda_items("eventId", "startTime", "endTime");

-- SEATING & BADGE & RBAC INDEXES (conditional)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'seat_assignments' AND table_schema = 'public') THEN
    CREATE INDEX IF NOT EXISTS idx_seat_assignments_table ON seat_assignments(table_id);
    CREATE INDEX IF NOT EXISTS idx_seat_assignments_participant ON seat_assignments(participant_id);
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'seating_tables' AND table_schema = 'public') THEN
    CREATE INDEX IF NOT EXISTS idx_seating_tables_layout ON seating_tables(layout_id);
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'seating_layouts' AND table_schema = 'public') THEN
    CREATE INDEX IF NOT EXISTS idx_seating_layouts_event ON seating_layouts(event_id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'badge_templates' AND table_schema = 'public') THEN
    CREATE INDEX IF NOT EXISTS idx_badge_templates_event_id ON badge_templates(event_id);
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles' AND table_schema = 'public') THEN
    CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
    CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_event_access' AND table_schema = 'public') THEN
    CREATE INDEX IF NOT EXISTS idx_user_event_access_user_event ON user_event_access(user_id, event_id);
    CREATE INDEX IF NOT EXISTS idx_user_event_access_event ON user_event_access(event_id);
  END IF;
END $$;

-- FUNCTION SECURITY FIXES
CREATE OR REPLACE FUNCTION cleanup_old_events(days_old INTEGER DEFAULT 90)
RETURNS INTEGER SECURITY DEFINER SET search_path = public AS $$
DECLARE deleted_count INTEGER;
BEGIN
    DELETE FROM events WHERE "createdAt" < (NOW() - INTERVAL '1 day' * days_old)::TEXT
    RETURNING count(*) INTO deleted_count;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_campaigns_updated_at()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_email_config_updated_at()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_participant_emails_updated_at()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- Drop first to allow return type change
DROP FUNCTION IF EXISTS get_campaign_participants(TEXT, TEXT, JSONB, TEXT[]);

CREATE FUNCTION get_campaign_participants(
  p_event_id TEXT, p_target_type TEXT,
  p_target_filter JSONB DEFAULT '{}', p_target_participant_ids TEXT[] DEFAULT '{}'
) RETURNS TABLE (id TEXT, name TEXT, email TEXT, phone TEXT, company TEXT, "position" TEXT)
SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_target_type = 'manual' THEN
    RETURN QUERY SELECT p.id, p.name, p.email, p.phone, p.company, p."position"
    FROM participants p WHERE p."eventId" = p_event_id AND p.id = ANY(p_target_participant_ids);
  ELSIF p_target_type = 'filtered' THEN
    RETURN QUERY SELECT p.id, p.name, p.email, p.phone, p.company, p."position"
    FROM participants p WHERE p."eventId" = p_event_id
      AND (p_target_filter->>'company' IS NULL OR p.company = p_target_filter->>'company')
      AND (p_target_filter->>'position' IS NULL OR p."position" = p_target_filter->>'position');
  ELSE
    RETURN QUERY SELECT p.id, p.name, p.email, p.phone, p.company, p."position"
    FROM participants p WHERE p."eventId" = p_event_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_campaign_progress(
  p_campaign_id UUID, p_sent_increment INTEGER DEFAULT 0, p_failed_increment INTEGER DEFAULT 0
) RETURNS void SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE campaigns SET 
    sent_count = sent_count + p_sent_increment,
    failed_count = failed_count + p_failed_increment,
    pending_count = total_recipients - (sent_count + p_sent_increment + failed_count + p_failed_increment),
    status = CASE WHEN (sent_count + p_sent_increment + failed_count + p_failed_increment) >= total_recipients THEN 'completed' ELSE status END,
    completed_at = CASE WHEN (sent_count + p_sent_increment + failed_count + p_failed_increment) >= total_recipients THEN NOW() ELSE completed_at END
  WHERE id = p_campaign_id;
END;
$$ LANGUAGE plpgsql;

-- UPDATE STATISTICS
ANALYZE participants;
ANALYZE campaigns;
ANALYZE participant_emails;
ANALYZE email_config;
ANALYZE email_templates;
ANALYZE agenda_items;
ANALYZE events;

-- VERIFY
SELECT tablename, indexname FROM pg_indexes 
WHERE schemaname = 'public' AND tablename IN ('participants', 'campaigns', 'participant_emails', 'email_config')
ORDER BY tablename, indexname;
