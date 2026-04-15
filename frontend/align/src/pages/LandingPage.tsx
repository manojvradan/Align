import React from 'react';
import { Link } from 'react-router-dom';
import {
  FiBriefcase,
  FiTarget,
  FiUploadCloud,
  FiArrowRight,
  FiCheckCircle,
} from 'react-icons/fi';

const features = [
  {
    icon: FiTarget,
    title: 'AI-Powered Matching',
    description:
      'Our recommendation engine learns your skills and preferences to surface the internships that truly fit you.',
    gradient: 'from-violet-500 to-indigo-500',
  },
  {
    icon: FiBriefcase,
    title: 'Multi-Domain Search',
    description:
      'Whether you study pharmacy, finance, or software engineering — we crawl and curate roles across every field.',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    icon: FiUploadCloud,
    title: 'Smart Resume Parsing',
    description:
      'Upload your resume once and let our parser extract skills automatically so you never fill a form twice.',
    gradient: 'from-emerald-500 to-teal-500',
  },
];

const steps = [
  {
    num: '01',
    title: 'Upload Your Resume',
    desc: 'Our AI parser extracts your skills and experience in seconds.',
  },
  {
    num: '02',
    title: 'Set Your Preferences',
    desc: 'Tell us your major, desired roles, and location preferences.',
  },
  {
    num: '03',
    title: 'Get Matched',
    desc: 'Receive curated internship recommendations tailored just for you.',
  },
];

const stats = [
  { value: '10,000+', label: 'Internships Indexed' },
  { value: '500+', label: 'Students Matched' },
  { value: '50+', label: 'Industries Covered' },
  { value: '95%', label: 'Satisfaction Rate' },
];

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#080810] text-white flex flex-col overflow-hidden">

      {/* ── Sticky blurred nav ── */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 backdrop-blur-xl bg-[#080810]/60">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-indigo-500 to-violet-600 w-9 h-9 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/40">
              <span className="text-white font-bold text-lg">A</span>
            </div>
            <span className="text-xl font-bold text-white tracking-tight">Align</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="px-5 py-2 text-sm font-semibold text-white/70 rounded-lg hover:bg-white/10 hover:text-white transition-all"
            >
              Log in
            </Link>
            <Link
              to="/register"
              className="px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-violet-600 rounded-lg hover:opacity-90 transition-opacity shadow-lg shadow-indigo-500/30"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative flex flex-col items-center justify-center text-center px-6 pt-44 pb-32 overflow-hidden">
        {/* Ambient glow blobs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-indigo-700/20 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-24 left-1/4 w-[500px] h-[500px] bg-violet-700/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-24 right-1/4 w-[400px] h-[400px] bg-blue-700/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/8 border border-white/15 text-white/70 text-xs font-medium px-4 py-1.5 rounded-full mb-8 backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            AI-powered internship matching
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold leading-[1.08] max-w-4xl tracking-tight">
            Land the internship
            <br />
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
              you actually want
            </span>
          </h1>

          <p className="mt-7 text-lg text-white/50 max-w-xl leading-relaxed">
            Align matches your skills, major, and career goals with curated
            internship opportunities — so you spend less time searching and more
            time preparing.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
            <Link
              to="/register"
              className="group flex items-center gap-2 px-8 py-4 text-white bg-gradient-to-r from-indigo-500 to-violet-600 rounded-xl font-semibold text-base hover:opacity-90 active:scale-[0.98] transition-all shadow-2xl shadow-indigo-500/40"
            >
              Create free account
              <FiArrowRight className="transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              to="/login"
              className="px-8 py-4 border border-white/15 text-white/70 rounded-xl font-semibold text-base hover:bg-white/10 hover:text-white hover:border-white/25 transition-all"
            >
              Sign in
            </Link>
          </div>

          {/* Trust line */}
          <p className="mt-8 flex items-center gap-2 text-white/30 text-sm">
            <FiCheckCircle className="text-emerald-400 shrink-0" />
            No credit card required &nbsp;·&nbsp; Always free for students
          </p>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <div className="relative z-10 border-y border-white/10 bg-white/[0.03] backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-3xl md:text-4xl font-extrabold text-white">{s.value}</div>
              <div className="text-sm text-white/40 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Features ── */}
      <section className="max-w-5xl mx-auto px-6 py-28">
        <div className="text-center mb-16">
          <span className="text-indigo-400 text-xs font-bold tracking-widest uppercase">Features</span>
          <h2 className="text-3xl md:text-4xl font-bold text-white mt-3">
            Everything you need to get hired
          </h2>
          <p className="text-white/40 mt-4 max-w-lg mx-auto">
            Built by students, for students. Align combines web crawling, AI, and
            a clean interface to simplify your internship hunt.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="group relative bg-white/[0.04] border border-white/10 rounded-2xl p-8 hover:bg-white/[0.07] hover:border-white/20 transition-all overflow-hidden"
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${f.gradient} opacity-0 group-hover:opacity-[0.06] transition-opacity rounded-2xl pointer-events-none`}
              />
              <div
                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center mb-5 shadow-lg`}
              >
                <f.icon size={22} className="text-white" />
              </div>
              <h3 className="font-bold text-lg text-white mb-2">{f.title}</h3>
              <p className="text-white/45 text-sm leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="border-y border-white/10 bg-white/[0.02]">
        <div className="max-w-5xl mx-auto px-6 py-28">
          <div className="text-center mb-16">
            <span className="text-indigo-400 text-xs font-bold tracking-widest uppercase">How it works</span>
            <h2 className="text-3xl md:text-4xl font-bold text-white mt-3">
              Up and running in minutes
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {steps.map((step, i) => (
              <div key={step.num} className="relative flex flex-col gap-4">
                {/* Connector line */}
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-6 left-full w-full h-px bg-gradient-to-r from-indigo-500/30 to-transparent pointer-events-none" />
                )}
                <div className="w-12 h-12 rounded-xl border border-indigo-500/30 bg-indigo-500/10 flex items-center justify-center shrink-0">
                  <span className="text-indigo-400 font-bold text-sm">{step.num}</span>
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">{step.title}</h3>
                  <p className="text-white/40 text-sm mt-1.5 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/40 via-violet-900/20 to-transparent pointer-events-none" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-indigo-600/15 rounded-full blur-[100px] pointer-events-none" />
        <div className="relative max-w-3xl mx-auto text-center px-6 py-28">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to align your career?
          </h2>
          <p className="text-white/50 mb-10 max-w-lg mx-auto text-lg leading-relaxed">
            Join hundreds of students who stopped doom-scrolling job boards and
            started getting matched.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-xl font-semibold text-base hover:opacity-90 active:scale-[0.98] transition-all shadow-2xl shadow-indigo-500/30"
          >
            Get Started — it's free
            <FiArrowRight />
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/10 py-8 text-center text-sm text-white/25">
        &copy; {new Date().getFullYear()} Align. Built with purpose.
      </footer>
    </div>
  );
};

export default LandingPage;
