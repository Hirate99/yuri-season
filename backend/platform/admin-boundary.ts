type AdminBoundaryEnv = {
  DEPLOYMENT_ROLE?: string;
  ADMIN_ORIGIN?: string;
};

function isAdminPage(pathname: string) {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

export function redirectPublicAdmin(request: Request, env: AdminBoundaryEnv): Response | null {
  if (env.DEPLOYMENT_ROLE !== "public" || !env.ADMIN_ORIGIN) return null;

  const requestUrl = new URL(request.url);
  if (!isAdminPage(requestUrl.pathname)) return null;

  let adminOrigin: URL;

  try {
    adminOrigin = new URL(env.ADMIN_ORIGIN);
  } catch {
    return null;
  }

  if (adminOrigin.protocol !== "https:" && adminOrigin.hostname !== "localhost") return null;

  const target = new URL(`${requestUrl.pathname}${requestUrl.search}`, adminOrigin);

  return Response.redirect(target, 307);
}
