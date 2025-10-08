/**
 * Next.js Middleware
 * Edge-level request handling and caching
 * Requirements: 5.1, 5.2, 7.1, 7.5, 9.2
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Enforce HTTPS in production
  if (
    process.env.NODE_ENV === 'production' &&
    request.headers.get('x-forwarded-proto') !== 'https'
  ) {
    return NextResponse.redirect(
      `https://${request.headers.get('host')}${request.nextUrl.pathname}`,
      301
    );
  }

  // Add comprehensive security headers
  response.headers.set('X-DNS-Prefetch-Control', 'on');
  
  // HSTS - Force HTTPS for 1 year including subdomains
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  );
  
  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  
  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  // XSS Protection (legacy but still useful)
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions policy - restrict sensitive features
  response.headers.set(
    'Permissions-Policy',
    'microphone=(self), camera=(), geolocation=(), payment=(), usb=()'
  );
  
  // Content Security Policy
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Next.js requires unsafe-eval
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.deepgram.com https://api.assemblyai.com https://api.openai.com",
    "media-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    "upgrade-insecure-requests",
  ].join('; ');
  response.headers.set('Content-Security-Policy', cspDirectives);

  // Add performance headers
  response.headers.set('X-Response-Time', Date.now().toString());

  // Enable edge caching for static routes
  const pathname = request.nextUrl.pathname;

  if (
    pathname.startsWith('/_next/static') ||
    pathname.startsWith('/static') ||
    pathname.match(/\.(jpg|jpeg|png|gif|svg|ico|webp|avif|woff|woff2|ttf|otf|eot)$/)
  ) {
    // Static assets - cache at edge
    response.headers.set('CDN-Cache-Control', 'public, max-age=31536000, immutable');
    response.headers.set('Vercel-CDN-Cache-Control', 'public, max-age=31536000, immutable');
  } else if (pathname.startsWith('/api/health')) {
    // Health checks - short cache
    response.headers.set('CDN-Cache-Control', 'public, max-age=10, stale-while-revalidate=30');
  } else if (pathname.startsWith('/api/')) {
    // API routes - no edge caching
    response.headers.set('CDN-Cache-Control', 'no-store');
  } else {
    // HTML pages - cache with revalidation
    response.headers.set('CDN-Cache-Control', 'public, max-age=0, must-revalidate');
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/image|favicon.ico).*)',
  ],
};
