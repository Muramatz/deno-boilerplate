export async function readApiErrorMessage(
  response: Response,
  fallbackMessage: string,
): Promise<string> {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    try {
      const body = (await response.json()) as { error?: { message?: string }; message?: string };
      return body.error?.message ?? body.message ?? fallbackMessage;
    } catch {
      return fallbackMessage;
    }
  }

  try {
    const text = (await response.text()).trim();
    return text || fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}
