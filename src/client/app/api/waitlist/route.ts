import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { query } from "@/lib/db";
import nacl from "tweetnacl";
import bs58 from "bs58";

export const runtime = "nodejs";

// Allowed origins for production
const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_APP_URL || "https://dust3.xyz",
  "https://www.dust3.xyz",
  "https://dust3.xyz",
];

// Check if origin is allowed (also allow localhost in development)
function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;

  // Allow localhost in development
  if (process.env.NODE_ENV === "development") {
    if (
      origin.startsWith("http://localhost:") ||
      origin.startsWith("http://127.0.0.1:")
    ) {
      return true;
    }
  }

  // Check production origins
  return ALLOWED_ORIGINS.includes(origin);
}

// Add CORS headers
function corsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin =
    isOriginAllowed(origin) && origin ? origin : ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

// Handle OPTIONS request for CORS preflight
export async function OPTIONS(request: Request) {
  const origin = request.headers.get("origin");

  if (!isOriginAllowed(origin)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(origin),
  });
}

interface WaitlistRequest {
  wallet: string;
  email: string;
  signature: string;
  timestamp: number;
}

/**
 * Reconstruct the exact message that was signed by the user
 */
function constructMessage(wallet: string, timestamp: number): string {
  return `Sign up for Dust3 waitlist. By signing this message, you confirm ownership of this wallet to receive notifications. Wallet: ${wallet} | Timestamp: ${timestamp}`;
}

/**
 * Verify a Solana wallet signature
 * @param message The original message that was signed
 * @param signature The signature in base64 format
 * @param publicKey The public key of the signer
 * @returns true if signature is valid, false otherwise
 */
function verifySignature(
  message: string,
  signature: string,
  publicKey: PublicKey
): boolean {
  try {
    // Decode the signature from base64
    const signatureBuffer = Buffer.from(signature, "base64");

    // Encode the message to bytes
    const messageBytes = new TextEncoder().encode(message);

    // Get the public key bytes
    const publicKeyBytes = publicKey.toBytes();

    // Verify the signature
    return nacl.sign.detached.verify(
      messageBytes,
      signatureBuffer,
      publicKeyBytes
    );
  } catch (error) {
    return false;
  }
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");

  // Check origin
  if (!isOriginAllowed(origin)) {
    return NextResponse.json(
      { error: "Forbidden: Invalid origin" },
      { status: 403 }
    );
  }

  try {
    const body: WaitlistRequest = await request.json();
    let { wallet, email, signature, timestamp } = body;

    // Validate inputs exist
    if (!wallet || !email || !signature || !timestamp) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: wallet, email, signature, and timestamp are required",
        },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    // Sanitize and validate string lengths to prevent potential attacks
    wallet = String(wallet).trim();
    email = String(email).toLowerCase().trim();
    signature = String(signature).trim();

    if (wallet.length > 100 || email.length > 255 || signature.length > 500) {
      return NextResponse.json(
        { error: "Input exceeds maximum allowed length" },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    // Validate wallet address (Solana wallet addresses are 32-44 characters)
    let publicKey: PublicKey;
    try {
      publicKey = new PublicKey(wallet);
      // Additional check: ensure it's a valid base58 string
      if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(wallet)) {
        throw new Error("Invalid wallet format");
      }
    } catch {
      return NextResponse.json(
        { error: "Invalid wallet address format" },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    // Validate email format (more strict validation)
    const emailRegex =
      /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!emailRegex.test(email) || email.length < 5) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    // Validate timestamp is recent (within last 10 minutes)
    const now = Date.now();
    const tenMinutes = 10 * 60 * 1000;
    if (Math.abs(now - timestamp) > tenMinutes) {
      return NextResponse.json(
        { error: "Signature expired. Please sign the message again." },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    // Reconstruct the message that was signed
    const message = constructMessage(wallet, timestamp);

    // Verify the signature
    const isValid = verifySignature(message, signature, publicKey);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid signature. Please sign the message again." },
        { status: 401, headers: corsHeaders(origin) }
      );
    }

    // Get IP address and user agent for tracking
    const ip =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      null;
    const userAgent = request.headers.get("user-agent") || null;

    // Store in database using parameterized queries (prevents SQL injection)
    try {
      // First check if wallet or email already exists
      const existing = await query<{ wallet_address: string; email: string }>(
        `SELECT wallet_address, email FROM waitlist_interest 
         WHERE wallet_address = $1 OR email = $2`,
        [wallet, email]
      );

      if (existing.length > 0) {
        const existingRecord = existing[0];
        if (existingRecord.wallet_address === wallet) {
          return NextResponse.json(
            { error: "This wallet address is already registered" },
            { status: 409, headers: corsHeaders(origin) }
          );
        }

        if (existingRecord.email === email) {
          return NextResponse.json(
            { error: "This email address is already registered" },
            { status: 409, headers: corsHeaders(origin) }
          );
        }
      }

      // Insert new record using parameterized query (SQL injection safe)
      await query(
        `INSERT INTO waitlist_interest (wallet_address, email, signature, ip_address, user_agent, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [wallet, email, signature, ip, userAgent]
      );

      return NextResponse.json(
        {
          success: true,
          message: "Interest registered successfully",
        },
        {
          headers: corsHeaders(origin),
        }
      );
    } catch (dbError: any) {
      // Handle any other database errors
      console.error("Database error:", dbError);
      throw dbError;
    }
  } catch (error: any) {
    console.error("Error processing waitlist registration:", error);

    // Don't expose internal error details to the client
    return NextResponse.json(
      { error: "Internal server error. Please try again later." },
      { status: 500, headers: corsHeaders(origin) }
    );
  }
}

/**
 * GET endpoint to retrieve waitlist count (for displaying registration stats)
 */
export async function GET(request: Request) {
  const origin = request.headers.get("origin");

  // Allow same-origin requests (no origin header) or valid origins
  if (origin && !isOriginAllowed(origin)) {
    return NextResponse.json(
      { error: "Forbidden: Invalid origin" },
      { status: 403 }
    );
  }

  try {
    const result = await query<{ count: string }>(
      "SELECT COUNT(*) as count FROM waitlist_interest"
    );

    const count = parseInt(result[0]?.count || "0", 10);

    return NextResponse.json(
      {
        count,
        message: "Waitlist count retrieved successfully",
      },
      {
        headers: corsHeaders(origin),
      }
    );
  } catch (error) {
    console.error("Error retrieving waitlist count:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders(origin) }
    );
  }
}
