import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowLeft } from 'lucide-react';

const SecurityWhitepaperPage: React.FC = () => {
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
          <ShieldCheck className="w-5 h-5 text-[var(--accent)]" />
          <span className="font-extrabold tracking-tight">DocVault</span>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 space-y-8 relative z-10">
        <div className="space-y-4 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-[var(--text-primary)] to-[var(--text-secondary)] bg-clip-text text-transparent">
            Security Whitepaper
          </h1>
          <p className="text-sm text-[var(--text-tertiary)]">
            Last Updated: July 21, 2026
          </p>
        </div>

        <div className="glass-strong p-8 rounded-3xl border border-[var(--border-color)] space-y-6 text-sm text-[var(--text-secondary)] leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[var(--text-primary)]">1. Architecture Overview</h2>
            <p>
              DocVault is engineered on a secure zero-trust architecture. Communications between clients and server systems are strictly monitored and encrypted. We enforce TLS 1.3 encryption protocols globally.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[var(--text-primary)]">2. Encryption at Rest & in Transit</h2>
            <p>
              All uploads are streamed via secured HTTPS pipelines. In-transit validation leverages tokenized JWT validation checks. File metadata and binary targets stored within authorized nodes undergo active rest encryption pipelines.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[var(--text-primary)]">3. Storage & Quotas</h2>
            <p>
              Our infrastructure limits individual storage resources to exactly 10 GB per user space, which keeps storage environments isolated, optimized, and compliant with standard web quotas.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[var(--text-primary)]">4. Authentication Mechanics</h2>
            <p>
              User verification requires encrypted passwords salted withbcrypt hashing modules. Session verification remains valid for up to 7 days using cryptographically signed JSON Web Tokens (JWT).
            </p>
          </section>
        </div>
      </main>
    </div>
  );
};

export default SecurityWhitepaperPage;
