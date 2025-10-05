"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useState } from "react";

export default function SettingsPage() {
  const [tradeUrl, setTradeUrl] = useState("");
  const [email, setEmail] = useState("");
  const [notifImportant, setNotifImportant] = useState(true);
  const [notifPromos, setNotifPromos] = useState(false);

  return (
    <div className="px-6 md:px-10 lg:px-16 py-8">
      <div className="max-w-4xl">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
          Settings
        </h1>
        <p className="text-gray-400 mb-8">
          Here you can find information about your Dust3 account. Keep your
          Trade URL and contact info up-to-date for a seamless trade experience.
        </p>

        {/* Trade URL */}
        <Card className="bg-[#0f0f0f] border-[#1f1f1f] mb-6">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-semibold">Trade URL</h2>
              <Link
                href="https://steamcommunity.com/id/me/tradeoffers/privacy#trade_offer_access_url"
                target="_blank"
                className="text-[#E99500] text-sm hover:underline"
              >
                Find Trade URL
              </Link>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tradeUrl" className="text-gray-300">
                Steam Trade Offer URL
              </Label>
              <div className="flex gap-3">
                <Input
                  id="tradeUrl"
                  value={tradeUrl}
                  onChange={(e) => setTradeUrl(e.target.value)}
                  className="bg-[#0b0b0b] border-[#1f1f1f] text-gray-200"
                />
                <Button className="bg-[#E99500] text-black hover:bg-[#d88500]">
                  Save
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card className="bg-[#0f0f0f] border-[#1f1f1f] mb-6">
          <CardContent className="p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-semibold">Contact Information</h2>
            </div>

            <p className="text-gray-400 text-sm">
              Your email address is used to verify we are working with a human
              and not a robot.
            </p>

            <div className="flex items-center gap-2">
              <span className="text-gray-300">Email</span>
              <Badge
                variant="outline"
                className="border-[#b45309] text-[#E99500]"
              >
                Not Verified
              </Badge>
              <Button variant="outline" className="border-[#333] text-white">
                Resend Confirmation
              </Button>
            </div>

            <div className="flex gap-3 max-w-xl">
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                className="bg-[#0b0b0b] border-[#1f1f1f] text-gray-200"
              />
              <Button className="bg-[#E99500] text-black hover:bg-[#d88500]">
                Update Email
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Email notifications */}
        <Card className="bg-[#0f0f0f] border-[#1f1f1f]">
          <CardContent className="p-6 space-y-4">
            <div>
              <h2 className="text-white font-semibold">
                Email notifications from Dust3
              </h2>
              <p className="text-gray-400 text-sm">
                Receive updates about your account and ongoing promotions. You
                can change these settings at any time.
              </p>
            </div>

            <div className="flex items-start justify-between gap-6 py-3 border-t border-[#1a1a1a]">
              <div>
                <div className="text-white font-medium">Notifications</div>
                <div className="text-gray-400 text-sm">
                  Important updates, such as deposit status, raffle results,
                  Backpack reminder
                </div>
              </div>
              <Switch
                checked={notifImportant}
                onCheckedChange={setNotifImportant}
              />
            </div>

            <div className="flex items-start justify-between gap-6 py-3 border-t border-[#1a1a1a]">
              <div>
                <div className="text-white font-medium">Promotions</div>
                <div className="text-gray-400 text-sm">
                  Free giveaways, promo codes, and other opportunities
                </div>
              </div>
              <Switch checked={notifPromos} onCheckedChange={setNotifPromos} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
