"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CheckCircle2,
  Mail,
  Wallet,
  FileSignature,
  Loader2,
  Rocket,
  LogOut,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { ClientOnly } from "@/components/client-only";
import Link from "next/link";

type Step = "connect" | "sign" | "email";

export default function WaitlistPage() {
  const { connected, publicKey, wallet, disconnect } = useWallet();
  const [step, setStep] = useState<Step>("connect");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [timestamp, setTimestamp] = useState<number | null>(null);
  const [registrationCount, setRegistrationCount] = useState<number | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (connected && publicKey) {
      setStep("sign");
    }
  }, [connected, publicKey]);

  useEffect(() => {
    // Fetch registration count on mount
    const fetchCount = async () => {
      try {
        const response = await fetch("/api/waitlist");
        const data = await response.json();
        if (response.ok) {
          setRegistrationCount(data.count);
        }
      } catch (error) {
        // Silently fail - count is optional
      }
    };
    fetchCount();
  }, []);

  const handleSignMessage = async () => {
    setError(null);

    if (!wallet?.adapter || !publicKey) {
      toast.error("Wallet not connected");
      return;
    }

    // Check if wallet supports signMessage
    const adapter = wallet.adapter;
    if (
      !("signMessage" in adapter) ||
      typeof adapter.signMessage !== "function"
    ) {
      toast.error("Signing not supported", {
        description: "Your wallet does not support message signing",
      });
      return;
    }

    try {
      // Generate timestamp for message
      const messageTimestamp = Date.now();

      // Simple message for receiving updates
      const message = `Sign up for Dust3 waitlist. By signing this message, you confirm ownership of this wallet to receive notifications. Wallet: ${publicKey.toBase58()} | Timestamp: ${messageTimestamp}`;

      const encodedMessage = new TextEncoder().encode(message);
      const sig = await adapter.signMessage(encodedMessage);
      const signatureBase58 = Buffer.from(sig).toString("base64");
      setSignature(signatureBase58);
      setTimestamp(messageTimestamp);
      setStep("email");
      toast.success("Message signed", {
        description: "Please enter your email to complete the registration",
      });
    } catch (error: any) {
      toast.error("Signing failed", {
        description: error.message || "Failed to sign message",
      });
    }
  };

  const handleSubmit = async () => {
    setError(null);

    if (!email) {
      const errorMsg = "Please enter your email address";
      setError(errorMsg);
      toast.error("Email required", {
        description: errorMsg,
      });
      return;
    }

    if (!publicKey || !signature || !timestamp) {
      const errorMsg = "Please complete all steps";
      setError(errorMsg);
      toast.error("Missing information", {
        description: errorMsg,
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      const errorMsg = "Please enter a valid email address";
      setError(errorMsg);
      toast.error("Invalid email", {
        description: errorMsg,
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          wallet: publicKey.toBase58(),
          email,
          signature,
          timestamp,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.error || "Failed to submit interest form";
        setError(errorMsg);
        throw new Error(errorMsg);
      }

      setError(null);
      setIsSuccess(true);
      toast.success("Success!", {
        description: "Your wallet and email have been saved",
      });

      // Refresh registration count
      try {
        const countResponse = await fetch("/api/waitlist");
        const countData = await countResponse.json();
        if (countResponse.ok) {
          setRegistrationCount(countData.count);
        }
      } catch (error) {
        // Silently fail
      }
    } catch (error: any) {
      const errorMsg = error.message || "Failed to submit interest form";
      setError(errorMsg);
      toast.error("Submission failed", {
        description: errorMsg,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const StepIndicator = ({
    currentStep,
    step,
  }: {
    currentStep: Step;
    step: Step;
  }) => {
    const stepOrder: Step[] = ["connect", "sign", "email"];
    const currentIndex = stepOrder.indexOf(currentStep);
    const stepIndex = stepOrder.indexOf(step);

    if (stepIndex === -1) return null;

    const isCompleted = stepIndex < currentIndex || isSuccess;
    const isCurrent = stepIndex === currentIndex && !isSuccess;

    return (
      <div className="flex items-center">
        <div
          className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
            isCompleted
              ? "bg-primary border-primary text-primary-foreground"
              : isCurrent
              ? "border-primary text-primary bg-primary/10"
              : "border-muted text-muted-foreground"
          }`}
        >
          {isCompleted ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : (
            <span className="font-semibold">{stepIndex + 1}</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen flex-col overflow-hidden bg-[#0a0a0a]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-lg border-b border-[#262626]">
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-auto">
              <img
                src="/assets/DUST3-SVG.svg"
                alt="Dust3 logo"
                className="h-8 w-auto"
              />
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/app-dashboard/packs">
              <Button className="bg-[#E99500] hover:bg-[#c77f00] text-black font-bold">
                Launch App
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center overflow-y-auto pt-24 pb-8">
        {/* Animated Background */}
        <div
          className="fixed inset-0 top-0 left-0 w-full h-full -z-20 pointer-events-none"
          style={{
            minHeight: "100dvh",
            width: "100vw",
          }}
        >
          <div className="absolute inset-0 h-full w-full bg-[#0a0a0a] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]">
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={`h-${i}`}
                className="absolute left-0 w-full h-px bg-gradient-to-r from-transparent via-primary to-transparent"
                style={{
                  top: `calc(${8 + i * 8}% * (min(100vw,100dvh)/100vw))`,
                }}
                animate={{
                  opacity: [0, 0.8, 0],
                  scaleX: [0, 1, 0],
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  delay: i * 0.3,
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <section className="container mx-auto px-4 py-8 w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl mx-auto"
          >
            <div className="text-center mb-6 md:mb-8">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-full bg-primary/10 mb-4 md:mb-6"
              >
                <Rocket className="w-8 h-8 md:w-10 md:h-10 text-primary" />
              </motion.div>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-3 md:mb-4 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Join the Waitlist
              </h1>
              <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto">
                Get early access to Dust3's private transaction layer on Solana.
              </p>
              {registrationCount !== null && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20"
                >
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-sm font-medium">
                    <span className="font-bold text-primary">
                      {registrationCount.toLocaleString()}
                    </span>{" "}
                    wallets registered
                  </span>
                </motion.div>
              )}
            </div>

            <Card className="border-2 border-[#262626] backdrop-blur-sm bg-card/95">
              <CardHeader>
                <CardTitle className="text-2xl">Interest Form</CardTitle>
                <CardDescription>
                  Complete these steps to register your interest
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 md:space-y-8">
                {/* Step Indicators */}
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4 flex-1">
                    <StepIndicator currentStep={step} step="connect" />
                    <div className="flex-1 h-0.5 bg-muted">
                      <div
                        className={`h-full transition-all ${
                          step !== "connect" ? "bg-primary" : "bg-muted"
                        }`}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-1">
                    <StepIndicator currentStep={step} step="sign" />
                    <div className="flex-1 h-0.5 bg-muted">
                      <div
                        className={`h-full transition-all ${
                          step === "email" || isSuccess
                            ? "bg-primary"
                            : "bg-muted"
                        }`}
                      />
                    </div>
                  </div>
                  <StepIndicator currentStep={step} step="email" />
                </div>

                {/* Step 1: Connect Wallet */}
                {step === "connect" && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center gap-3 text-lg font-semibold">
                      <Wallet className="w-6 h-6 text-primary" />
                      <span>Step 1: Connect Your Wallet</span>
                    </div>
                    <p className="text-muted-foreground">
                      Connect your Solana wallet to verify your identity.
                    </p>
                    <ClientOnly>
                      <WalletMultiButton className="wallet-adapter-button-trigger w-full justify-center rounded-md" />
                    </ClientOnly>
                  </motion.div>
                )}

                {/* Step 2: Sign Message */}
                {step === "sign" && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center gap-3 text-lg font-semibold">
                      <FileSignature className="w-6 h-6 text-primary" />
                      <span>Step 2: Sign Message</span>
                    </div>
                    <p className="text-muted-foreground">
                      Sign a message to prove wallet ownership. This doesn't
                      cost any fees.
                    </p>
                    {publicKey && (
                      <div className="p-4 rounded-lg bg-muted">
                        <p className="text-sm text-muted-foreground mb-1">
                          Wallet Address:
                        </p>
                        <p className="font-mono text-sm break-all">
                          {publicKey.toBase58()}
                        </p>
                      </div>
                    )}
                    <Button
                      onClick={handleSignMessage}
                      className="w-full rounded-md"
                      size="lg"
                      disabled={
                        !wallet?.adapter ||
                        !publicKey ||
                        !("signMessage" in (wallet?.adapter || {}))
                      }
                    >
                      <FileSignature className="w-4 h-4 mr-2" />
                      Sign Message
                    </Button>
                    <Button
                      onClick={async () => {
                        await disconnect();
                        setStep("connect");
                        toast.info("Wallet disconnected");
                      }}
                      variant="outline"
                      className="w-full rounded-md"
                      size="lg"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Disconnect Wallet
                    </Button>
                  </motion.div>
                )}

                {/* Step 3: Enter Email */}
                {step === "email" && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center gap-3 text-lg font-semibold">
                      <Mail className="w-6 h-6 text-primary" />
                      <span>Step 3: Enter Your Email</span>
                    </div>
                    <p className="text-muted-foreground">
                      We'll notify you about early access opportunities.
                    </p>

                    {error && !isSuccess && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-start justify-center gap-3 p-4 rounded-lg bg-destructive/10 border-2 border-destructive"
                      >
                        <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-destructive">
                            {error}
                          </p>
                        </div>
                      </motion.div>
                    )}

                    {isSuccess ? (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center space-y-6 py-8"
                      >
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
                          <CheckCircle2 className="w-8 h-8 text-primary" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold mb-2">
                            You're all set!
                          </h3>
                          <p className="text-muted-foreground">
                            Your wallet and email have been saved.
                          </p>
                        </div>
                        {publicKey && (
                          <div className="p-4 rounded-lg bg-muted">
                            <p className="text-sm text-muted-foreground mb-1">
                              Registered Wallet:
                            </p>
                            <p className="font-mono text-sm break-all">
                              {publicKey.toBase58()}
                            </p>
                          </div>
                        )}
                      </motion.div>
                    ) : (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email Address</Label>
                          <Input
                            id="email"
                            type="email"
                            placeholder="your.email@example.com"
                            value={email}
                            onChange={(e) => {
                              setEmail(e.target.value);
                              setError(null);
                            }}
                            className="w-full"
                            disabled={isSubmitting}
                          />
                        </div>
                        <Button
                          onClick={handleSubmit}
                          className="w-full rounded-md"
                          size="lg"
                          disabled={isSubmitting || !email}
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Submitting...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Submit Interest Form
                            </>
                          )}
                        </Button>
                      </>
                    )}
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </section>
      </main>
    </div>
  );
}
