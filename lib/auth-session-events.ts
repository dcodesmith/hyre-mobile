type AuthSessionInvalidationHandler = (
  failedToken: string,
) => void | Promise<void>;

let invalidationHandler: AuthSessionInvalidationHandler | null = null;

export function setAuthSessionInvalidationHandler(
  handler: AuthSessionInvalidationHandler,
) {
  invalidationHandler = handler;
  return () => {
    if (invalidationHandler === handler) {
      invalidationHandler = null;
    }
  };
}

export async function invalidateAuthSession(
  failedToken: string,
  clearPersistedSession: () => boolean | Promise<boolean>,
): Promise<void> {
  let shouldInvalidate = true;
  try {
    shouldInvalidate = await clearPersistedSession();
  } catch (error) {
    console.warn("Failed to clear persisted auth session", error);
    // Clear the in-memory session when persisted cleanup cannot be confirmed.
  }

  if (!shouldInvalidate || !invalidationHandler) {
    return;
  }

  try {
    await invalidationHandler(failedToken);
  } catch (error) {
    console.warn("Auth session invalidation handler failed", error);
    // The original unauthorized error remains the request's source of truth.
  }
}
