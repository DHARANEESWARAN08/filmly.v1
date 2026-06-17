-- Set the search path to public
SET search_path TO public;

-- 1. Create Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    username TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on Profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Allow authenticated users to read only their own profile" ON profiles;
DROP POLICY IF EXISTS "Allow authenticated users to read profiles" ON profiles;
CREATE POLICY "Allow authenticated users to read profiles" ON profiles
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert their own profile" ON profiles;
CREATE POLICY "Allow authenticated users to insert their own profile" ON profiles
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Allow authenticated users to update only their own profile" ON profiles;
CREATE POLICY "Allow authenticated users to update only their own profile" ON profiles
    FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Allow authenticated users to delete only their own profile" ON profiles;
CREATE POLICY "Allow authenticated users to delete only their own profile" ON profiles
    FOR DELETE TO authenticated USING (auth.uid() = id);


-- 2. Create Reviews Table
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    movie_id INTEGER NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_user_movie_review UNIQUE (user_id, movie_id)
);

-- Enable RLS on Reviews
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Reviews Policies
DROP POLICY IF EXISTS "Allow authenticated users to read only their own reviews" ON reviews;
DROP POLICY IF EXISTS "Allow authenticated users to read reviews" ON reviews;
CREATE POLICY "Allow authenticated users to read reviews" ON reviews
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert their own reviews" ON reviews;
CREATE POLICY "Allow authenticated users to insert their own reviews" ON reviews
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow authenticated users to update only their own reviews" ON reviews;
CREATE POLICY "Allow authenticated users to update only their own reviews" ON reviews
    FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow authenticated users to delete only their own reviews" ON reviews;
CREATE POLICY "Allow authenticated users to delete only their own reviews" ON reviews
    FOR DELETE TO authenticated USING (auth.uid() = user_id);


-- 3. Create Favorites Table
CREATE TABLE IF NOT EXISTS favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    movie_id INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_user_movie_favorite UNIQUE (user_id, movie_id)
);

-- Enable RLS on Favorites
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- Favorites Policies
DROP POLICY IF EXISTS "Allow authenticated users to read only their own favorites" ON favorites;
CREATE POLICY "Allow authenticated users to read only their own favorites" ON favorites
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow authenticated users to insert their own favorites" ON favorites;
CREATE POLICY "Allow authenticated users to insert their own favorites" ON favorites
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow authenticated users to update only their own favorites" ON favorites;
CREATE POLICY "Allow authenticated users to update only their own favorites" ON favorites
    FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow authenticated users to delete only their own favorites" ON favorites;
CREATE POLICY "Allow authenticated users to delete only their own favorites" ON favorites
    FOR DELETE TO authenticated USING (auth.uid() = user_id);


-- 4. Create Watchlist Table
CREATE TABLE IF NOT EXISTS watchlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    movie_id INTEGER NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('want_to_watch', 'watching', 'watched')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_user_movie_watchlist UNIQUE (user_id, movie_id)
);

-- Enable RLS on Watchlist
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;

-- Watchlist Policies
DROP POLICY IF EXISTS "Allow authenticated users to read only their own watchlist" ON watchlist;
CREATE POLICY "Allow authenticated users to read only their own watchlist" ON watchlist
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow authenticated users to insert their own watchlist" ON watchlist;
CREATE POLICY "Allow authenticated users to insert their own watchlist" ON watchlist
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow authenticated users to update only their own watchlist" ON watchlist;
CREATE POLICY "Allow authenticated users to update only their own watchlist" ON watchlist
    FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow authenticated users to delete only their own watchlist" ON watchlist;
CREATE POLICY "Allow authenticated users to delete only their own watchlist" ON watchlist
    FOR DELETE TO authenticated USING (auth.uid() = user_id);


-- 5. Trigger function to automatically create a profile after successful signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
