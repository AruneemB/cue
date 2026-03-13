import { auth } from "@/lib/auth";

const publicRoutes = ["/", "/login"];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  const isPublic =
    publicRoutes.includes(pathname) || pathname.startsWith("/api/auth");

  if (!isPublic && !req.auth) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return Response.redirect(loginUrl);
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
