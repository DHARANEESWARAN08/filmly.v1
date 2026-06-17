-- Run this in Supabase SQL Editor if community reviews are hidden by RLS.
-- Users can read public profile names and reviews, but can still only write their own data.

SET search_path TO public;

DROP POLICY IF EXISTS "Allow authenticated users to read only their own profile" ON profiles;
DROP POLICY IF EXISTS "Allow authenticated users to read profiles" ON profiles;
CREATE POLICY "Allow authenticated users to read profiles" ON profiles
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to read only their own reviews" ON reviews;
DROP POLICY IF EXISTS "Allow authenticated users to read reviews" ON reviews;
CREATE POLICY "Allow authenticated users to read reviews" ON reviews
    FOR SELECT TO authenticated USING (true);
