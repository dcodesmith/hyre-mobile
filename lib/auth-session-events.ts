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
  } catch {
    // Clear the in-memory session when persisted cleanup cannot be confirmed.
  }

  if (!shouldInvalidate || !invalidationHandler) {
    return;
  }

  try {
    await invalidationHandler(failedToken);
  } catch {
    // The original unauthorized error remains the request's source of truth.
  }
}
