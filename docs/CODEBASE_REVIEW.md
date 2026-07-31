# Hyre Mobile Codebase Review

Review date: February 2025  
Skills used: expo-deployment, expo-dev-client, building-native-ui, native-data-fetching, expo-tailwind-setup

**Status:** Implemented improvements as of latest update.

---

## Part 1: Critical Issues (App Store Submission)

### 1. ~~No EAS Configuration~~ ✅ Implemented

- Created `eas.json` with development, preview, and production profiles.

### 2. ~~iOS Export Compliance~~ ✅ Implemented

- Added `usesNonExemptEncryption: false` in `app.config.js` under `ios.config`.

### 3. Bundle Identifier for Production

- **Remaining:** Update `com.anonymous.hyremobile` in `app.config.js` when ready for production.

### 4. ~~NSAllowsLocalNetworking in Production~~ ✅ Implemented

- `app.config.js` gates `NSAllowsLocalNetworking` by `EAS_BUILD_PROFILE`—only enabled when not building production.

### 5. App Store Connect Prerequisites

- Create the app in App Store Connect before first submission.
- Configure Apple credentials: `eas credentials -p ios`
- Provide demo account if login is required for reviewers.
- Add privacy policy URL in App Store Connect.

---

## Part 2: Prioritized Improvements

### Routing & Navigation

| Priority | Issue | Recommendation |
|----------|-------|----------------|
| High | Using JS Tabs instead of NativeTabs | building-native-ui recommends `NativeTabs` from `expo-router/unstable-native-tabs` for best iOS experience (liquid glass, native feel). Consider migrating when targeting SDK 54+. |
| Medium | Stack.Screen indentation | Minor: Fix indentation in `app/_layout.tsx` for consistency. |
| Low | Route structure | App directory is clean—no co-located components. Routes follow conventions. |

### Data Fetching & API Calls

| Priority | Issue | Recommendation |
|----------|-------|----------------|
| High | No auth token on API client | Car search and categories use `getJson` without `Authorization`. If any endpoints require auth, add an authenticated fetch wrapper that attaches the token from `getSavedAuthToken()`. |
| Medium | No offline awareness | native-data-fetching recommends syncing React Query with `NetInfo` via `onlineManager.setEventListener` so queries pause when offline. |
| Medium | Error handling in UI | Search and booking hero show generic "Failed to load" messages. Consider retry buttons and more specific error messages. |
| Low | Request cancellation | React Query cancels on unmount by default. For raw `fetch` calls outside React Query, use `AbortController`. |

**What’s done well:**

- Uses `fetch` (not axios).
- React Query with `staleTime` and `retry`.
- `ApiError` class with status and code.
- `EXPO_PUBLIC_API_BASE_URL` for config.
- Tokens stored in `expo-secure-store`.
- Timeout handling in `apiRequest`.

### NativeWind / Tailwind Setup

| Priority | Issue | Recommendation |
|----------|-------|----------------|
| Low | Tailwind v3 vs v4 | Project uses NativeWind v4 + Tailwind v3. expo-tailwind-setup describes Tailwind v4 + NativeWind v5. Current setup is valid; consider v4/v5 when ready to upgrade. |
| Low | Content paths | `tailwind.config.js` content includes `./app/**` and `./components/**`. Ensure any new directories with `className` are included. |
| Low | Global CSS | `global.css` uses `@tailwind` directives—correct for Tailwind v3. |

---

## Part 3: Tab Bar, Auth Modal, Booking Hero

### Tab Bar (`app/(tabs)/_layout.tsx`, `CustomTabBar`)

| Issue | Severity | Suggestion |
|-------|----------|------------|
| JS Tabs instead of NativeTabs | Medium | NativeTabs give native iOS/Android tab bar, liquid glass on iOS 26+, better performance. |
| Lucide icons instead of SF Symbols | Low | building-native-ui prefers SF Symbols (`sf` prop) for iOS. Lucide is acceptable. |
| Conditional tabs via `href: null` | Info | Hiding tabs with `href: null` is valid. NativeTabs docs warn that dynamic tab visibility can remount the navigator. |
| CustomTabBar styling | OK | Uses `useSafeAreaInsets`, rounded pill style. |

### Auth Modal (`providers/auth-modal-provider.tsx`)

| Issue | Severity | Suggestion |
|-------|----------|------------|
| No loading state during auth hydration | Medium | Show a brief loading state or skeleton while `hydrateAuthState` runs to avoid flash of unauthenticated UI. |
| `setTimeout(..., 0)` for navigation | Low | Used to avoid "Cannot update while rendering." Consider `router.replace` after state updates or `InteractionManager.runAfterInteractions`. |
| Token storage | OK | Uses `expo-secure-store` for native, `localStorage` for web. |
| Error handling | OK | `getAuthErrorMessage` maps backend codes to user messages. |

### Booking Hero (`components/home/booking-hero.tsx`)

| Issue | Severity | Suggestion |
|-------|----------|------------|
| `Dimensions.get()` in search screen | Medium | building-native-ui prefers `useWindowDimensions()` over `Dimensions.get()` for responsiveness. |
| Search screen: `Dimensions.get("window")` | Medium | Same as above—use `useWindowDimensions()` in `VehicleCard`. |
| Mix of StyleSheet and className | Low | Some styles use StyleSheet (e.g. `styles.heroImage`). Consistent approach is fine; consider moving more to className if desired. |
| Loading/error states | OK | Uses `ActivityIndicator` and error text. |
| Data fetching | OK | `useCarCategories` with React Query. |

---

## Part 4: expo-deployment & expo-dev-client Patterns

### Deployment Checklist

- [ ] Create `eas.json` with production and development profiles.
- [ ] Add `usesNonExemptEncryption` to `app.json`.
- [ ] Set production `bundleIdentifier` and `package` (Android).
- [ ] Configure `eas credentials -p ios` (and Android if needed).
- [ ] Create app in App Store Connect with matching bundle ID.
- [ ] Add privacy policy URL.
- [ ] Provide demo account if login is required.

### Dev Client

- **When to use:** Only if you need custom native code (local modules, widgets, app clips, or native modules not in Expo Go).
- **Current stack:** Uses expo-*, react-native-*, @rn-primitives. Most of this works in Expo Go.
- **Recommendation:** Test in Expo Go first. Add a dev client build profile only if you hit limitations.

### EAS Build Commands (after `eas.json` exists)

```bash
# Production iOS
eas build -p ios --profile production

# Submit to App Store Connect
eas build -p ios --profile production --submit

# Or use npx testflight for quick TestFlight submission
```

---

## Summary: Action Order

1. **Before first build:** Add `eas.json`, fix `usesNonExemptEncryption`, update bundle ID, remove or gate `NSAllowsLocalNetworking`.
2. **Before submission:** Configure credentials, create App Store Connect app, add privacy policy and demo account.
3. **Post-launch:** Consider NativeTabs migration, `useWindowDimensions`, offline support, and auth token on API client if needed.
