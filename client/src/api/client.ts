import type {
  CreateSessionResponse,
  DashboardSummaryResponse,
  FinishSessionResponse,
  MeResponse,
  NextUpResponse,
  StrategyName,
  SubmitAnswerResponse,
  UpdateProfileRequest,
} from '@fyp/shared';

/**
 * Typed API client for the practice + dashboard backend (§9). Every call goes
 * through `request`, which attaches the Clerk session token (NFR-04/05: the
 * backend trusts only the verified token, never a client-supplied user id) and
 * unwraps the uniform `{ error: { code, message } }` envelope.
 *
 * `getToken` is injected by the caller (from Clerk's useAuth) so this module
 * stays framework-light and unit-testable.
 */

const BASE = import.meta.env.VITE_API_BASE ?? '';

export class ApiRequestError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

export type GetToken = () => Promise<string | null>;

async function request<T>(
  getToken: GetToken,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = await getToken();
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${BASE}/api/v1${path}`, { ...init, headers });
  const text = await res.text();
  const body = text ? JSON.parse(text) : undefined;

  if (!res.ok) {
    const code = body?.error?.code ?? 'unknown';
    const message = body?.error?.message ?? res.statusText;
    throw new ApiRequestError(code, message, res.status);
  }
  return body as T;
}

export function makeApi(getToken: GetToken) {
  return {
    getMe: () => request<MeResponse>(getToken, '/me'),
    updateMe: (patch: UpdateProfileRequest) =>
      request<MeResponse>(getToken, '/me', { method: 'PATCH', body: JSON.stringify(patch) }),

    createSession: (strategy?: StrategyName) =>
      request<CreateSessionResponse>(getToken, '/practice/sessions', {
        method: 'POST',
        body: JSON.stringify(strategy ? { strategy } : {}),
      }),
    submitAnswer: (
      sessionId: string,
      questionId: string,
      selectedOption: string,
      responseTimeMs: number,
    ) =>
      request<SubmitAnswerResponse>(getToken, `/practice/sessions/${sessionId}/answers`, {
        method: 'POST',
        body: JSON.stringify({ questionId, selectedOption, responseTimeMs }),
      }),
    finishSession: (sessionId: string) =>
      request<FinishSessionResponse>(getToken, `/practice/sessions/${sessionId}/finish`, {
        method: 'POST',
      }),

    getSummary: () => request<DashboardSummaryResponse>(getToken, '/dashboard/summary'),
    getNextUp: () => request<NextUpResponse>(getToken, '/dashboard/next-up'),
  };
}

export type Api = ReturnType<typeof makeApi>;
