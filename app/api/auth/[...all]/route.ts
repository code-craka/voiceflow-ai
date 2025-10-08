import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

// Export GET and POST handlers for Next.js 15 App Router
export const { POST, GET } = toNextJsHandler(auth);

// Use Node.js runtime for better compatibility
export const runtime = "nodejs";
