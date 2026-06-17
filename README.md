# Filmly

Filmly is a modern movie companion app built with Expo, React Native, and TypeScript. It uses a dark cinematic UI, TMDB movie data, local profile storage, and LAN review sync for sharing reviews across the laptop and phone during demos.

## Features

- Discover homepage with Popular, Upcoming, Top Rated, and Genre sections
- TMDB API consumption for lists, search, details, posters, backdrops, and cast
- Dynamic movie search
- Movie details with poster, title, rating, release date, runtime, genres, overview, trailer, and cast
- Favorites, Want to Watch, Watching, and Watched collections
- Personal reviews and 1-5 star ratings
- Profile dashboard with watched, review, and favorite counts
- AsyncStorage persistence through a backend-style service layer
- Username and password profiles with separate favorites, lists, and reviews
- Local review sync server for community reviews on the same network
- Loading, empty, and fallback states

## Architecture

```text
src/
  components/   Reusable UI pieces
  config/       API/auth configuration
  context/      App state, auth state, and user actions
  data/         Offline fallback movie data
  screens/      Discover, Search, Details, Profile
  services/     TMDB API, auth boundary, persistence boundary
  theme/        Color and spacing tokens
  types/        Shared TypeScript contracts
  utils/        Formatting helpers
```

## Run Locally

```bash
npm install
npm start
```

Then scan the Expo QR code with Expo Go, or run:

```bash
npm run android
```

## Supabase Backend & Database Setup

This project uses **Supabase** for user authentication and database storage.

### 1. Environment Variables

Create a `.env` file in the root of the project (this is ignored by Git) and populate it with your Supabase credentials:

```env
EXPO_PUBLIC_SUPABASE_URL=https://rlofflbmloqscmzkrpie.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

### 2. SQL Schema

Execute the following SQL commands in your Supabase project's **SQL Editor** to create the tables, enable Row Level Security (RLS), and configure policies:

```sql
-- Create profiles table linked to auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    username TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Allow users to insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Allow users to update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Create reviews table
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    movie_id INTEGER NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_user_movie_review UNIQUE (user_id, movie_id)
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Allow authenticated users to insert their own reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow users to update their own reviews" ON public.reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Allow users to delete their own reviews" ON public.reviews FOR DELETE USING (auth.uid() = user_id);

-- Create favorites table
CREATE TABLE IF NOT EXISTS public.favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    movie_id INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_user_movie_favorite UNIQUE (user_id, movie_id)
);

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to favorites" ON public.favorites FOR SELECT USING (true);
CREATE POLICY "Allow authenticated users to insert their own favorites" ON public.favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow users to delete their own favorites" ON public.favorites FOR DELETE USING (auth.uid() = user_id);

-- Create watchlist table
CREATE TABLE IF NOT EXISTS public.watchlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    movie_id INTEGER NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('want_to_watch', 'watching', 'watched')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_user_movie_watchlist UNIQUE (user_id, movie_id)
);

ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to watchlist" ON public.watchlist FOR SELECT USING (true);
CREATE POLICY "Allow authenticated users to insert/update their own watchlist" ON public.watchlist FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow users to update their own watchlist" ON public.watchlist FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Allow users to delete their own watchlist" ON public.watchlist FOR DELETE USING (auth.uid() = user_id);

-- Trigger function to automatically create a profile after signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

## APK Build

This project includes `eas.json` for APK builds:

```bash
npm install -g eas-cli
eas login
eas build --platform android --profile preview
```

For GitHub Releases, add an `EXPO_TOKEN` secret and run the `Android APK Release` workflow from GitHub Actions.
