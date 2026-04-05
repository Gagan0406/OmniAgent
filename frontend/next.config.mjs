import path from "node:path";

const windowsDistDir =
  process.platform === "win32" && process.env.LOCALAPPDATA
    ? path.relative(process.cwd(), path.join(process.env.LOCALAPPDATA, "omniagent-next"))
    : ".next";

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: windowsDistDir,
  async rewrites() {
    return [
      {
        source: "/backend/:path*",
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000"}/:path*`,
      },
    ];
  },
};

export default nextConfig;
