"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ExternalLink,
  Copy,
  CheckCircle,
  AlertCircle,
  Info,
} from "lucide-react";
import { toast } from "react-hot-toast";
import Link from "next/link";

interface SteamTradeUrlModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (tradeUrl: string) => Promise<void>;
  currentTradeUrl?: string | null;
}

export function SteamTradeUrlModal({
  open,
  onOpenChange,
  onSave,
  currentTradeUrl,
}: SteamTradeUrlModalProps) {
  const [tradeUrl, setTradeUrl] = useState(currentTradeUrl || "");
  const [isSaving, setIsSaving] = useState(false);
  const [copiedStep, setCopiedStep] = useState<number | null>(null);
  const [validationError, setValidationError] = useState<string>("");

  const copyToClipboard = (text: string, step: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedStep(step);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopiedStep(null), 2000);
    });
  };

  const validateTradeUrl = (url: string): string => {
    if (!url.trim()) {
      return "";
    }

    if (!url.includes("steamcommunity.com/tradeoffer/new")) {
      return "Invalid format - URL must contain 'steamcommunity.com/tradeoffer/new'";
    }

    if (!url.includes("partner=") || !url.includes("token=")) {
      return "Missing required parameters - URL must include 'partner=' and 'token='";
    }

    try {
      const urlObj = new URL(url);
      const partner = urlObj.searchParams.get("partner");
      const token = urlObj.searchParams.get("token");

      if (!partner || !token) {
        return "Invalid parameters - 'partner' and 'token' are required";
      }

      if (!/^\d+$/.test(partner)) {
        return "Invalid partner ID - must be numeric";
      }

      if (token.length < 8) {
        return "Invalid token - must be at least 8 characters";
      }
    } catch {
      return "Invalid URL format";
    }

    return "";
  };

  const handleTradeUrlChange = (newUrl: string) => {
    setTradeUrl(newUrl);
    setValidationError(validateTradeUrl(newUrl));
  };

  const handleSave = async () => {
    if (!tradeUrl.trim()) {
      setValidationError("Please enter your Steam Trade URL");
      return;
    }

    const error = validateTradeUrl(tradeUrl);
    if (error) {
      setValidationError(error);
      return;
    }

    if (onSave) {
      setIsSaving(true);
      try {
        await onSave(tradeUrl);
        toast.success("Steam Trade URL saved successfully!");
        onOpenChange(false);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to save Trade URL"
        );
      } finally {
        setIsSaving(false);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bg-gradient-to-b from-zinc-950 to-zinc-900 border-zinc-800 max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0"
        showCloseButton={false}
      >
        {/* Header */}
        <div className="p-6 pb-4 border-b border-zinc-800 flex-shrink-0">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-full bg-[#E99500]/10">
                <Info className="w-6 h-6 text-[#E99500]" />
              </div>
              <DialogTitle className="text-2xl text-white">
                Steam Trade URL Required
              </DialogTitle>
            </div>
            <DialogDescription className="text-zinc-400 text-left">
              To claim skins to your Steam inventory, you need to provide your
              Steam Trade URL.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-6">
            {/* Warning Box */}
            <div className="p-4 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-yellow-400 mb-1">
                    Important
                  </p>
                  <p className="text-sm text-zinc-300">
                    Without a Steam Trade URL, you won't be able to claim skins
                    to your Steam account. You can still sell them for SOL
                    payout.
                  </p>
                </div>
              </div>
            </div>

            {/* Step-by-step instructions */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">
                How to Get Your Steam Trade URL
              </h3>

              <div className="space-y-3">
                {/* Step 1 */}
                <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <span className="inline-flex w-6 h-6 rounded-full bg-[#E99500] text-black text-xs items-center justify-center font-bold">
                        1
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-white mb-2">
                        Open Steam Trade URL Page
                      </p>
                      <p className="text-sm text-zinc-400 mb-3">
                        Click the button below to open your Steam Trade URL page
                        in a new tab.
                      </p>
                      <a
                        href="https://steamcommunity.com/id/me/tradeoffers/privacy#trade_offer_access_url"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-[#E99500] hover:text-[#ff9500]"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Open Steam Trade URL Page
                      </a>
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <span className="inline-flex w-6 h-6 rounded-full bg-[#E99500] text-black text-xs items-center justify-center font-bold">
                        2
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-white mb-2">
                        Find Your Trade URL
                      </p>
                      <p className="text-sm text-zinc-400 mb-3">
                        Scroll down to the "Third-Party Sites" section. You'll
                        see a long URL that looks like:
                      </p>
                      <div className="p-3 rounded bg-zinc-900 border border-zinc-700 relative">
                        <code className="text-xs text-green-400 break-all">
                          https://steamcommunity.com/tradeoffer/new/?partner=XXXXXX&token=XXXXXXXX
                        </code>
                        <button
                          onClick={() =>
                            copyToClipboard(
                              "https://steamcommunity.com/tradeoffer/new/?partner=XXXXXX&token=XXXXXXXX",
                              2
                            )
                          }
                          className="absolute top-2 right-2 p-1 hover:bg-zinc-800 rounded"
                          title="Copy example"
                        >
                          {copiedStep === 2 ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4 text-zinc-400" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <span className="inline-flex w-6 h-6 rounded-full bg-[#E99500] text-black text-xs items-center justify-center font-bold">
                        3
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-white mb-2">
                        Copy Your URL
                      </p>
                      <p className="text-sm text-zinc-400">
                        Click on the URL to select it, then copy it (Ctrl+C or
                        Cmd+C). If you don't see a URL, click "Create Trade URL"
                        first.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <span className="inline-flex w-6 h-6 rounded-full bg-[#E99500] text-black text-xs items-center justify-center font-bold">
                        4
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-white mb-2">
                        Paste It Below
                      </p>
                      <p className="text-sm text-zinc-400 mb-3">
                        Paste your Steam Trade URL in the field below and click
                        "Save".
                      </p>
                      <div className="space-y-2">
                        <Label htmlFor="tradeUrl" className="text-white">
                          Steam Trade URL
                        </Label>
                        <Input
                          id="tradeUrl"
                          value={tradeUrl}
                          onChange={(e) => handleTradeUrlChange(e.target.value)}
                          placeholder="https://steamcommunity.com/tradeoffer/new/?partner=..."
                          className={`bg-zinc-950 text-white font-mono text-sm ${
                            validationError
                              ? "border-red-500 focus-visible:ring-red-500"
                              : "border-zinc-700"
                          }`}
                        />
                        {validationError && (
                          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-red-400">
                              {validationError}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Info */}
            <div className="p-4 rounded-lg bg-[#E99500]/5 border border-[#E99500]/20">
              <p className="text-sm font-semibold text-[#E99500] mb-2">
                Pro Tips:
              </p>
              <ul className="text-sm text-zinc-300 space-y-1.5 list-none">
                <li className="flex items-start gap-2">
                  <span className="text-[#E99500] mt-0.5">•</span>
                  <span>
                    Keep your Trade URL private - don't share it publicly
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#E99500] mt-0.5">•</span>
                  <span>
                    You can regenerate your Trade URL anytime on Steam if it
                    gets compromised
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#E99500] mt-0.5">•</span>
                  <span>
                    Make sure your Steam inventory is public to receive trades
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#E99500] mt-0.5">•</span>
                  <span>
                    You can update your Trade URL anytime in your profile
                    settings
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="gap-0 p-0 border-t border-zinc-800 flex-shrink-0">
          {onSave && (
            <>
              <Button
                onClick={() => onOpenChange(false)}
                variant="outline"
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white rounded-none flex-1 h-12"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving || !tradeUrl.trim() || !!validationError}
                className="bg-[#E99500] hover:bg-[#ff9500] text-black font-bold disabled:opacity-50 disabled:cursor-not-allowed rounded-none flex-1 h-12"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  "Save Trade URL"
                )}
              </Button>
            </>
          )}
          {!onSave && (
            <Link href="/app-dashboard/profile" className="w-full">
              <Button className="bg-[#E99500] hover:bg-[#ff9500] text-black font-bold w-full rounded-none h-12">
                Go to Profile to Set Trade URL
              </Button>
            </Link>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
