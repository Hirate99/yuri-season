function optionalEnv(name: string): string | null {
  return process.env[name]?.trim() || null;
}

export function adminHeaders(token: string, extra?: HeadersInit): Headers {
  const headers = new Headers(extra);

  headers.set("authorization", `Bearer ${token}`);

  const clientId = optionalEnv("YURI_ACCESS_CLIENT_ID");
  const clientSecret = optionalEnv("YURI_ACCESS_CLIENT_SECRET");

  if (Boolean(clientId) !== Boolean(clientSecret)) {
    throw new Error("YURI_ACCESS_CLIENT_ID and YURI_ACCESS_CLIENT_SECRET must be set together");
  }

  if (clientId && clientSecret) {
    headers.set("CF-Access-Client-Id", clientId);
    headers.set("CF-Access-Client-Secret", clientSecret);
  }

  return headers;
}
