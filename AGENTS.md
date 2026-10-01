This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Navigation uses **React Navigation** (NOT Expo Router — explicit architectural decision; do not migrate). There is no `src/app/` directory.
- `src/navigation/RootNavigator.tsx` — root native stack, gated on the persisted `userRole`: `Onboarding` (role selection) until a role is chosen, then `Main` (tab navigator). `Paywall` and `Pairing` are full-screen modals registered unconditionally; Pairing doubles as an onboarding step via route params (`{ context: 'onboarding', role }`).
- `src/navigation/AppNavigator.tsx` — bottom tabs: `Today` (renders Her or Partner dashboard based on `userRole`), `PartnerGuide`, `Settings`.
- Route params are typed in `src/navigation/types.ts` (`RootStackParamList`, `MainTabParamList`). Navigate with `useNavigation<NavigationProp<RootStackParamList>>()` from `@react-navigation/native`.
- Screens must use the shared `Screen` component (`src/components/Screen.tsx`) as their root so safe-area insets are respected on edge-to-edge Android.
- Docs: https://reactnavigation.org/docs/getting-started

## Backend (Supabase)

- Schema lives in `supabase/schema.sql` — paste it into the Supabase SQL editor. RLS policies are wide open (prototype only; tighten before production).
- Required env vars: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` (and `EXPO_PUBLIC_REVENUECAT_API_KEY` for IAP in dev builds).
- Without the Supabase env vars the app runs in offline demo mode: pairing/sync calls no-op and everything stays local.
- Auth is anonymous device IDs (`src/utils/deviceId.ts`), stored in AsyncStorage — no login flow.
- Sync architecture: store actions push updates via `src/services/coupleSync.ts`; `src/hooks/useSupabaseSync.ts` (mounted in `App.tsx`) subscribes to the `couples` row and applies remote changes via `applyRemoteCouple`, which never pushes back (no realtime loops).
- Docs: https://supabase.com/docs/guides/realtime/postgres-changes

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
