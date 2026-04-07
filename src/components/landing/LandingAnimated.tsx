'use client';

import Link from 'next/link';
import {
  ArrowRight,
  ShieldCheck,
  Bot,
  Activity,
  ChevronDown,
  Layers,
  Sparkles,
  Info,
  Zap,
  Eye,
  MessageSquare,
  FolderOpen,
  DollarSign,
  Plus,
  Minus,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

const fadeUp = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
};

const heroContainer = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.1, delayChildren: 0.05 },
  },
};

const heroItem = {
  hidden: { opacity: 0, y: 22 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  },
};

interface LandingAnimatedProps {
  isLoggedIn: boolean;
  userFirstName?: string | null;
}

const features = [
  {
    icon: Eye,
    title: 'Real-Time Agent Monitoring',
    body: 'Every thought, tool call, and result streams live into color-coded logs. No polling, no refresh — just instant visibility into what every agent is doing right now.',
    accent: 'violet',
  },
  {
    icon: ShieldCheck,
    title: 'Approval-First Safety',
    body: 'Sensitive tool requests pause the agent and open a full JSON review drawer. You see exactly what will run before anything touches your filesystem or APIs.',
    accent: 'cyan',
  },
  {
    icon: MessageSquare,
    title: 'Agent-to-Agent Messaging',
    body: 'Agents can delegate tasks, share context, and coordinate without your intervention. Build multi-specialist pipelines where each agent does what it does best.',
    accent: 'violet',
  },
  {
    icon: FolderOpen,
    title: 'Sandboxed File Workspace',
    body: 'A dedicated workspace directory lets agents create, read, edit, and search files safely. All operations are path-checked and size-capped — no accidental escapes.',
    accent: 'cyan',
  },
  {
    icon: DollarSign,
    title: 'Session Cost Tracking',
    body: 'Token usage and estimated cost update with every response. Model-specific pricing means the numbers are actually meaningful, not a rough guess.',
    accent: 'violet',
  },
  {
    icon: Zap,
    title: 'Bring Your Own Model',
    body: 'Point AgentGrid at any OpenAI-compatible endpoint — OpenRouter, local models, Azure, anything. Switch per-session without touching config files.',
    accent: 'cyan',
  },
];

const stats = [
  { value: '20', label: 'Max iterations per agent', suffix: 'x' },
  { value: '6', label: 'Built-in workspace tools', suffix: '+' },
  { value: '<200', label: 'ms approval polling loop', suffix: '' },
  { value: '1', label: 'MB file size cap enforced', suffix: '' },
];

const testimonials = [
  {
    quote: "Finally a workflow tool that doesn't hide what's happening. Seeing the raw JSON before approving a tool call is exactly the kind of transparency I needed.",
    name: 'Alex R.',
    title: 'AI Research Engineer',
    initials: 'AR',
  },
  {
    quote: "I had three agents collaborating on a codebase refactor in under five minutes. The delegation flow between agents is genuinely seamless.",
    name: 'Priya M.',
    title: 'Senior Software Developer',
    initials: 'PM',
  },
  {
    quote: "The cost tracking alone sold me. I always had no idea how much a long-running session was burning. Now I just watch the counter and know exactly.",
    name: 'Jordan T.',
    title: 'Indie Hacker',
    initials: 'JT',
  },
];

const faqs = [
  {
    q: 'Is my API key stored on your servers?',
    a: 'No. Your API key is stored only in your browser\'s localStorage and is sent directly to your chosen LLM provider. It never touches the AgentGrid backend.',
  },
  {
    q: 'Which LLM providers does AgentGrid support?',
    a: 'Any OpenAI-compatible endpoint. That includes OpenAI directly, OpenRouter, Azure OpenAI, and self-hosted models like Ollama with an OpenAI-compatible API.',
  },
  {
    q: 'Can I run multiple agents at the same time?',
    a: 'Yes. You can spawn as many agents as you like from the sidebar, each with an independent task. They run concurrently and can message each other.',
  },
  {
    q: 'What happens if an agent tries to access files outside the workspace?',
    a: 'Path traversal is blocked at the server level. Any attempt to escape the workspace directory is rejected with an error before the operation runs.',
  },
  {
    q: 'Do I need a Google account to sign up?',
    a: 'No. You can register with just an email and password. Google OAuth is also available if you prefer it.',
  },
  {
    q: 'Is there a limit to how long an agent can run?',
    a: 'Each agent is capped at 20 iterations per task to prevent runaway loops. You can restart the agent with a new task at any time.',
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/10 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-4 py-4 text-left text-sm font-medium text-zinc-100 transition hover:text-white"
      >
        <span>{q}</span>
        <span className="shrink-0 text-zinc-500">
          {open ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="answer"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <p className="pb-4 text-sm leading-relaxed text-zinc-400">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function LandingAnimated({ isLoggedIn, userFirstName }: LandingAnimatedProps) {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-zinc-950 text-white">
      {/* Background glows */}
      <motion.div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2 }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(99,102,241,0.22),transparent_40%),radial-gradient(circle_at_82%_8%,rgba(56,189,248,0.18),transparent_38%)]" />
        <motion.div
          className="absolute left-1/4 top-1/3 h-96 w-96 rounded-full bg-violet-600/20 blur-[100px]"
          animate={{ scale: [1, 1.08, 1], opacity: [0.25, 0.4, 0.25] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute right-1/4 top-1/2 h-80 w-80 rounded-full bg-cyan-500/15 blur-[90px]"
          animate={{ scale: [1.05, 1, 1.05], opacity: [0.2, 0.35, 0.2] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.div>

      {/* Nav */}
      <motion.header
        className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/15 bg-white/[0.05]">
            <Bot className="h-4 w-4 text-violet-300" />
          </div>
          <span className="text-base font-semibold tracking-tight">AgentGrid</span>
        </div>
        <nav className="hidden items-center gap-1 sm:flex">
          {[
            { href: '#features', label: 'Features' },
            { href: '#how-it-works', label: 'How it works' },
            { href: '#pricing', label: 'Pricing' },
            { href: '#faq', label: 'FAQ' },
            { href: '#about', label: 'About' },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="rounded-lg border border-transparent px-3 py-2 text-sm text-zinc-400 transition hover:border-white/10 hover:bg-white/[0.05] hover:text-zinc-200"
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="rounded-lg border border-white/15 bg-white/[0.03] px-4 py-2 text-sm text-zinc-200 transition hover:bg-white/[0.08]"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-violet-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-400"
          >
            Get Started
          </Link>
        </div>
      </motion.header>

      {/* Hero */}
      <section className="relative z-10 mx-auto grid w-full max-w-6xl gap-10 px-6 pb-16 pt-6 lg:grid-cols-[1.15fr_1fr] lg:items-center">
        <motion.div
          className="space-y-1"
          variants={heroContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-40px' }}
        >
          <motion.p
            className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-xs text-violet-200"
            variants={heroItem}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Human-approved multi-agent execution
          </motion.p>
          <motion.h1
            className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl"
            variants={heroItem}
          >
            Run autonomous agent teams
            <span className="mt-1 block bg-gradient-to-r from-violet-300 to-cyan-300 bg-clip-text text-transparent">
              with total operational clarity.
            </span>
          </motion.h1>
          <motion.p
            className="mt-5 max-w-xl text-base leading-relaxed text-zinc-300"
            variants={heroItem}
          >
            AgentGrid is your control center for high-density, real-time AI workflows. Track every
            action, approve risky tools, and coordinate specialized agents from one clean interface.
          </motion.p>
          <motion.div className="mt-7 flex flex-wrap items-center gap-3" variants={heroItem}>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-violet-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-400"
            >
              Create account
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href={isLoggedIn ? '/dashboard' : '/login'}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.03] px-5 py-3 text-sm text-zinc-100 transition hover:bg-white/[0.08]"
            >
              {isLoggedIn
                ? `Welcome back${userFirstName ? `, ${userFirstName}` : ''}`
                : 'Open workspace'}
            </Link>
          </motion.div>
          <motion.div
            className="mt-10 flex flex-col items-center gap-1 text-zinc-500 lg:items-start"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.6 }}
          >
            <span className="text-xs uppercase tracking-wider">Scroll to explore</span>
            <motion.span
              animate={{ y: [0, 4, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            >
              <ChevronDown className="h-4 w-4" />
            </motion.span>
          </motion.div>
        </motion.div>

        <motion.div
          className="rounded-3xl border border-white/15 bg-white/[0.04] p-5 shadow-[0_20px_80px_-35px_rgba(0,0,0,0.85)] backdrop-blur-xl"
          initial={{ opacity: 0, x: 32, scale: 0.96 }}
          whileInView={{ opacity: 1, x: 0, scale: 1 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Live Mission Snapshot</h2>
            <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-xs text-emerald-300">
              4 agents active
            </span>
          </div>
          <div className="space-y-3">
            {[
              { name: 'Research Agent', status: 'thinking', color: 'bg-emerald-400' },
              { name: 'Code Agent', status: 'executing', color: 'bg-emerald-400' },
              { name: 'QA Agent', status: 'awaiting approval', color: 'bg-amber-400' },
            ].map((item, i) => (
              <motion.div
                key={item.name}
                className="rounded-xl border border-white/10 bg-black/25 p-3"
                initial={{ opacity: 0, x: 16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 * i, duration: 0.4 }}
              >
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-medium text-zinc-100">{item.name}</span>
                  <span className="capitalize text-zinc-400">{item.status}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <motion.span
                    className={`h-2 w-2 rounded-full ${item.color}`}
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                  />
                  Streaming logs and tool actions in real time
                </div>
              </motion.div>
            ))}
          </div>
          <div className="mt-4 rounded-xl border border-white/10 bg-black/25 p-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs uppercase tracking-wide text-zinc-500">
              <Activity className="h-3.5 w-3.5" />
              Action Center
            </p>
            <p className="font-mono text-xs text-zinc-300">{`{"tool":"edit_file","path":"src/app/page.tsx","approved":true}`}</p>
          </div>
        </motion.div>
      </section>

      {/* Stats bar */}
      <section className="relative z-10 border-y border-white/10 bg-white/[0.02] py-10">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-6 md:grid-cols-4">
          {stats.map(({ value, label, suffix }, i) => (
            <motion.div
              key={label}
              className="text-center"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.45 }}
            >
              <p className="text-3xl font-bold tracking-tight text-white">
                {value}
                <span className="text-violet-300">{suffix}</span>
              </p>
              <p className="mt-1 text-xs text-zinc-500">{label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 mx-auto w-full max-w-6xl scroll-mt-24 px-6 py-20">
        <motion.div {...fadeUp} className="mb-12 text-center">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-200">
            <Zap className="h-3.5 w-3.5" />
            Platform features
          </p>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Everything you need to run AI teams in production
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-zinc-400">
            Built around the idea that you should always know what your agents are doing — and always have the final say.
          </p>
        </motion.div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, body, accent }, i) => (
            <motion.article
              key={title}
              className="group rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl transition-colors hover:border-white/20 hover:bg-white/[0.05]"
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl border ${accent === 'violet' ? 'border-violet-400/20 bg-violet-500/10' : 'border-cyan-400/20 bg-cyan-500/10'}`}>
                <Icon className={`h-5 w-5 ${accent === 'violet' ? 'text-violet-300' : 'text-cyan-300'}`} />
              </div>
              <h3 className="text-base font-semibold text-zinc-100">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{body}</p>
            </motion.article>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="relative z-10 mx-auto w-full max-w-6xl scroll-mt-24 px-6 pb-20">
        <motion.div {...fadeUp} className="mb-12">
          <h2 className="mb-2 text-2xl font-semibold tracking-tight sm:text-3xl">How it works</h2>
          <p className="max-w-2xl text-sm text-zinc-400">
            From first login to approved tools: a short path you can follow without digging through docs.
          </p>
        </motion.div>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              step: '01',
              title: 'Configure your model',
              body: 'Add your API key in Settings, pick OpenAI or a compatible endpoint, then validate the connection.',
              icon: Sparkles,
            },
            {
              step: '02',
              title: 'Spawn agents & assign work',
              body: 'Use the sidebar to add agents. Give each one a task; watch thoughts, tools, and results stream live.',
              icon: Bot,
            },
            {
              step: '03',
              title: 'Approve in Action Center',
              body: 'Sensitive tools open the slide-over drawer with JSON you can confirm or deny before anything runs.',
              icon: Layers,
            },
          ].map(({ step, title, body, icon: Icon }, i) => (
            <motion.div
              key={step}
              className="relative rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl"
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ delay: i * 0.12, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="font-mono text-xs text-violet-300/80">{step}</span>
              <div className="mt-3 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-violet-500/10">
                <Icon className="h-5 w-5 text-violet-300" />
              </div>
              <h3 className="mt-3 text-lg font-semibold text-zinc-100">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="relative z-10 border-y border-white/10 bg-white/[0.02] py-20">
        <div className="mx-auto w-full max-w-6xl px-6">
          <motion.div {...fadeUp} className="mb-12 text-center">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">What people are saying</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-zinc-400">
              Early users running real agent workflows.
            </p>
          </motion.div>
          <div className="grid gap-5 md:grid-cols-3">
            {testimonials.map(({ quote, name, title, initials }, i) => (
              <motion.article
                key={name}
                className="rounded-2xl border border-white/10 bg-zinc-950/60 p-6 backdrop-blur-xl"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
              >
                <div className="mb-4 flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <svg key={s} className="h-4 w-4 fill-violet-400" viewBox="0 0 20 20" aria-hidden>
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <blockquote className="text-sm leading-relaxed text-zinc-300">
                  &ldquo;{quote}&rdquo;
                </blockquote>
                <div className="mt-5 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-500/20 text-xs font-semibold text-violet-200">
                    {initials}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-100">{name}</p>
                    <p className="text-xs text-zinc-500">{title}</p>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="relative z-10 mx-auto w-full max-w-6xl scroll-mt-24 px-6 py-20">
        <motion.div {...fadeUp} className="mb-12 text-center">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Simple, transparent pricing</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-zinc-400">
            AgentGrid is free to self-host. You only pay your LLM provider for API usage — we never mark it up.
          </p>
        </motion.div>
        <div className="mx-auto grid max-w-4xl gap-5 md:grid-cols-2">
          {[
            {
              name: 'Open Source',
              price: '$0',
              period: 'forever',
              description: 'Self-host on your own infrastructure. Full access to all features.',
              features: [
                'Unlimited agents',
                'All workspace tools',
                'Session history & cost tracking',
                'Google OAuth + credentials auth',
                'Bring your own LLM key',
                'Community support',
              ],
              cta: 'Get started free',
              href: '/register',
              highlight: false,
            },
            {
              name: 'Cloud (Coming Soon)',
              price: 'TBD',
              period: 'per month',
              description: 'Hosted, always-on, with persistent workspaces and team access.',
              features: [
                'Everything in Open Source',
                'Managed hosting',
                'Persistent cloud workspace',
                'Team collaboration',
                'Priority support',
                'Early access to new features',
              ],
              cta: 'Join the waitlist',
              href: '#about',
              highlight: true,
            },
          ].map(({ name, price, period, description, features: feats, cta, href, highlight }, i) => (
            <motion.div
              key={name}
              className={`relative rounded-2xl border p-7 backdrop-blur-xl ${highlight ? 'border-violet-400/40 bg-violet-500/10' : 'border-white/10 bg-white/[0.03]'}`}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
            >
              {highlight && (
                <span className="absolute right-5 top-5 rounded-full border border-violet-400/30 bg-violet-500/20 px-2.5 py-0.5 text-xs font-medium text-violet-200">
                  Coming Soon
                </span>
              )}
              <p className="text-sm font-medium text-zinc-400">{name}</p>
              <p className="mt-1 text-4xl font-bold tracking-tight text-white">{price}</p>
              <p className="text-xs text-zinc-500">{period}</p>
              <p className="mt-3 text-sm leading-relaxed text-zinc-400">{description}</p>
              <ul className="mt-5 space-y-2.5">
                {feats.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-zinc-300">
                    <svg className="h-4 w-4 shrink-0 text-violet-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={href}
                className={`mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${highlight ? 'bg-violet-500 text-white hover:bg-violet-400' : 'border border-white/15 bg-white/[0.05] text-zinc-100 hover:bg-white/[0.1]'}`}
              >
                {cta}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="relative z-10 border-t border-white/10 bg-white/[0.02] py-20">
        <div className="mx-auto w-full max-w-3xl px-6">
          <motion.div {...fadeUp} className="mb-12 text-center">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Frequently asked questions</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-zinc-400">
              If something isn&apos;t answered here, open an issue on GitHub.
            </p>
          </motion.div>
          <motion.div
            className="rounded-2xl border border-white/10 bg-zinc-950/60 px-6 backdrop-blur-xl"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            {faqs.map(({ q, a }) => (
              <FaqItem key={q} q={q} a={a} />
            ))}
          </motion.div>
        </div>
      </section>

      {/* About */}
      <motion.section
        id="about"
        className="relative z-10 mx-auto w-full max-w-6xl scroll-mt-24 px-6 py-20"
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="rounded-3xl border border-white/15 bg-white/[0.03] p-8 backdrop-blur-xl sm:p-10">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-400/25 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-200">
            <Info className="h-3.5 w-3.5" />
            About this project
          </div>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">AgentGrid</h2>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-zinc-300">
            AgentGrid is a visual workspace for running and supervising multiple AI agents: live logs, session
            history, and a dedicated flow for approving tools before they execute.
          </p>
          <div className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] p-5 sm:p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-amber-200/90">
              Built with AI assistance
            </h3>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-300">
              This application was produced almost entirely with{' '}
              <span className="font-medium text-zinc-100">AI-assisted development tools</span>, including{' '}
              <span className="font-medium text-zinc-100">Google Gemini</span>,{' '}
              <span className="font-medium text-zinc-100">Claude Code</span>, and{' '}
              <span className="font-medium text-zinc-100">Cursor</span>. A human contributed only light steering
              — goals, occasional course corrections, and final checks — rather than writing most of the codebase by
              hand.
            </p>
            <p className="mt-3 text-xs text-zinc-500">
              If something looks off, treat it as a collaboration between those tools and minimal human editing, not a
              traditionally authored product.
            </p>
          </div>
        </div>
      </motion.section>

      {/* CTA */}
      <motion.section
        className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-24"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <div className="rounded-3xl border border-white/15 bg-gradient-to-br from-violet-500/15 via-white/[0.04] to-cyan-500/10 p-8 text-center backdrop-blur-xl sm:p-12">
          <h2 className="text-2xl font-semibold sm:text-3xl">Ready to orchestrate your agents?</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-zinc-400">
            Create an account or jump straight into the dashboard if you already have access.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-violet-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-violet-400"
            >
              Get started free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href={isLoggedIn ? '/dashboard' : '/login'}
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/[0.06] px-6 py-3 text-sm text-zinc-100 transition hover:bg-white/[0.1]"
            >
              {isLoggedIn ? 'Go to dashboard' : 'Sign in'}
            </Link>
          </div>
        </div>
      </motion.section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 bg-black/30">
        <div className="mx-auto w-full max-w-6xl px-6 py-12">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {/* Brand */}
            <div className="lg:col-span-1">
              <div className="mb-3 flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/15 bg-white/[0.05]">
                  <Bot className="h-4 w-4 text-violet-300" />
                </div>
                <span className="text-sm font-semibold tracking-tight">AgentGrid</span>
              </div>
              <p className="text-xs leading-relaxed text-zinc-500">
                Visual multi-agent workspace. Built for clarity, control, and human-in-the-loop AI execution.
              </p>
            </div>

            {/* Product */}
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">Product</p>
              <ul className="space-y-2">
                {[
                  { label: 'Features', href: '#features' },
                  { label: 'How it works', href: '#how-it-works' },
                  { label: 'Pricing', href: '#pricing' },
                  { label: 'FAQ', href: '#faq' },
                ].map(({ label, href }) => (
                  <li key={label}>
                    <Link href={href} className="text-sm text-zinc-500 transition hover:text-zinc-200">{label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Account */}
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">Account</p>
              <ul className="space-y-2">
                {[
                  { label: 'Sign in', href: '/login' },
                  { label: 'Register', href: '/register' },
                  { label: 'Dashboard', href: '/dashboard' },
                ].map(({ label, href }) => (
                  <li key={label}>
                    <Link href={href} className="text-sm text-zinc-500 transition hover:text-zinc-200">{label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Project */}
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">Project</p>
              <ul className="space-y-2">
                {[
                  { label: 'About', href: '#about' },
                  { label: 'GitHub', href: 'https://github.com' },
                  { label: 'Report an issue', href: 'https://github.com' },
                ].map(({ label, href }) => (
                  <li key={label}>
                    <Link href={href} className="text-sm text-zinc-500 transition hover:text-zinc-200">{label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-8 sm:flex-row">
            <p className="text-xs text-zinc-600">© {new Date().getFullYear()} AgentGrid. Open source and free to self-host.</p>
            <p className="text-xs text-zinc-600">Built with AI assistance — see <Link href="#about" className="text-zinc-400 underline-offset-2 hover:underline">About</Link></p>
          </div>
        </div>
      </footer>
    </main>
  );
}
