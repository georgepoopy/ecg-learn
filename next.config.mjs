/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Keep the libSQL driver + Prisma adapter out of the serverless bundle so
  // their native/dynamic parts are required from node_modules at runtime on
  // Vercel (otherwise DB calls can fail only in the serverless environment).
  serverExternalPackages: [
    "@libsql/client",
    "@prisma/adapter-libsql",
    "@prisma/client",
    "@prisma/instrumentation",
    "libsql",
  ],
};

export default nextConfig;
