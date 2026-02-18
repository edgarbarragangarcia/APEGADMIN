-- Migration: Add avatar_url column to profiles table
-- This migration adds the avatar_url column and migrates existing photo data

-- Step 1: Add avatar_url column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Step 2: Add comment to explain the column
COMMENT ON COLUMN profiles.avatar_url IS 'URL to user profile avatar image stored in Supabase Storage';

-- Step 3: Migrate existing id_photo_url data to avatar_url
UPDATE profiles
SET avatar_url = id_photo_url
WHERE id_photo_url IS NOT NULL AND id_photo_url != '';

-- Step 4: Create or update the get_all_profiles function
CREATE OR REPLACE FUNCTION get_all_profiles(
    search_query TEXT DEFAULT '',
    page_num INT DEFAULT 1,
    page_size INT DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    full_name TEXT,
    email TEXT,
    phone TEXT,
    handicap NUMERIC,
    updated_at TIMESTAMPTZ,
    is_premium BOOLEAN,
    avatar_url TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.full_name,
        p.email,
        p.phone,
        p.handicap,
        p.updated_at,
        p.is_premium,
        p.avatar_url
    FROM profiles p
    WHERE 
        (search_query = '' OR 
         p.full_name ILIKE '%' || search_query || '%' OR
         p.email ILIKE '%' || search_query || '%' OR
         p.phone ILIKE '%' || search_query || '%')
    ORDER BY p.updated_at DESC
    LIMIT page_size
    OFFSET (page_num - 1) * page_size;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
