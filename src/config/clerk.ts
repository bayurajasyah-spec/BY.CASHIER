const configuredKey = (
  import.meta.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ??
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
)?.trim();

export const clerkPublishableKey =
  configuredKey && (configuredKey.startsWith("pk_test_") || configuredKey.startsWith("pk_live_"))
    ? configuredKey
    : undefined;

export const clerkIsConfigured = Boolean(clerkPublishableKey);
