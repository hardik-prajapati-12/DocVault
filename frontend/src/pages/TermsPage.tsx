import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Scale, ArrowLeft } from 'lucide-react';

const TermsPage: React.FC = () => {
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
          <Scale className="w-5 h-5 text-[var(--accent)]" />
          <span className="font-extrabold tracking-tight">DocVault</span>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 space-y-8 relative z-10">
        <div className="space-y-4 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-[var(--text-primary)] to-[var(--text-secondary)] bg-clip-text text-transparent">
            Terms of Service
          </h1>
          <p className="text-sm text-[var(--text-tertiary)]">
            Last Updated: July 21, 2026
          </p>
        </div>

        <div className="glass-strong p-8 rounded-3xl border border-[var(--border-color)] space-y-6 text-sm text-[var(--text-secondary)] leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[var(--text-primary)]">1. Acceptance of Terms</h2>
            <p>
              By accessing and using DocVault, you agree to comply with and be bound by these Terms of Service. If you do not agree, you are not authorized to use the service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[var(--text-primary)]">2. User Account & Security</h2>
            <p>
              You are responsible for safeguarding the credentials you use to access the service and for any activities or actions under your password.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[var(--text-primary)]">3. Storage Quota Policy</h2>
            <p>
              Every user is restricted to a maximum storage space limit of exactly 10 GB. Exceeding this limit will trigger an error preventing uploads. We do not provide capacity extensions or plans beyond 10 GB.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[var(--text-primary)]">4. Acceptable Use</h2>
            <p>
              You agree not to upload or store any materials that violate international laws, copyrights, trademarks, or contain malicious scripts or executable programs intended to disrupt service networks.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[var(--text-primary)]">5. Modification of Services</h2>
            <p>
              We reserve the right to modify or terminate the service (or any part thereof) at any time with or without notice.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
};

export default TermsPage;
