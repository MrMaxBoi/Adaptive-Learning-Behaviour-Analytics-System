import { SignIn } from '@clerk/clerk-react';

/**
 * Hosted Clerk sign-in (Google login). Clerk renders the provider buttons; the
 * client never handles a password (NFR-04). After sign-in Clerk redirects to
 * the dashboard.
 */
export function SignInPage() {
  return (
    <div className="centered">
      <div className="signin-card">
        <h1>Adaptive Learning</h1>
        <p className="muted">Sign in to start practising.</p>
        <SignIn routing="path" path="/sign-in" signUpUrl="/sign-in" afterSignInUrl="/" />
      </div>
    </div>
  );
}
