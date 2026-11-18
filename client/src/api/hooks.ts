import { useAuth } from '@clerk/clerk-react';
import { useMemo } from 'react';
import { type Api, makeApi } from './client.js';

/**
 * Bind the typed API client to Clerk's session token. Components call
 * `const api = useApi()` and get a client whose every request carries the
 * current token. Memoised on the token getter so it's stable across renders.
 */
export function useApi(): Api {
  const { getToken } = useAuth();
  return useMemo(() => makeApi(() => getToken()), [getToken]);
}
