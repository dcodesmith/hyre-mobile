# Environments

The mobile app has independent development, preview, and production build
profiles. API URLs are embedded at build time, so a production binary must
never be built with the development API URL.

| Mobile profile | Trigger and distribution | API |
| --- | --- | --- |
| `development` | Developer-triggered internal dev client | Local or EAS development variables |
| `preview` | Every push to `main`; TestFlight and Play internal | `hyre-worker-nestjs.fly.dev` |
| `production` | Manual EAS workflow; TestFlight and Play internal | `hyre-worker-nestjs-production.fly.dev` |

There are no automatic native builds for pull requests. Native builds are slow
and costly, while CI still validates every PR.

## Preview flow

Merging to `main` runs `.eas/workflows/preview.yml`. It builds the `preview`
profile against the development API and submits the binaries to TestFlight and
the Play internal track. This is the long-lived development validation path.

## Production flow

1. Promote and verify the production API.
2. Run the committed workflow from `main`:
   `eas workflow:run .eas/workflows/production.yml --ref main`.
3. The workflow verifies that the selected commit matches the current
   `origin/main` tip and that the production API identifies itself as
   production and reports healthy.
4. Approve the release in the EAS dashboard.
5. EAS builds the `production` profile and submits it to TestFlight and the Play
   internal track.
6. Promote the approved binaries to customer-facing App Store and Play tracks
   using their store release controls.

The workflow rejects any commit other than the current `main` tip and
intentionally has no tag trigger. Creating a Git tag does not release a mobile
binary, and merging to `main` only creates preview builds.

## EAS environment configuration

The build profiles explicitly select their matching EAS environments:

- `development`
- `preview`
- `production`

Keep Sentry values in the matching EAS environment. In particular,
`SENTRY_AUTH_TOKEN` is a secret and must not be committed. Public API URLs stay
in `eas.json` so the environment mapping is reviewable and tested.
