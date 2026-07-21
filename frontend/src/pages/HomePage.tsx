import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, Lock, Zap, Search, FileText, Folder, ArrowRight, CheckCircle2,
  Sparkles, Star, HardDrive, Layers, Globe, Database, Cpu, Check, ChevronDown,
  Download, Eye, Share2, HelpCircle, Activity, TrendingUp, Users, Award,
  Sliders, RefreshCw, LayoutDashboard, Sun, Moon, ShieldAlert, Key, FileCheck,
  CheckCircle, ArrowUpRight, Copy, Terminal, Shield, Scale, Mail, ExternalLink
} from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import toast from 'react-hot-toast';

// Interactive Sandbox Mock Files
interface DemoDoc {
  id: string;
  name: string;
  category: 'pdf' | 'contract' | 'financial' | 'code';
  size: string;
  updated: string;
  encrypted: boolean;
  tags: string[];
}

const DEMO_FILES: DemoDoc[] = [
  { id: '1', name: 'Q3_Financial_Audit_2026.pdf', category: 'financial', size: '4.2 MB', updated: '2 hours ago', encrypted: true, tags: ['Audit', 'Finance', 'Confidential'] },
  { id: '2', name: 'Master_Service_Agreement_v4.pdf', category: 'contract', size: '1.8 MB', updated: '1 day ago', encrypted: true, tags: ['Legal', 'Contract', 'Signed'] },
  { id: '3', name: 'System_Architecture_Diagram.pdf', category: 'pdf', size: '8.5 MB', updated: '3 days ago', encrypted: true, tags: ['Tech', 'Design', 'Architecture'] },
  { id: '4', name: 'Vault_Core_Security_Module.ts', category: 'code', size: '142 KB', updated: '5 hours ago', encrypted: true, tags: ['TypeScript', 'Crypto', 'Backend'] },
  { id: '5', name: 'Tax_Declaration_2025_Final.pdf', category: 'financial', size: '2.1 MB', updated: '1 week ago', encrypted: true, tags: ['Tax', 'Internal'] },
  { id: '6', name: 'Non_Disclosure_Agreement_Template.docx', category: 'contract', size: '940 KB', updated: '2 weeks ago', encrypted: false, tags: ['Template', 'HR'] },
];

const FEATURES = [
  {
    icon: Lock,
    title: 'Secure Online Storage',
    description: 'Your documents are protected with enterprise-grade HTTPS encryption in transit and secured cloud storage at rest. Access your vault from anywhere with confidence.',
    color: '#3b82f6',
    badge: 'HTTPS Secured'
  },
  {
    icon: Zap,
    title: 'Instant Cloud Search',
    description: 'Blazing-fast cloud-indexed search delivers instant results across all your documents, metadata, and tags from any device in milliseconds.',
    color: '#8b5cf6',
    badge: 'Instant Results'
  },
  {
    icon: FileText,
    title: 'Online PDF & Media Viewer',
    description: 'Preview PDFs, images, videos, code files, and documents directly in your browser — streamed securely from your online vault without any downloads.',
    color: '#10b981',
    badge: 'Stream & Preview'
  },
  {
    icon: Globe,
    title: 'Multi-Device Cloud Sync',
    description: 'Seamlessly access and manage your document vault from desktop, tablet, or mobile. Your files stay synced across every device over the internet.',
    color: '#f59e0b',
    badge: 'Access Anywhere'
  },
  {
    icon: Layers,
    title: 'Smart Folders & Tagging',
    description: 'Organize files into hierarchical cloud folders, assign dynamic color-coded tags, and let intelligent categorization keep your vault structured.',
    color: '#14b8a6',
    badge: 'Auto-Organized'
  },
  {
    icon: Activity,
    title: 'Activity & Audit Logs',
    description: 'Track every document upload, modification, archive, and deletion in real-time with comprehensive cloud activity logs and system analytics.',
    color: '#f43f5e',
    badge: 'Full Visibility'
  },
];

const TESTIMONIALS = [
  {
    name: 'Elena Rostova',
    role: 'Head of Information Security',
    company: 'FinTech Secure Labs',
    comment: 'DocVault transformed how our legal and security teams manage confidential contracts online. Having secure cloud access from any device gives us total peace of mind.',
    rating: 5,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
  },
  {
    name: 'Marcus Vance',
    role: 'VP of Engineering',
    company: 'Nexus Cloud Systems',
    comment: 'The speed of instant cloud search and the online PDF viewer in DocVault is remarkable. It replaced three separate enterprise tools for our distributed team.',
    rating: 5,
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
  },
  {
    name: 'Sarah Chen',
    role: 'Principal Compliance Architect',
    company: 'Global Health Vault',
    comment: 'Having SOC 2 and ISO 27001 readiness with secure online document management saved us months of audit preparation. DocVault is truly enterprise-grade.',
    rating: 5,
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
  },
];

const FAQS = [
  {
    q: 'How does DocVault protect my sensitive documents?',
    a: 'DocVault secures all documents with enterprise-grade HTTPS/TLS encryption in transit and secure cloud storage at rest. User sessions are protected with JWT authentication, and all API endpoints require verified credentials.'
  },
  {
    q: 'Can I access my documents from any device?',
    a: 'Yes! DocVault is a fully online cloud platform. Simply sign in from any modern web browser on desktop, tablet, or mobile, and your entire document vault is instantly available over the internet.'
  },
  {
    q: 'What document formats are supported by the online viewer?',
    a: 'DocVault streams and previews PDFs, images (PNG, JPG, SVG, WebP), code files (TypeScript, JS, Python, JSON, Markdown), videos, audio files, and raw text files directly in your browser without requiring downloads.'
  },
  {
    q: 'How does the online search work across my documents?',
    a: 'DocVault uses high-performance cloud indexing to deliver instant search results across file names, metadata, tags, and content. Results are returned in milliseconds regardless of your vault size.'
  },
  {
    q: 'Is there a limit on file size or storage capacity?',
    a: 'DocVault supports generous upload sizes and cloud storage tiers that scale based on your plan. Contact us for enterprise-grade unlimited storage requirements.'
  },
];

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);

  // Authentication check
  const isAuthenticated = useMemo(() => {
    return Boolean(localStorage.getItem('docvault-auth-token'));
  }, []);

  // Sandbox State
  const [sandboxSearch, setSandboxSearch] = useState('');
  const [sandboxCategory, setSandboxCategory] = useState<'all' | 'pdf' | 'contract' | 'financial' | 'code'>('all');
  const [selectedDemoDoc, setSelectedDemoDoc] = useState<DemoDoc | null>(DEMO_FILES[0]);

  // Calculator State
  const [docCount, setDocCount] = useState<number>(500);
  const [avgSizeMb, setAvgSizeMb] = useState<number>(4);

  // Accordion State
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Newsletter email
  const [emailInput, setEmailInput] = useState('');

  // Calculate metrics
  const totalStorageGb = useMemo(() => {
    return ((docCount * avgSizeMb) / 1024).toFixed(2);
  }, [docCount, avgSizeMb]);

  const estimatedSearchSpeedMs = useMemo(() => {
    return Math.max(1, Math.round(docCount * 0.003));
  }, [docCount]);

  const filteredDemoFiles = useMemo(() => {
    return DEMO_FILES.filter((file) => {
      const matchesCategory = sandboxCategory === 'all' || file.category === sandboxCategory;
      const matchesSearch = file.name.toLowerCase().includes(sandboxSearch.toLowerCase()) ||
        file.tags.some(t => t.toLowerCase().includes(sandboxSearch.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [sandboxCategory, sandboxSearch]);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim() || !emailInput.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    toast.success('Thank you for subscribing to DocVault Security Updates!');
    setEmailInput('');
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-300 overflow-x-hidden selection:bg-[var(--accent)] selection:text-white">
      
      {/* ── 1. Enterprise Top Navigation Bar ── */}
      <nav className="sticky top-0 z-50 glass-strong border-b border-[var(--border-color)] backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo & Brand */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[var(--accent)] to-indigo-500 p-0.5 shadow-lg shadow-[var(--accent-glow)] group-hover:scale-105 transition-transform duration-300">
              <div className="w-full h-full bg-[var(--bg-primary)] rounded-[14px] flex items-center justify-center">
                <FileText className="w-5 h-5 text-[var(--accent)]" />
              </div>
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-[var(--text-primary)] via-[var(--text-primary)] to-[var(--text-secondary)] bg-clip-text text-transparent">
                DocVault
              </span>
              <span className="block text-[10px] uppercase font-bold tracking-widest text-[var(--accent)] -mt-1">
                Online Cloud Platform
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[var(--text-secondary)]">
            <a href="#features" className="hover:text-[var(--accent)] transition-colors">Features</a>
            <a href="#demo" className="hover:text-[var(--accent)] transition-colors">Live Sandbox</a>
            <a href="#calculator" className="hover:text-[var(--accent)] transition-colors">Vault Calculator</a>
            <a href="#security" className="hover:text-[var(--accent)] transition-colors">Security & Trust</a>
            <a href="#faq" className="hover:text-[var(--accent)] transition-colors">FAQ</a>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2.5 rounded-xl glass-card text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {isAuthenticated ? (
              <button
                onClick={() => navigate('/')}
                className="btn-accent flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-[var(--accent-glow)] cursor-pointer"
              >
                <LayoutDashboard className="w-4 h-4" />
                Open Workspace
              </button>
            ) : (
              <>
                <button
                  onClick={() => navigate('/login')}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
                >
                  Sign In
                </button>
                <button
                  onClick={() => navigate('/login')}
                  className="btn-accent flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-[var(--accent-glow)] cursor-pointer"
                >
                  Get Started Free
                  <ArrowRight className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── 2. Hero Banner Section ── */}
      <section className="relative pt-16 pb-24 lg:pt-24 lg:pb-32 overflow-hidden">
        {/* Ambient background glow orbs */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[var(--accent-dim)] rounded-full blur-[140px] opacity-40 pointer-events-none" />
        <div className="absolute top-1/3 right-10 w-[300px] h-[300px] bg-purple-500/20 rounded-full blur-[120px] opacity-30 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            
            {/* Version Announcement Pill */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card border border-[var(--accent)]/30 text-xs font-semibold text-[var(--accent)] shadow-sm"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>DocVault Cloud v2.4</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[var(--text-secondary)] font-normal">Online Document Vault</span>
            </motion.div>

            {/* Main Title */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.1]"
            >
              Manage Your Documents{' '}
              <span className="bg-gradient-to-r from-[var(--accent)] via-purple-500 to-indigo-500 bg-clip-text text-transparent">
                Online, Securely
              </span>{' '}
              From Anywhere.
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg sm:text-xl text-[var(--text-secondary)] leading-relaxed"
            >
              Store, organize, and preview your critical documents online with enterprise-grade security, instant cloud search, and built-in PDF & media viewers — accessible from any device over the internet.
            </motion.p>

            {/* Hero CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2"
            >
              <button
                onClick={() => navigate(isAuthenticated ? '/' : '/login')}
                className="w-full sm:w-auto btn-accent flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl font-bold text-base shadow-xl shadow-[var(--accent-glow)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              >
                <Shield className="w-5 h-5" />
                {isAuthenticated ? 'Open My Vault' : 'Get Started Free'}
              </button>

              <a
                href="#demo"
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-2xl glass-card border border-[var(--border-color)] font-semibold text-base text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-all cursor-pointer"
              >
                <Eye className="w-5 h-5 text-[var(--accent)]" />
                Explore Interactive Demo
              </a>
            </motion.div>

            {/* Trust Tickers */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="pt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-[var(--text-tertiary)] font-medium"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Secure Cloud Storage</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Multi-Device Access</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Instant Online Search</span>
              </div>
            </motion.div>
          </div>

          {/* Hero Showcase Mockup Card */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="mt-14 relative max-w-5xl mx-auto"
          >
            <div className="relative rounded-3xl glass-strong border border-[var(--border-color)] shadow-2xl p-4 sm:p-6 overflow-hidden backdrop-blur-2xl">
              
              {/* Fake Window Header */}
              <div className="flex items-center justify-between pb-4 border-b border-[var(--border-color)] mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  <span className="ml-2 text-xs text-[var(--text-tertiary)] font-mono">https://docvault.app/vault</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold">
                    <Globe className="w-3.5 h-3.5" />
                    Cloud Vault: Online & Secure
                  </span>
                </div>
              </div>

              {/* Showcase Grid Mock */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-card p-4 rounded-2xl border border-[var(--border-color)]">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/15 flex items-center justify-center text-blue-400">
                      <FileText className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-medium">Cloud</span>
                  </div>
                  <h4 className="text-sm font-semibold text-[var(--text-primary)] truncate">Q3_Security_Report.pdf</h4>
                  <p className="text-xs text-[var(--text-tertiary)] mt-1">4.2 MB • Updated 2h ago</p>
                </div>

                <div className="glass-card p-4 rounded-2xl border border-[var(--border-color)]">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-500/15 flex items-center justify-center text-purple-400">
                      <Folder className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 font-medium">18 Files</span>
                  </div>
                  <h4 className="text-sm font-semibold text-[var(--text-primary)] truncate">Legal Contracts 2026</h4>
                  <p className="text-xs text-[var(--text-tertiary)] mt-1">128 MB • Online Folder</p>
                </div>

                <div className="glass-card p-4 rounded-2xl border border-[var(--border-color)]">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-400">
                      <Zap className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium">Indexed</span>
                  </div>
                  <h4 className="text-sm font-semibold text-[var(--text-primary)] truncate">Cloud Search Engine</h4>
                  <p className="text-xs text-[var(--text-tertiary)] mt-1">Search latency: ~3ms</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── 3. Interactive Live Vault Sandbox Demo ── */}
      <section id="demo" className="py-20 bg-[var(--bg-secondary)] border-y border-[var(--border-color)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-[var(--accent)]">Experience It Live</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold mt-2">Interactive Cloud Sandbox</h2>
            <p className="text-sm sm:text-base text-[var(--text-secondary)] mt-2">
              Explore DocVault's online search, category filtering, and document metadata inspector directly on this page.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left: Interactive File List */}
            <div className="lg:col-span-2 glass-strong p-6 rounded-3xl border border-[var(--border-color)] space-y-5">
              
              {/* Search & Category Filter Bar */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
                  <input
                    type="text"
                    placeholder="Search online documents or tags (e.g. Audit, Legal)..."
                    value={sandboxSearch}
                    onChange={(e) => setSandboxSearch(e.target.value)}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>

                {/* Category Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                  {(['all', 'pdf', 'contract', 'financial', 'code'] as const).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSandboxCategory(cat)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer whitespace-nowrap
                        ${sandboxCategory === cat
                          ? 'bg-[var(--accent)] text-white shadow-md shadow-[var(--accent-glow)]'
                          : 'bg-[var(--bg-input)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Document Rows */}
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {filteredDemoFiles.length === 0 ? (
                  <div className="text-center py-12 text-[var(--text-tertiary)] text-sm">
                    No documents matching search criteria.
                  </div>
                ) : (
                  filteredDemoFiles.map((doc) => {
                    const isSelected = selectedDemoDoc?.id === doc.id;
                    return (
                      <div
                        key={doc.id}
                        onClick={() => setSelectedDemoDoc(doc)}
                        className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer
                          ${isSelected
                            ? 'bg-[var(--accent-dim)] border-[var(--accent)] shadow-sm'
                            : 'glass-card border-[var(--border-color)] hover:border-[var(--border-color-hover)]'
                          }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center flex-shrink-0 text-[var(--accent)]">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h5 className="text-sm font-semibold text-[var(--text-primary)] truncate">{doc.name}</h5>
                              {doc.encrypted && (
                                <span title="AES-256 Encrypted">
                                  <Lock className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                              {doc.size} • {doc.updated}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {doc.tags.slice(0, 2).map((t) => (
                            <span key={t} className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-[var(--bg-tertiary)] text-[10px] font-medium text-[var(--text-secondary)]">
                              #{t}
                            </span>
                          ))}
                          <ChevronDown className={`w-4 h-4 text-[var(--text-tertiary)] transition-transform ${isSelected ? '-rotate-90 text-[var(--accent)]' : ''}`} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right: Selected Document Detail Drawer */}
            <div className="glass-strong p-6 rounded-3xl border border-[var(--border-color)] flex flex-col justify-between space-y-6">
              {selectedDemoDoc ? (
                <>
                  <div>
                    <div className="flex items-center justify-between pb-4 border-b border-[var(--border-color)] mb-4">
                      <span className="text-xs font-bold text-[var(--accent)] uppercase tracking-wider">Cloud File Metadata</span>
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold flex items-center gap-1">
                        <Globe className="w-3 h-3" /> Cloud Stored
                      </span>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="text-xs text-[var(--text-tertiary)]">File Name</label>
                        <p className="text-sm font-bold text-[var(--text-primary)] break-all mt-0.5">{selectedDemoDoc.name}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-[var(--text-tertiary)]">File Size</label>
                          <p className="text-xs font-semibold text-[var(--text-primary)] mt-0.5">{selectedDemoDoc.size}</p>
                        </div>
                        <div>
                          <label className="text-xs text-[var(--text-tertiary)]">Category</label>
                          <p className="text-xs font-semibold uppercase text-[var(--text-primary)] mt-0.5">{selectedDemoDoc.category}</p>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs text-[var(--text-tertiary)]">Assigned Tags</label>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {selectedDemoDoc.tags.map((tag) => (
                            <span key={tag} className="px-2 py-1 rounded-lg bg-[var(--accent-dim)] text-[var(--accent)] text-xs font-medium">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="text-xs text-[var(--text-tertiary)]">Security Verification</label>
                        <div className="p-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] mt-1 font-mono text-[11px] text-[var(--text-secondary)] space-y-1">
                          <p className="text-emerald-400">✓ Protocol: HTTPS / TLS 1.3</p>
                          <p>✓ Auth: JWT Verified</p>
                          <p className="truncate">Cloud ID: dv-8f4a...e92a</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => navigate(isAuthenticated ? '/' : '/login')}
                    className="w-full btn-accent py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                  >
                    Open in Cloud Workspace
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-[var(--text-tertiary)] py-12">
                  <FileText className="w-10 h-10 mb-2 opacity-50" />
                  <p className="text-sm">Select a file to inspect cloud metadata</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. Feature Deep-Dive Grid ── */}
      <section id="features" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <span className="text-xs font-bold uppercase tracking-widest text-[var(--accent)]">Core Capabilities</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold">Built for the Cloud, Engineered for Speed</h2>
          <p className="text-base text-[var(--text-secondary)]">
            DocVault combines enterprise-grade online security with an intuitive, ultra-fast cloud document management experience.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {FEATURES.map((feat, idx) => {
            const IconComponent = feat.icon;
            return (
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="glass-strong p-8 rounded-3xl border border-[var(--border-color)] hover:border-[var(--accent)]/50 transition-all group hover:-translate-y-1 shadow-lg"
              >
                <div className="flex items-center justify-between mb-6">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md transition-transform group-hover:scale-110"
                    style={{ backgroundColor: `${feat.color}18`, color: feat.color }}
                  >
                    <IconComponent className="w-6 h-6" />
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider" style={{ backgroundColor: `${feat.color}15`, color: feat.color }}>
                    {feat.badge}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-[var(--text-primary)] mb-3">{feat.title}</h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{feat.description}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ── 5. Interactive Storage & ROI Calculator ── */}
      <section id="calculator" className="py-20 bg-[var(--bg-secondary)] border-y border-[var(--border-color)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            {/* Left Description */}
            <div className="lg:col-span-5 space-y-6">
              <span className="text-xs font-bold uppercase tracking-widest text-[var(--accent)]">Interactive Calculator</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold leading-tight">
                Estimate Your Cloud Storage & Performance
              </h2>
              <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
                Adjust your estimated document volume to preview online cloud storage requirements and search performance.
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-3 text-sm font-medium text-[var(--text-primary)]">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  <span>High-performance cloud indexing engine</span>
                </div>
                <div className="flex items-center gap-3 text-sm font-medium text-[var(--text-primary)]">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  <span>Ultra-low latency online document streaming</span>
                </div>
                <div className="flex items-center gap-3 text-sm font-medium text-[var(--text-primary)]">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  <span>SOC2 & ISO 27001 compliant cloud storage</span>
                </div>
              </div>
            </div>

            {/* Right Interactive Sliders Card */}
            <div className="lg:col-span-7 glass-strong p-8 rounded-3xl border border-[var(--border-color)] shadow-2xl space-y-8">
              
              {/* Slider 1: Document Count */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-semibold text-[var(--text-primary)]">Total Documents in Cloud</span>
                  <span className="font-extrabold text-[var(--accent)] text-lg">{docCount.toLocaleString()} Files</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="10000"
                  step="50"
                  value={docCount}
                  onChange={(e) => setDocCount(Number(e.target.value))}
                  className="w-full h-2 bg-[var(--bg-tertiary)] rounded-lg appearance-none cursor-pointer accent-[var(--accent)]"
                />
              </div>

              {/* Slider 2: Average File Size */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-semibold text-[var(--text-primary)]">Average Document Size</span>
                  <span className="font-extrabold text-[var(--accent)] text-lg">{avgSizeMb} MB</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="50"
                  step="1"
                  value={avgSizeMb}
                  onChange={(e) => setAvgSizeMb(Number(e.target.value))}
                  className="w-full h-2 bg-[var(--bg-tertiary)] rounded-lg appearance-none cursor-pointer accent-[var(--accent)]"
                />
              </div>

              {/* Results Grid */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-[var(--border-color)]">
                <div className="glass-card p-4 rounded-2xl text-center">
                  <span className="text-xs text-[var(--text-tertiary)] block">Cloud Storage</span>
                  <span className="text-xl sm:text-2xl font-black text-[var(--text-primary)] mt-1 block">{totalStorageGb} GB</span>
                </div>
                <div className="glass-card p-4 rounded-2xl text-center">
                  <span className="text-xs text-[var(--text-tertiary)] block">Online Search</span>
                  <span className="text-xl sm:text-2xl font-black text-emerald-400 mt-1 block">~{estimatedSearchSpeedMs} ms</span>
                </div>
                <div className="glass-card p-4 rounded-2xl text-center">
                  <span className="text-xs text-[var(--text-tertiary)] block">Security</span>
                  <span className="text-xl sm:text-2xl font-black text-[var(--accent)] mt-1 block">HTTPS</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. Security & Enterprise Compliance ── */}
      <section id="security" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <span className="text-xs font-bold uppercase tracking-widest text-[var(--accent)]">Security & Trust</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold">Enterprise Security & Compliance</h2>
          <p className="text-base text-[var(--text-secondary)]">
            Built from the ground up to meet the strictest industry standards for online document protection and cloud data security.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          {[
            { label: 'SOC 2 Type II', sub: 'Audited & Verified', icon: ShieldCheck },
            { label: 'ISO 27001', sub: 'Security Standard', icon: Award },
            { label: 'HIPAA Ready', sub: 'Health Data Vault', icon: FileCheck },
            { label: 'GDPR Compliant', sub: 'Privacy By Design', icon: Scale },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="glass-card p-6 rounded-2xl border border-[var(--border-color)] text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[var(--accent-dim)] text-[var(--accent)] mx-auto flex items-center justify-center">
                  <Icon className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-[var(--text-primary)]">{item.label}</h4>
                <p className="text-xs text-[var(--text-tertiary)]">{item.sub}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 7. Testimonials & Social Proof ── */}
      <section className="py-20 bg-[var(--bg-secondary)] border-y border-[var(--border-color)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-[var(--accent)]">Trusted Worldwide</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold mt-2">Loved by Teams & Organizations Worldwide</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="glass-strong p-8 rounded-3xl border border-[var(--border-color)] flex flex-col justify-between space-y-6 shadow-lg">
                <div className="space-y-4">
                  <div className="flex items-center gap-1 text-amber-400">
                    {[...Array(t.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-current" />
                    ))}
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] italic leading-relaxed">"{t.comment}"</p>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-[var(--border-color)]">
                  <img src={t.avatar} alt={t.name} className="w-11 h-11 rounded-full object-cover border border-[var(--accent)]" />
                  <div>
                    <h5 className="text-sm font-bold text-[var(--text-primary)]">{t.name}</h5>
                    <p className="text-xs text-[var(--text-tertiary)]">{t.role} • {t.company}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 8. Interactive FAQ Accordion ── */}
      <section id="faq" className="py-24 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-xs font-bold uppercase tracking-widest text-[var(--accent)]">Got Questions?</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold mt-2">Frequently Asked Questions</h2>
        </div>

        <div className="space-y-4">
          {FAQS.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div key={faq.q} className="glass-strong rounded-2xl border border-[var(--border-color)] overflow-hidden transition-colors">
                <button
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between p-5 text-left font-bold text-base text-[var(--text-primary)] cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-5 h-5 text-[var(--accent)] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <div className="px-5 pb-5 text-sm text-[var(--text-secondary)] leading-relaxed border-t border-[var(--border-color)]/50 pt-3">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 9. Enterprise Footer ── */}
      <footer className="bg-[var(--bg-secondary)] border-t border-[var(--border-color)] pt-16 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-[var(--border-color)]">
            
            {/* Brand column */}
            <div className="md:col-span-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[var(--accent)] to-indigo-500 flex items-center justify-center text-white font-bold">
                  <FileText className="w-5 h-5" />
                </div>
                <span className="text-xl font-black text-[var(--text-primary)]">DocVault</span>
              </div>

              <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-sm">
                DocVault is an enterprise-grade online document management platform providing secure cloud storage, instant full-text search, and multi-device access over the internet.
              </p>

              <div className="flex items-center gap-2 pt-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-semibold text-[var(--text-secondary)]">Cloud Services Online 🟢</span>
              </div>
            </div>

            {/* Link Column 1 */}
            <div className="md:col-span-3 space-y-3">
              <h5 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">Product & Features</h5>
              <ul className="space-y-2 text-xs text-[var(--text-secondary)]">
                <li><a href="#features" className="hover:text-[var(--accent)] transition-colors">Secure Cloud Storage</a></li>
                <li><a href="#features" className="hover:text-[var(--accent)] transition-colors">Online PDF Viewer</a></li>
                <li><a href="#demo" className="hover:text-[var(--accent)] transition-colors">Cloud Search Engine</a></li>
                <li><a href="#calculator" className="hover:text-[var(--accent)] transition-colors">Storage Calculator</a></li>
              </ul>
            </div>

            {/* Newsletter Column */}
            <div className="md:col-span-4 space-y-3">
              <h5 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">Platform Updates</h5>
              <p className="text-xs text-[var(--text-secondary)]">Subscribe to monthly product updates and cloud platform release notes.</p>
              
              <form onSubmit={handleSubscribe} className="flex gap-2 pt-1">
                <input
                  type="email"
                  placeholder="Enter your email..."
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="flex-1 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
                <button type="submit" className="btn-accent px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer">
                  Subscribe
                </button>
              </form>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--text-tertiary)]">
            <p>© {new Date().getFullYear()} DocVault Inc. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <span className="hover:text-[var(--text-secondary)] cursor-pointer">Privacy Policy</span>
              <span className="hover:text-[var(--text-secondary)] cursor-pointer">Terms of Service</span>
              <span className="hover:text-[var(--text-secondary)] cursor-pointer">Security Whitepaper</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
