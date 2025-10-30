import Link from "next/link";
import Footer from "@/components/footer";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-lg border-b border-[#333]">
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-auto">
              <img
                src="/assets/DUST3-SVG.svg"
                alt="Dust3 logo"
                className="h-8 w-auto"
              />
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <Link
              href="/app-dashboard/packs"
              className="bg-[#E99500] hover:bg-[#c77f00] text-black font-bold rounded-md px-4 py-2"
            >
              Launch App
            </Link>
          </nav>
        </div>
      </header>
      <div className="max-w-4xl mx-auto px-8 pt-32 pb-28">
        <h1 className="text-5xl lg:text-6xl font-bold mb-4">
          Terms of Service
        </h1>
        <p className="text-sm text-[#888] mb-12">Effective Date: 17/02/2025</p>

        <div className="prose prose-invert max-w-none prose-headings:text-white prose-p:text-[#c2c2c2] prose-a:text-[#E99500]">
          <p>
            By accessing or using Dust3 ("we", "us", "our") websites,
            applications, smart contracts, and related services (the "Service"),
            you agree to these Terms of Service (the "Terms"). If you do not
            agree, do not use the Service.
          </p>

          <div className="h-px bg-[#333] my-10" />
          <h2 className="mt-8 pt-2 text-3xl font-semibold">1. Eligibility</h2>
          <p>
            You must be at least 18 years old and have the legal capacity to
            enter into these Terms. You are responsible for complying with all
            applicable laws in your jurisdiction.
          </p>

          <div className="h-px bg-[#333] my-10" />
          <h2 className="mt-8 pt-2 text-3xl font-semibold">
            2. Accounts and Wallets
          </h2>
          <ul>
            <li>
              You may connect a self-custodial wallet to use certain features.
            </li>
            <li>
              You are solely responsible for your wallet, private keys, and
              security.
            </li>
            <li>
              Blockchain transactions are irreversible; we cannot reverse or
              refund them.
            </li>
          </ul>

          <div className="h-px bg-[#333] my-10" />
          <h2 className="mt-8 pt-2 text-3xl font-semibold">
            3. Purchases, Transactions, and Fees
          </h2>
          <ul>
            <li>
              On-chain transactions may incur network fees. You authorize us to
              display or relay transactions you initiate, but we do not custody
              your assets.
            </li>
            <li>
              Prices and availability of items may change at any time. Taxes are
              your responsibility.
            </li>
          </ul>

          <div className="h-px bg-[#333] my-10" />
          <h2 className="mt-8 pt-2 text-3xl font-semibold">4. User Conduct</h2>
          <ul>
            <li>No illegal activity, fraud, market manipulation, or abuse.</li>
            <li>No attempts to circumvent security or disrupt the Service.</li>
            <li>Do not violate third-party rights or applicable laws.</li>
          </ul>

          <div className="h-px bg-[#333] my-10" />
          <h2 className="mt-8 pt-2 text-3xl font-semibold">
            5. Intellectual Property
          </h2>
          <p>
            The Service, including text, graphics, logos, and software, is owned
            by Dust3 or licensors and protected by law. Subject to these Terms,
            we grant you a limited, non-exclusive, non-transferable license to
            access and use the Service for personal, non-commercial purposes.
          </p>

          <div className="h-px bg-[#333] my-10" />
          <h2 className="mt-8 pt-2 text-3xl font-semibold">
            6. Third-Party Services
          </h2>
          <p>
            We may integrate third-party services (e.g., wallets, analytics,
            hosting). We are not responsible for third-party content, policies,
            or actions. Your use of third-party services is subject to their
            terms and privacy practices.
          </p>

          <div className="h-px bg-[#333] my-10" />
          <h2 className="mt-8 pt-2 text-3xl font-semibold">7. Disclaimers</h2>
          <p>
            THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT
            WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT
            LIMITED TO MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND
            NON-INFRINGEMENT. ON-CHAIN ASSETS MAY BE VOLATILE AND INVOLVE RISK.
            YOU ASSUME ALL RISKS.
          </p>

          <div className="h-px bg-[#333] my-10" />
          <h2 className="mt-8 pt-2 text-3xl font-semibold">
            8. Limitation of Liability
          </h2>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, DUST3 AND ITS AFFILIATES
            WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
            CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, OR
            GOODWILL, ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICE.
          </p>

          <div className="h-px bg-[#333] my-10" />
          <h2 className="mt-8 pt-2 text-3xl font-semibold">
            9. Indemnification
          </h2>
          <p>
            You agree to indemnify and hold Dust3, its affiliates, and personnel
            harmless from any claims, damages, liabilities, and expenses
            (including reasonable attorneys’ fees) arising from your use of the
            Service or breach of these Terms.
          </p>

          <div className="h-px bg-[#333] my-10" />
          <h2 className="mt-8 pt-2 text-3xl font-semibold">
            10. Changes to the Service and Terms
          </h2>
          <p>
            We may modify or discontinue parts of the Service at any time. We
            may update these Terms from time to time. Continued use after
            updates constitutes your acceptance of the revised Terms.
          </p>

          <div className="h-px bg-[#333] my-10" />
          <h2 className="mt-8 pt-2 text-3xl font-semibold">11. Termination</h2>
          <p>
            We may suspend or terminate your access to the Service for any
            reason, including suspected violations of these Terms or applicable
            law.
          </p>

          <div className="h-px bg-[#333] my-10" />
          <h2 className="mt-8 pt-2 text-3xl font-semibold">
            12. Governing Law and Disputes
          </h2>
          <p>
            These Terms are governed by applicable laws where Dust3 is organized
            and operates, without regard to conflict-of-laws rules. Disputes
            will be resolved in the competent courts of that jurisdiction,
            unless mandatory law provides otherwise.
          </p>

          <div className="h-px bg-[#333] my-10" />
          <h2 className="mt-8 pt-2 text-3xl font-semibold">13. Contact</h2>
          <p>
            Questions about these Terms? Contact us at
            <a href="mailto:dust3solana@outlook.com"> dust3solana@outlook.com</a>.
          </p>

          <p className="mt-8 text-sm text-[#888]">
            For information on how we process personal data, see our
            <Link href="/privacy" className="ml-1 underline">
              Privacy Policy
            </Link>
            .
          </p>

          <p className="mt-4">
            <Link href="/app-dashboard" className="underline">
              Back to home
            </Link>
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
}
