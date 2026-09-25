import React from 'react'
import ReactDOM from 'react-dom/client'
import { ClerkProvider } from '@clerk/react'
import App from "./app/App"
import { clerkIsConfigured, clerkPublishableKey } from "./config/clerk"
import './styles/index.css'

function ClerkConfigurationNotice() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f6fa] px-6 text-[#1c075c]">
      <section className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-xl">
        <h1 className="text-xl font-semibold">Clerk belum dikonfigurasi</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Tambahkan VITE_CLERK_PUBLISHABLE_KEY dengan nilai pk_test_... atau pk_live_... pada environment preview.
        </p>
      </section>
    </main>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {clerkIsConfigured && clerkPublishableKey ? (
      <ClerkProvider publishableKey={clerkPublishableKey}>
        <App />
      </ClerkProvider>
    ) : (
      <ClerkConfigurationNotice />
    )}
  </React.StrictMode>,
)
