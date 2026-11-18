import { ClerkProvider } from '@clerk/clerk-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App.js';
import './styles.css';

/**
 * App bootstrap. ClerkProvider owns auth (Google login); QueryClientProvider
 * owns server-state fetching/caching; BrowserRouter owns navigation. The Clerk
 * publishable key is a build-time env var (safe to expose).
 */
const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!publishableKey) {
  // Fail loudly in dev rather than render a half-working auth-less app.
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY — copy client/.env.example to client/.env');
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider publishableKey={publishableKey}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </ClerkProvider>
  </StrictMode>,
);
