const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY?.trim();

if (!publishableKey) {
  throw new Error("Clerk belum dikonfigurasi. Tambahkan VITE_CLERK_PUBLISHABLE_KEY (pk_test_... atau pk_live_...). Jangan masukkan CLERK_SECRET_KEY di aplikasi Figma/Vite.");
}

if (!publishableKey.startsWith("pk_test_") && !publishableKey.startsWith("pk_live_")) {
  throw new Error("VITE_CLERK_PUBLISHABLE_KEY harus berupa Publishable Key Clerk yang diawali pk_test_ atau pk_live_. Secret Key (sk_...) tidak boleh dipakai di browser.");
}

export const clerkPublishableKey = publishableKey;
