import React from 'react';
import { Link } from 'react-router-dom';
import { FiBriefcase, FiTarget, FiUploadCloud, FiArrowRight } from 'react-icons/fi';

const features = [
  {
    icon: FiTarget,
    title: 'AI-Powered Matching',
    description:
      'Our recommendation engine learns your skills and preferences to surface the internships that truly fit you.',
  },
  {
    icon: FiBriefcase,
    title: 'Multi-Domain Search',
    description:
      'Whether you study pharmacy, finance, or software engineering — we crawl and curate roles across every field.',
  },
  {
    icon: FiUploadCloud,
    title: 'Smart Resume Parsing',
    description:
      'Upload your resume once and let our parser extract skills automatically so you never fill a form twice.',
  },
];

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* ── Nav ── */}
      <header className="w-full border-b border-slate-100">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="bg-slate-800 w-9 h-9 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">A</span>
            </div>
            <span className="text-xl font-bold text-slate-800">Align</span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="px-5 py-2 text-sm font-semibold text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Log in
            </Link>
            <Link
              to="/register"
              className="px-5 py-2 text-sm font-semibold text-white bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24 md:py-32 bg-gradient-to-b from-slate-50 to-white">
        <div className="inline-flex items-center gap-2 bg-slate-100 text-slate-600 text-xs font-medium px-3 py-1 rounded-full mb-6">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          AI-powered internship matching
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 leading-tight max-w-3xl">
          Land the internship you{' '}
          <span className="bg-gradient-to-r from-indigo-500 to-violet-500 bg-clip-text text-transparent">
            actually want
          </span>
        </h1>

        <p className="mt-6 text-lg text-slate-500 max-w-xl">
          Align matches your skills, major, and career goals with curated
          internship opportunities — so you spend less time searching and more
          time preparing.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
          <Link
            to="/register"
            className="group flex items-center gap-2 px-7 py-3.5 text-white bg-slate-800 rounded-xl font-semibold text-base hover:bg-slate-700 active:scale-[0.98] transition-all shadow-lg shadow-slate-200"
          >
            Create free account
            <FiArrowRight className="transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            to="/login"
            className="px-7 py-3.5 border-2 border-slate-200 text-slate-700 rounded-xl font-semibold text-base hover:border-slate-300 hover:bg-slate-50 transition-all"
          >
            Sign in
          </Link>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <h2 className="text-center text-2xl md:text-3xl font-bold text-slate-800 mb-4">
          Everything you need to get hired
        </h2>
        <p className="text-center text-slate-500 mb-14 max-w-lg mx-auto">
          Built by students, for students. Align combines web crawling, AI, and
          a clean interface to simplify your internship hunt.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-slate-50 border border-slate-100 rounded-2xl p-8 hover:shadow-md hover:border-slate-200 transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center mb-5 text-slate-700">
                <f.icon size={22} />
              </div>
              <h3 className="font-bold text-lg text-slate-800 mb-2">{f.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA banner ── */}
      <section className="bg-slate-800 text-white">
        <div className="max-w-4xl mx-auto text-center px-6 py-16">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Ready to align your career?
          </h2>
          <p className="text-slate-300 mb-8 max-w-lg mx-auto">
            Join hundreds of students who stopped doom-scrolling job boards and
            started getting matched.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-white text-slate-800 rounded-xl font-semibold hover:bg-slate-100 active:scale-[0.98] transition-all"
          >
            Get Started — it's free
            <FiArrowRight />
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-100 py-8 text-center text-sm text-slate-400">
        &copy; {new Date().getFullYear()} Align. Built with purpose.
      </footer>
    </div>
  );
};

export default LandingPage;
