// https://github.com/vercel/next.js/discussions/16429#discussioncomment-7379305
export function getBaseUrl() {
  const custom = process.env.NEXT_PUBLIC_SITE_URL;
  const vercel = process.env.NEXT_PUBLIC_VERCEL_URL;

  if (custom) {
    return custom;
  } else if (vercel) {
    return vercel;
  } else {
    return "http://localhost:3000";
  }
}

export function buildUrl(path: string) {
  return getBaseUrl() + path;
}
