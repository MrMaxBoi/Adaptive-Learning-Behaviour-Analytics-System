import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { PracticePage } from './pages/PracticePage.js';
import { SignInPage } from './pages/SignInPage.js';

/**
 * Route table. Clerk's <SignedIn>/<SignedOut> gate the app: an unauthenticated
 * visitor is redirected to Clerk's hosted sign-in; a signed-in learner lands on
 * the dashboard. The practice screen and dashboard live inside the shared shell.
 */
export function App() {
  return (
    <Routes>
      <Route path="/sign-in/*" element={<SignInPage />} />
      <Route
        path="/*"
        element={
          <>
            <SignedIn>
              <AppShell>
                <Routes>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/practice" element={<PracticePage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </AppShell>
            </SignedIn>
            <SignedOut>
              <RedirectToSignIn />
            </SignedOut>
          </>
        }
      />
    </Routes>
  );
}
