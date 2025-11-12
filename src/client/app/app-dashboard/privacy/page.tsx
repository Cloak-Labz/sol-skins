import Link from "next/link";
import Footer from "@/components/footer";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="max-w-4xl mx-auto px-8 pt-4 pb-28">
        <h1 className="text-5xl lg:text-6xl font-bold mb-4">Privacy Policy</h1>
        <p className="text-sm text-[#888] mb-12">Last updated: 17/02/2025</p>

        <div className="prose prose-invert max-w-none prose-headings:text-white prose-p:text-[#c2c2c2] prose-a:text-[#E99500]">
          <p>
            Dust3 ("we", "us", "our") is committed to protecting your privacy.
            This Privacy Policy explains how we collect, use, store, and protect
            your personal information when you use our website and services. By
            using our services, you agree to this Privacy Policy.
          </p>

          <div className="h-px bg-[#333] my-10" />

          <h2 className="mt-8 pt-2 text-3xl font-semibold">
            1. Information We Collect
          </h2>
          <h3>1.1 Information You Provide</h3>
          <ul>
            <li>Contact: name, email, billing/shipping address, phone.</li>
            <li>Profile: wallet address, username, social links.</li>
            <li>
              Transactions: purchases, sales, redemptions, on-chain activity you
              initiate.
            </li>
            <li>Communications: messages, feedback, and support requests.</li>
            <li>
              Financial: payment method metadata routed via providers (we don’t
              store full card data).
            </li>
          </ul>

          <h3 className="text-xl mt-6">
            1.2 Information Collected Automatically
          </h3>
          <ul>
            <li>Device: OS, browser, screen size, device identifiers.</li>
            <li>Usage: pages viewed, time on page, clicks, referrer.</li>
            <li>
              Location: approximate location derived from IP (when available).
            </li>
            <li>
              Cookies: strictly necessary cookies; optional analytics only with
              consent.
            </li>
          </ul>

          <h3 className="text-xl mt-6">1.3 Third-Party Sources</h3>
          <ul>
            <li>
              Public data (e.g., blockchain data linked to your wallet address).
            </li>
            <li>
              Service integrations (e.g., analytics, hosting, payment and email
              providers).
            </li>
            <li>
              Marketplace partners that facilitate display/trade of assets.
            </li>
          </ul>

          <div className="h-px bg-[#333] my-10" />

          <h2 className="mt-8 pt-2 text-3xl font-semibold">
            2. How We Use Information
          </h2>
          <ul>
            <li>Provide and improve the Service and user experience.</li>
            <li>Security, fraud prevention, and abuse detection.</li>
            <li>Customer support and service communications.</li>
            <li>Legal compliance and to enforce our terms.</li>
            <li>Marketing with your consent; you can opt out anytime.</li>
            <li>Analytics and research to improve features and performance.</li>
          </ul>

          <div className="h-px bg-[#333] my-10" />

          <h2 className="mt-8 pt-2 text-3xl font-semibold">
            3. Sharing of Information
          </h2>
          <ul>
            <li>
              Service providers: hosting, analytics, email, payments, and
              support.
            </li>
            <li>
              Affiliates and marketplace partners to operate and improve
              features.
            </li>
            <li>
              Legal authorities when required by law or to protect rights and
              safety.
            </li>
            <li>
              Business transfers: part of mergers, acquisitions, or asset sales.
            </li>
            <li>
              Public content: content you choose to make public may be visible
              to others.
            </li>
          </ul>

          <div className="h-px bg-[#333] my-10" />

          <h2 className="mt-8 pt-2 text-3xl font-semibold">4. Cookies</h2>
          <p>
            We use necessary cookies for core functionality. Non-essential
            cookies (e.g., analytics) are used only with your consent. You can
            control cookies via your browser settings; disabling some cookies
            may impact functionality.
          </p>

          <div className="h-px bg-[#333] my-10" />

          <h2 className="mt-8 pt-2 text-3xl font-semibold">
            5. Social Plugins
          </h2>
          <p>
            Our website may include social plugins (e.g., Discord, X/Twitter,
            GitHub, LinkedIn). These providers may receive your IP address and
            page visit. If you are logged in to the provider, they may link this
            data to your account. Your consent is the legal basis where
            required. You can withdraw consent at any time with future effect.
          </p>

          <div className="h-px bg-[#333] my-10" />

          <h2 className="mt-8 pt-2 text-3xl font-semibold">
            6. Data Retention
          </h2>
          <p>
            We retain personal data only as long as necessary for the purposes
            described or as required by law. After that, we delete or anonymize
            the data.
          </p>

          <div className="h-px bg-[#333] my-10" />

          <h2 className="mt-8 pt-2 text-3xl font-semibold">7. Your Rights</h2>
          <ul>
            <li>Access, correct, or delete your personal data.</li>
            <li>Portability of data you provided, where applicable.</li>
            <li>Object to processing based on legitimate interests.</li>
            <li>
              Withdraw consent at any time (does not affect prior processing).
            </li>
          </ul>

          <div className="h-px bg-[#333] my-10" />

          <h2 className="mt-8 pt-2 text-3xl font-semibold">
            8. International Transfers
          </h2>
          <p>
            Your data may be processed in countries outside your jurisdiction.
            Where required, we use appropriate safeguards (e.g., contractual
            clauses) to protect your information.
          </p>

          <div className="h-px bg-[#333] my-10" />

          <h2 className="mt-8 pt-2 text-3xl font-semibold">9. Security</h2>
          <p>
            We implement reasonable technical and organizational measures to
            protect your data. However, no method of transmission or storage is
            100% secure.
          </p>

          <div className="h-px bg-[#333] my-10" />

          <h2 className="mt-8 pt-2 text-3xl font-semibold">
            10. Changes to This Policy
          </h2>
          <p>
            We may update this Privacy Policy from time to time. We will update
            the “Last updated” date above and, where appropriate, provide
            additional notice.
          </p>

          <div className="h-px bg-[#333] my-10" />

          <h2 className="mt-8 pt-2 text-3xl font-semibold">11. Contact</h2>
          <p>
            Questions? Contact us at{" "}
            <a href="mailto:dust3solana@outlook.com">dust3solana@outlook.com</a>.
          </p>

          <p className="mt-8 text-sm text-[#888]">
            Looking for our Terms? They will be available soon.
          </p>

          <p className="mt-4">
            <Link href="/app-dashboard" className="underline">
              Back to home
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
