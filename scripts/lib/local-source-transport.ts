import type { SourceTransport } from "~/research/types";

type DnsJson = {
  Status: number;
  Answer?: Array<{ type: number; data: string }>;
};

function isPublicIpv4(value: string): boolean {
  const parts = value.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a, b] = parts;
  return !(
    a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19))
  );
}

async function publicAddress(hostname: string): Promise<string> {
  const endpoint = new URL("https://cloudflare-dns.com/dns-query");
  endpoint.searchParams.set("name", hostname);
  endpoint.searchParams.set("type", "A");
  const response = await fetch(endpoint, {
    headers: { accept: "application/dns-json" },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`DNS fallback returned ${response.status}`);
  const payload = await response.json() as DnsJson;
  const address = payload.Status === 0
    ? payload.Answer?.find((answer) => answer.type === 1 && isPublicIpv4(answer.data))?.data
    : null;
  if (!address) throw new Error("DNS fallback did not return a public IPv4 address");
  return address;
}

function responseParts(bytes: Uint8Array): { status: number; headers: Headers; body: Uint8Array } {
  const headerProbe = new TextDecoder().decode(bytes.subarray(0, Math.min(bytes.length, 16_384)));
  const crlfAt = headerProbe.indexOf("\r\n\r\n");
  const lfAt = headerProbe.indexOf("\n\n");
  const splitAt = crlfAt >= 0 ? crlfAt : lfAt;
  const delimiterLength = crlfAt >= 0 ? 4 : 2;
  if (splitAt < 0) throw new Error("DNS fallback returned malformed HTTP output");
  const headerText = new TextDecoder().decode(bytes.subarray(0, splitAt));
  const lines = headerText.split(/\r?\n/);
  const status = Number(lines.shift()?.match(/^HTTP\/\S+\s+(\d{3})/)?.[1]);
  if (!Number.isInteger(status)) throw new Error("DNS fallback returned an invalid HTTP status");
  const headers = new Headers();
  for (const line of lines) {
    const separator = line.indexOf(":");
    if (separator > 0) headers.append(line.slice(0, separator).trim(), line.slice(separator + 1).trim());
  }
  headers.delete("content-encoding");
  headers.delete("content-length");
  return { status, headers, body: bytes.subarray(splitAt + delimiterLength) };
}

async function fetchWithResolvedAddress(url: string, init: RequestInit): Promise<Response> {
  const target = new URL(url);
  if (target.protocol !== "https:" || target.port) throw new Error("DNS fallback only allows standard HTTPS sources");
  const address = await publicAddress(target.hostname);
  const args = [
    "--silent", "--show-error", "--include", "--compressed",
    "--connect-timeout", "10", "--max-time", "20", "--max-filesize", "1048576",
    "--proto", "=https", "--resolve", `${target.hostname}:443:${address}`,
  ];
  new Headers(init.headers).forEach((value, name) => args.push("--header", `${name}: ${value}`));
  args.push(target.toString());
  const curl = process.platform === "win32" ? "curl.exe" : "curl";
  const child = Bun.spawn([curl, ...args], { stdout: "pipe", stderr: "pipe" });
  const [stdoutBuffer, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).arrayBuffer(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  if (exitCode !== 0) throw new Error(`DNS fallback failed: ${stderr.trim() || `curl exit ${exitCode}`}`);
  const parsed = responseParts(new Uint8Array(stdoutBuffer));
  const body = parsed.status === 204 || parsed.status === 304 ? null : Uint8Array.from(parsed.body).buffer;
  return new Response(body, { status: parsed.status, headers: parsed.headers });
}

export const localSourceTransport: SourceTransport = async (url, init) => {
  try {
    return await fetch(url, init);
  } catch (error) {
    if (init.signal?.aborted) throw error;
    return fetchWithResolvedAddress(url, init);
  }
};
