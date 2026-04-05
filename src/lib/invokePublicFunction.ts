const FUNCTIONS_BASE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
const PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

interface InvokePublicFunctionOptions {
  body?: unknown;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  responseType?: 'json' | 'blob' | 'text';
  retries?: number;
}

const NETWORK_ERROR_PATTERN = /failed to fetch|networkerror|load failed/i;

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function invokePublicFunction<T = unknown>(
  functionName: string,
  {
    body,
    method = 'POST',
    responseType = 'json',
    retries = 1,
  }: InvokePublicFunctionOptions = {},
): Promise<T | Blob | string> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(`${FUNCTIONS_BASE_URL}/${functionName}`, {
        method,
        headers: {
          apikey: PUBLISHABLE_KEY,
          'Content-Type': 'application/json',
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type') || '';
        let errorMessage = `Request failed with status ${response.status}`;

        if (contentType.includes('application/json')) {
          const errorData = await response.json().catch(() => null);
          errorMessage = errorData?.error || errorData?.message || errorMessage;
        } else {
          const errorText = await response.text().catch(() => '');
          if (errorText) errorMessage = errorText;
        }

        throw new Error(errorMessage);
      }

      if (responseType === 'blob') {
        return await response.blob();
      }

      if (responseType === 'text') {
        return await response.text();
      }

      return await response.json() as T;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      const canRetry = attempt < retries && NETWORK_ERROR_PATTERN.test(message);

      if (!canRetry) {
        throw error;
      }

      await wait(800 * (attempt + 1));
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Request failed');
}
