# Tripdly mobile

Tripdly's iOS and Android customer app. It uses Expo SDK 55, Expo Router, and
React Native development clients to call the `hyre-worker-nestjs` API.

Customers use the app to:

- find and book chauffeur-driven cars;
- manage bookings, payments, and trip extensions;
- sign in and manage their profile and referrals.

Fleet-owner, chauffeur-onboarding, and admin interfaces live in `hyre-web`.
This app owns the native customer UI, stores its API bearer token in
SecureStore, and does not connect directly to the database.

## Requirements

- Node.js 22.6.0 or newer
- pnpm 10.20.0
- Xcode for local iOS builds or Android Studio for local Android builds
- `hyre-worker-nestjs` running on port 3000 when using the local API

## Get started

Install dependencies:

```bash
pnpm install
```

This repository uses an Expo development client. Build and launch one locally
with the native run script for your platform:

```bash
pnpm ios
# or
pnpm android
```

For later development sessions, configure the API and start Metro for the
existing development client:

```bash
# iOS simulator or Android emulator, using the local API
pnpm start:simulators

# Physical phone, using the hosted development API
pnpm start:phone
```

`pnpm start:simulators` writes `http://localhost:3000` to `.env` as both the API
base URL and trusted origin. Its Android pre-start step reverses ports 8081 and
3000 through `adb`. `pnpm start:phone` writes
`https://hyre-worker-nestjs.fly.dev` instead. Both commands then start Metro for
the development client.

`pnpm start:ios` and `pnpm start:android` open an already-built development
client against a localhost Metro server without rewriting `.env`; the Android
command also configures the same `adb` port reversals.

## Environment variables

Use [`.env.example`](.env.example) as the source for local configuration. It
documents:

- `EXPO_PUBLIC_API_BASE_URL` and `EXPO_PUBLIC_TRUSTED_ORIGIN`;
- optional `EXPO_PUBLIC_API_TIMEOUT_MS`, `EXPO_PUBLIC_SENTRY_DSN`, and
  `EXPO_PUBLIC_APP_ENV`;
- EAS-only `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, and `SENTRY_PROJECT`.

The preview and production API URLs are committed in [`eas.json`](eas.json).
Keep `SENTRY_AUTH_TOKEN` in EAS environment secrets; do not commit it.

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm start` | Start Metro for an existing development client |
| `pnpm start:simulators` / `pnpm start:simulator` | Configure the local API and start for simulators/emulators |
| `pnpm start:phone` | Configure the hosted development API and start for a physical phone |
| `pnpm start:ios` | Open the iOS development client through localhost Metro |
| `pnpm start:android` | Open the Android development client with local port reversals |
| `pnpm setup:simulator` | Write local API values to `.env` without starting Metro |
| `pnpm setup:simulator:hosted` | Write hosted development API values without starting Metro |
| `pnpm ios` / `pnpm android` | Build and run a local native development client |
| `pnpm ios:simulator` / `pnpm android:emulator` | Configure the local API, then build for a selected device |
| `pnpm web` | Start Expo's web bundler |
| `pnpm typecheck` | Run TypeScript without emitting files |
| `pnpm lint` | Run Expo's ESLint configuration |
| `pnpm test` | Run the Node unit and contract tests |
| `pnpm check` | Run typecheck, lint, and Expo dependency validation |

CI runs `pnpm check` and `pnpm test` for pull requests and pushes to `main`
using Node.js 22 and pnpm 10.20.0.

## Environments and releases

Pushes to `main` create preview builds against the development API and submit
them to TestFlight and the Play internal track. Production builds are started
manually after the production API is promoted:

```bash
eas workflow:run .eas/workflows/production.yml --ref main
```

The production workflow verifies the API, requires EAS approval, and submits
builds that use the production API. Merging to `main` does not release the
mobile app.

See [docs/environments.md](docs/environments.md) for the complete environment
mapping and release procedure.
