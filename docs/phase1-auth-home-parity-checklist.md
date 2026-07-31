# Phase 1 Auth + Home Parity Checklist

## Source of Truth

- UI reference: `/Users/afees/Projects/hireApp` customer mobile flow.
- API reference: `/Users/afees/Projects/hyre-worker-nestjs` auth endpoints.
- Target: `/Users/afees/Projects/hyre-mobile`.

## Auth Parity (Customer Only)

- [x] Customer role only (`user`) for mobile auth requests.
- [x] Send OTP endpoint aligned to Better Auth:
  - `POST /api/auth/email-otp/send-verification-otp`
  - payload includes `email`, `type: "sign-in"`, `role: "user"`.
- [x] Verify OTP endpoint aligned to Better Auth:
  - `POST /api/auth/sign-in/email-otp`
  - payload includes `email`, `otp`, `role: "user"`.
- [x] Session endpoint aligned:
  - `GET /auth/session`
  - consumes bearer token for mobile.
- [x] Mobile client header set on API requests:
  - `X-Client-Type: mobile`.
- [x] Keep secure token persistence in Expo Secure Store.
- [x] Logout aligned to Better Auth sign-out:
  - `POST /api/auth/sign-out`.

## Home Parity (Customer Mobile)

- [x] Hero copy hierarchy mirrors source:
  - Title: `Your Ride, Your Choice`
  - Subtitle: `Comfort. Safety. Professional. Every ride.`
- [x] Booking type tabs in top card.
- [x] Search card with date/time placeholders and CTA.
- [x] Trust badges beneath search card:
  - Vetted fleet owners
  - Secure booking
- [x] Category pills section (SUV, Luxury, Executive, Budget-friendly, Popular, Sedans).
- [x] Home-only visual parity foundation in place for Phase 1.

## Navigation/Role Surface Guardrails

- [x] Remove non-customer tab affordances from Phase 1 shell.
- [x] Keep Account tab behavior:
  - unauthenticated -> open login modal
  - authenticated -> logout action.
- [x] No admin or fleet-owner routes exposed in mobile tab flow.

## Phase 1 Notes

- Search/result/car-detail/booking/payment flows are intentionally deferred to later phases.
- Home uses mobile-native equivalents (React Native + NativeWind) while preserving structure and visual hierarchy from source.
