export { default } from "next-auth/middleware";

/**
 * Protect chat and connections routes — redirect to /login if not authenticated.
 */
export const config = {
  matcher: ["/chat/:path*", "/connections/:path*"],
};
