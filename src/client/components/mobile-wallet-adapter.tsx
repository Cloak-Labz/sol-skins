"use client";

import { useEffect } from "react";
import {
  registerMwa,
  createDefaultAuthorizationCache,
  createDefaultChainSelector,
  createDefaultWalletNotFoundHandler,
} from "@solana-mobile/wallet-standard-mobile";

/**
 * Component that registers the Solana Mobile Wallet Adapter (MWA)
 * This enables the app to connect with mobile wallets via deep links
 * or QR codes, depending on the device.
 */
export function MobileWalletAdapter() {
  useEffect(() => {
    // Only run on client side
    if (typeof window === "undefined") return;

    try {
      // Register the Mobile Wallet Adapter with proper configuration
      registerMwa({
        // Your app's identity - shown to users when connecting
        appIdentity: {
          name: "DUST3",
          uri: typeof window !== "undefined" ? window.location.origin : "https://dust3.fun",
          icon: "/assets/DUST3-SVG.svg", // Relative to your public folder
        },
        // Supported Solana chains
        chains: ["solana:devnet", "solana:mainnet"],
        // Authorization cache for storing wallet permissions
        authorizationCache: createDefaultAuthorizationCache(),
        // Chain selector for handling multi-chain scenarios
        chainSelector: createDefaultChainSelector(),
        // Handler for when no wallet is found
        onWalletNotFound: createDefaultWalletNotFoundHandler(),
        remoteHostAuthority: "https://dust3.fun",
      });

      console.log("✅ Mobile Wallet Adapter registered successfully");
    } catch (error) {
      console.error("❌ Failed to register Mobile Wallet Adapter:", error);
    }

    // Note: The new API doesn't return an unregister function
    // The adapter is registered globally
  }, []);

  // This component doesn't render anything
  return null;
}

