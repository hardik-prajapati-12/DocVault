import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, ArrowLeft, Home } from 'lucide-react';

const PrivacyPolicyPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-300 overflow-x-hidden selection:bg-[var(--accent)] selection:text-white pb-24">
      {/* Background glow orbs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[var(--accent-dim)] rounded-full blur-[140px] opacity-25 pointer-events-none" />

      {/* Header / Nav */}
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between border-b border-[var(--border-color)]">
        <button
          onClick={() => navigate('/landing')}
          className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} />
          Back to Home
        </button>
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-[var(--accent)]" />
          <span className="font-extrabold tracking-tight">DocVault</span>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 space-y-8 relative z-10">
        <div className="space-y-4 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-[var(--text-primary)] to-[var(--text-secondary)] bg-clip-text text-transparent">
            Privacy Policy
          </h1>
          <p className="text-sm text-[var(--text-tertiary)]">
            Last Updated: July 21, 2026
          </p>
        </div>

        <div className="glass-strong p-8 rounded-3xl border border-[var(--border-color)] space-y-6 text-sm text-[var(--text-secondary)] leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[var(--text-primary)]">1. Information We Collect</h2>
            <p>
              We collect user authentication information (specifically username and password) to manage user accounts on our platform. We store document metadata and files strictly to provide document management services.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[var(--text-primary)]">2. How We Protect Your Data</h2>
            <p>
              Your security is our priority. All documents and data are encrypted in transit using HTTPS/TLS 1.3 encryption protocols. All user data stored at rest in our databases is encrypted and user access is governed by JWT (JSON Web Tokens).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[var(--text-primary)]">3. Storage Limits</h2>
            <p>
              Each user account is allocated a maximum storage space of exactly 10 GB. Files exceeding this limit will not be uploaded, and users are responsible for managing their personal space.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[var(--text-primary)]">4. Third-Party Services</h2>
            <p>
              We do not sell, trade, or transfer your personal identification information or documents to outside parties. All storage and hosting are maintained securely on authorized cloud environments.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[var(--text-primary)]">5. Consent</h2>
            <p>
              By utilizing the DocVault service, you consent to our website's online privacy policy and storage guidelines.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
};

export default PrivacyPolicyPage;
