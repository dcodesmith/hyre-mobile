export type AuthSessionInvalidationReason = "unauthorized";

type AuthSessionInvalidationListener = (
  reason: AuthSessionInvalidationReason,
) => void | Promise<void>;

const listeners = new Set<AuthSessionInvalidationListener>();
let invalidationInFlight: Promise<void> | null = null;

const runBestEffort = async (task: () => void | Promise<void>) => {
  try {
    await task();
  } catch {
    // Session invalidation must continue even if one cleanup step fails.
  }
};

export function subscribeToAuthSessionInvalidation(
  listener: AuthSessionInvalidationListener,
) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function invalidateAuthSession(
  reason: AuthSessionInvalidationReason,
  clearPersistedSession: () => void | Promise<void>,
): Promise<void> {
  if (invalidationInFlight !== null) {
    return invalidationInFlight;
  }

  invalidationInFlight = (async () => {
    await runBestEffort(clearPersistedSession);
    const activeListeners = Array.from(listeners);
    await Promise.all(
      activeListeners.map((listener) =>
        runBestEffort(() => listener(reason)),
      ),
    );
  })();

  const currentInvalidation = invalidationInFlight;
  void currentInvalidation.finally(() => {
    if (invalidationInFlight === currentInvalidation) {
      invalidationInFlight = null;
    }
  });

  return currentInvalidation;
}
