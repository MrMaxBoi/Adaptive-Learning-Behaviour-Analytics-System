import { UserButton } from '@clerk/clerk-react';
import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';

/** App frame: top nav with Dashboard/Practice links and the Clerk user menu. */
export function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">Adaptive Learning</div>
        <nav className="nav">
          <Link className={pathname === '/' ? 'active' : ''} to="/">
            Dashboard
          </Link>
          <Link className={pathname === '/practice' ? 'active' : ''} to="/practice">
            Practice
          </Link>
        </nav>
        <div className="spacer" />
        <UserButton afterSignOutUrl="/sign-in" />
      </header>
      <main className="content">{children}</main>
    </div>
  );
}
