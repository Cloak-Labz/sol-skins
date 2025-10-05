"use client";

// Reuse the existing About content but render it within the app-dashboard layout
// so it shows the sidebar/header like the rest of the dapp.
import AboutPage from "@/app/about/page";

export default function AboutWithinDashboard() {
  return <AboutPage />;
}

