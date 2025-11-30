-- Migration: Secure Store Config Function
-- Purpose: Replace direct Service Role Key access with a secure PostgreSQL function
-- Bible Reference: Section 13.3 (Security Hardening)

CREATE OR REPLACE FUNCTION get_store_config(
    _store_id uuid
)
RETURNS TABLE (
    shadow_mode boolean,
    api_key text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only return data if the store is not soft-deleted (Bible 12.3)
    RETURN QUERY
    SELECT
        s.shadow_mode,
        s.api_key
    FROM
        public.stores s
    WHERE
        s.id = _store_id
        AND s.deleted_at IS NULL;
END;
$$;

-- Security Note: 
-- This function uses SECURITY DEFINER to run with the privileges of the function owner.
-- A dedicated Supabase Role should be created that ONLY has EXECUTE permission on this function.
-- This prevents the Next.js API from needing direct SELECT access to the stores table.
