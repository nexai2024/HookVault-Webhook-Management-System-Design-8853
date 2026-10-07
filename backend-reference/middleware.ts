/**
 * CORS middleware for the management + ingestion API so the Vite frontend
 * (and third-party callers) can reach it cross-origin during development.
 */
import { NextResponse, type NextRequest } from 'next/server';

function corsHeaders(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

export function middleware(req: NextRequest) {
  const origin = process.env.FRONTEND_ORIGIN || '*';

  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
  }

  const res = NextResponse.next();
  for (const [key, value] of Object.entries(corsHeaders(origin))) {
    res.headers.set(key, value);
  }
  return res;
}

export const config = {
  matcher: '/api/:path*',
};
