import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Middleware to log incoming requests
export function middleware(request: NextRequest) {
    // Get the current date and time
    const timestamp = new Date().toISOString();

    // Log the HTTP method and the requested URL
    console.log(`[${timestamp}] ${request.method} request to: ${request.url}`);

    // Continue to the requested page
    return NextResponse.next();
}

// Configure the middleware to match specific paths
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * 
         * You can customize this to include API routes if needed.
         */
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};
