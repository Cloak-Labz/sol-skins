import { NextRequest, NextResponse } from "next/server";

// Temporary in-memory storage for development
// TODO: Replace with actual database integration
const waitlistStore: Array<{
  wallet: string;
  email: string;
  signature: string;
  timestamp: number;
  createdAt: Date;
}> = [];

export async function GET() {
  try {
    // Return count of unique wallets
    const uniqueWallets = new Set(waitlistStore.map((entry) => entry.wallet));
    return NextResponse.json({ count: uniqueWallets.size });
  } catch (error) {
    console.error("Error fetching waitlist count:", error);
    return NextResponse.json(
      { error: "Failed to fetch waitlist count" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { wallet, email, signature, timestamp } = body;

    // Validation
    if (!wallet || !email || !signature || !timestamp) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    // Check if wallet already exists
    const existingEntry = waitlistStore.find((entry) => entry.wallet === wallet);
    if (existingEntry) {
      return NextResponse.json(
        { error: "Wallet already registered" },
        { status: 409 }
      );
    }

    // Add to waitlist
    waitlistStore.push({
      wallet,
      email,
      signature,
      timestamp,
      createdAt: new Date(),
    });

    return NextResponse.json(
      { success: true, message: "Successfully registered" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error submitting waitlist:", error);
    return NextResponse.json(
      { error: "Failed to submit waitlist entry" },
      { status: 500 }
    );
  }
}

