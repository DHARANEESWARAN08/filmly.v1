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

## API, Login, And Review Sync

- TMDB key is currently configured in `src/config/env.ts`.
- Users sign in with a username and password. New usernames create a local profile automatically.
- Shared community reviews use the local sync server in `server.js`.
- Set `reviewSyncUrl` in `src/config/env.ts` to the laptop network URL, then run:

```bash
npm run server
```

- In a second terminal, run the Expo app:

```bash
npm start
```

## APK Build

This project includes `eas.json` for APK builds:

```bash
npm install -g eas-cli
eas login
eas build --platform android --profile preview
```

For GitHub Releases, add an `EXPO_TOKEN` secret and run the `Android APK Release` workflow from GitHub Actions.
