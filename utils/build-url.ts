// https://github.com/vercel/next.js/discussions/16429#discussioncomment-7379305
export function getBaseUrl() {
  const custom = process.env.NEXT_PUBLIC_SITE_URL;
  const vercel = process.env.NEXT_PUBLIC_VERCEL_URL;
  const vercelProd = process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL;
  const isProd = process.env.NEXT_PUBLIC_VERCEL_ENV === "production";
  if (isProd) return `https://${vercelProd}`;
  else if (custom) return custom;
  else if (vercel) return `https://${vercel}`;
  else return "http://localhost:3000";
}

export function buildUrl(path: string) {
  return getBaseUrl() + path;
}
