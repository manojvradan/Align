import React, { useEffect, useMemo, useState } from 'react';
import { FiBriefcase, FiBookmark, FiPlus, FiMapPin, FiZap, FiArrowUpRight } from 'react-icons/fi';
import axios from 'axios';
import Icon from '../components/Icon';
import JobCard from '../components/JobCard';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../api/axiosConfig';
import { getCached, isFresh, setCached, TTL } from '../api/cache';

const APPLIED_KEY = '/users/me/applied-jobs';
const SAVED_IDS_KEY = '/users/me/saved-jobs/ids';

interface Job {
  id: number;
  title: string;
  company: string;
  location: string;
  url: string;
  source: string;
  isRecommended?: boolean;
  matchReason?: string;
}

const StatCard: React.FC<{
  icon: React.ElementType;
  value: number;
  label: string;
  gradient: string;
  to: string;
}> = ({ icon, value, label, gradient, to }) => (
  <Link to={to} className="block group">
    <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6 flex items-center gap-4 transition-all duration-200 group-hover:shadow-lg group-hover:border-slate-300 dark:group-hover:border-white/20">
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg shrink-0`}>
        <Icon as={icon} className="text-white text-xl" />
      </div>
      <div>
        <div className="text-3xl font-extrabold text-slate-800 dark:text-white leading-tight">{value}</div>
        <div className="text-sm text-slate-500 dark:text-white/40 group-hover:text-slate-700 dark:group-hover:text-white/60">
          {label}
        </div>
      </div>
    </div>
  </Link>
);

const Dashboard: React.FC = () => {
  const { user } = useAuth(); 
  const navigate = useNavigate();
  const firstName = user?.full_name?.split(' ')[0];

  // State for dynamic data — initialised from cache so revisits skip the skeleton
  const [recentApplications, setRecentApplications] = useState<Job[]>(
    () => (getCached<Job[]>(APPLIED_KEY) ?? []).slice(-2).reverse()
  );
  const [appliedCount, setAppliedCount] = useState(
    () => getCached<Job[]>(APPLIED_KEY)?.length ?? 0
  );
  const [savedCount, setSavedCount] = useState(
    () => getCached<number[]>(SAVED_IDS_KEY)?.length ?? 0
  );
  const [isLoading, setIsLoading] = useState(() => getCached(APPLIED_KEY) === null);
  const [recommendedJobs, setRecommendedJobs] = useState<Job[]>([]);
  const [isLoadingRecs, setIsLoadingRecs] = useState(true);
  const [recsComputing, setRecsComputing] = useState(false);

  const RECOMMENDATION_SERVICE_URL =
    import.meta.env.VITE_RECOMMENDATION_URL || 'http://localhost:8002';

  // Fetch Dashboard Data
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user?.id) return;

      // Both caches fresh — nothing to do
      if (isFresh(APPLIED_KEY, TTL.MEDIUM) && isFresh(SAVED_IDS_KEY, TTL.MEDIUM)) {
        setIsLoading(false);
        return;
      }

      // Only show skeleton when there is no cached data at all
      if (getCached(APPLIED_KEY) === null) setIsLoading(true);

      try {
        const [appliedRes, savedIdsRes] = await Promise.all([
          apiClient.get(APPLIED_KEY),
          apiClient.get(SAVED_IDS_KEY),
        ]);

        const appliedJobs = appliedRes.data;
        setCached(APPLIED_KEY, appliedJobs);
        setCached(SAVED_IDS_KEY, savedIdsRes.data);

        setAppliedCount(appliedJobs.length);
        setRecentApplications(appliedJobs.slice(-2).reverse());
        setSavedCount(savedIdsRes.data.length);
      } catch (error) {
        console.error("Error loading dashboard:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [user?.id]);

  // Fetch AI Recommended Jobs for the right column marquee
  useEffect(() => {
    if (!user?.id) return;

    let pollInterval: ReturnType<typeof setInterval> | null = null;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    let mounted = true;

    const stopPolling = () => {
      if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
    };

    const applyRecs = (data: { recommendations: (Job & { match_reason?: string })[] }) => {
      if (!mounted) return;
      const recs: Job[] = (data.recommendations || []).map((job) => ({
        ...job,
        isRecommended: true,
        matchReason: job.match_reason,
      }));
      setRecommendedJobs(recs);
      setIsLoadingRecs(false);
      setRecsComputing(false);
    };

    // Poll the main recommendations endpoint directly every 3s.
    // Avoids a separate /status CORS request; resolves as soon as computing=false.
    // Calls onComplete() once results are applied so the caller can schedule a refresh.
    const startPolling = (onComplete: () => void) => {
      stopPolling();
      pollInterval = setInterval(async () => {
        if (!mounted) { stopPolling(); return; }
        try {
          const res = await axios.get(
            `${RECOMMENDATION_SERVICE_URL}/recommendations/${user.id}`,
            { timeout: 10000 }
          );
          if (!mounted) { stopPolling(); return; }
          if (!res.data.computing) {
            stopPolling();
            applyRecs(res.data);
            onComplete();
          }
          // else: still computing — keep polling
        } catch { /* transient error — keep polling */ }
      }, 3000);
    };

    const fetchRecommendations = async () => {
      if (!mounted) return;
      if (refreshTimer) { clearTimeout(refreshTimer); refreshTimer = null; }

      // Schedule a re-fetch ~90s from now so the cache stays warm while the
      // user remains on the page (backend TTL is 120s).
      const scheduleRefresh = () => {
        if (refreshTimer) clearTimeout(refreshTimer);
        refreshTimer = setTimeout(() => { if (mounted) fetchRecommendations(); }, 90_000);
      };

      setIsLoadingRecs(true);
      setRecsComputing(false);
      try {
        const res = await axios.get(
          `${RECOMMENDATION_SERVICE_URL}/recommendations/${user.id}`,
          { timeout: 10000 }
        );
        if (!mounted) return;
        if (res.data.computing) {
          // Backend kicked off background computation — poll until ready
          setRecsComputing(true);
          startPolling(scheduleRefresh);
        } else {
          applyRecs(res.data);
          scheduleRefresh();
        }
      } catch (err) {
        if (!mounted) return;
        console.warn('Recommendation service unavailable', err);
        setRecommendedJobs([]);
        setIsLoadingRecs(false);
        setRecsComputing(false);
      }
    };

    fetchRecommendations();
    return () => {
      mounted = false;
      stopPolling();
      if (refreshTimer) clearTimeout(refreshTimer);
    };
  }, [user?.id, RECOMMENDATION_SERVICE_URL]);

  if (isLoading) {
    return (
      <div>
        {/* Page header skeleton */}
        <div className="mb-8">
          <div className="h-8 w-64 bg-slate-200 dark:bg-white/10 rounded-lg animate-pulse mb-2" />
          <div className="h-4 w-48 bg-slate-200 dark:bg-white/10 rounded-lg animate-pulse" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Stat cards skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[0, 1].map((i) => (
                <div key={i} className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-white/10 animate-pulse shrink-0" />
                  <div className="space-y-2 flex-1">
                    <div className="h-7 w-12 bg-slate-200 dark:bg-white/10 rounded animate-pulse" />
                    <div className="h-4 w-24 bg-slate-200 dark:bg-white/10 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>

            {/* Recent applications skeleton */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <div className="h-5 w-40 bg-slate-200 dark:bg-white/10 rounded animate-pulse" />
                <div className="h-8 w-28 bg-slate-200 dark:bg-white/10 rounded-lg animate-pulse" />
              </div>
              <div className="space-y-3">
                {[0, 1].map((i) => (
                  <div key={i} className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-5">
                    <div className="flex justify-between mb-4">
                      <div className="space-y-2">
                        <div className="h-5 w-48 bg-slate-200 dark:bg-white/10 rounded animate-pulse" />
                        <div className="h-4 w-32 bg-slate-200 dark:bg-white/10 rounded animate-pulse" />
                      </div>
                      <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-white/10 animate-pulse" />
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="h-4 w-28 bg-slate-200 dark:bg-white/10 rounded animate-pulse" />
                      <div className="h-4 w-20 bg-slate-200 dark:bg-white/10 rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right column skeleton */}
          <div className="space-y-4">
            <div className="bg-slate-200 dark:bg-white/10 rounded-2xl h-40 animate-pulse" />
            <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl h-44 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* AI computing banner — visible while the rest of the dashboard is fully usable */}
      {recsComputing && (
        <div className="flex items-center gap-2.5 px-4 py-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl mb-5 text-sm">
          <div className="relative w-4 h-4 shrink-0">
            <div className="absolute inset-0 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
          </div>
          <span className="text-indigo-600 dark:text-indigo-300 font-medium">
            AI is preparing your personalised recommendations&hellip;
          </span>
        </div>
      )}

      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
          Welcome back,{' '}
          <span className="bg-gradient-to-r from-indigo-500 to-violet-500 bg-clip-text text-transparent">
            {firstName || 'User'}
          </span>{' '}
          👋
        </h1>
        <p className="text-slate-500 dark:text-white/40 mt-1 text-sm">
          Here's what's happening with your job search today.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">

          {/* Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StatCard
              to="/applied"
              icon={FiBriefcase}
              value={appliedCount}
              label="Jobs Applied"
              gradient="from-indigo-500 to-violet-600"
            />
            <StatCard
              to="/saved"
              icon={FiBookmark}
              value={savedCount}
              label="Jobs Saved"
              gradient="from-orange-400 to-pink-500"
            />
          </div>

          {/* Recent Applications */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base font-bold text-slate-800 dark:text-white">Recent Applications</h2>
              <button
                onClick={() => navigate('/jobs')}
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-lg font-semibold text-xs hover:opacity-90 transition-opacity shadow-lg shadow-indigo-500/25"
              >
                <Icon as={FiPlus} className="text-sm" />
                Find New Jobs
              </button>
            </div>

            <div className="space-y-3">
              {recentApplications.length > 0 ? (
                recentApplications.map((job) => (
                  <div key={job.id}>
                    <JobCard
                      job={job}
                      isApplied={true}
                      onViewJob={() => window.open(job.url, '_blank')}
                    />
                  </div>
                ))
              ) : (
                <div className="bg-white dark:bg-white/5 border border-dashed border-slate-300 dark:border-white/15 rounded-2xl p-8 text-center">
                  <p className="text-slate-500 dark:text-white/40 mb-2 text-sm">
                    You haven't applied to any jobs yet.
                  </p>
                  <Link to="/jobs" className="text-indigo-500 font-semibold hover:underline text-sm">
                    Start browsing internships
                  </Link>
                </div>
              )}
            </div>

            {recentApplications.length > 0 && (
              <div className="mt-4 text-center">
                <Link
                  to="/applied"
                  className="text-sm font-semibold text-slate-400 dark:text-white/30 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
                >
                  View all applications →
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <RecommendedJobsMarquee
            jobs={recommendedJobs}
            isLoading={isLoadingRecs}
            isComputing={recsComputing}
          />
        </div>
      </div>
    </div>
  );
};

interface RecommendedJobsMarqueeProps {
  jobs: Job[];
  isLoading: boolean;
  isComputing?: boolean;
}

const RecommendedJobsMarquee: React.FC<RecommendedJobsMarqueeProps> = ({
  jobs,
  isLoading,
  isComputing = false,
}) => {
  // Duplicate the list so the vertical scroll can loop seamlessly.
  const loopedJobs = useMemo(() => [...jobs, ...jobs], [jobs]);

  // Slow the scroll down a bit for longer lists so cards stay readable.
  const durationSeconds = Math.max(20, jobs.length * 5);

  return (
    <div className="relative bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-5 overflow-hidden transition-colors duration-300">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <Icon as={FiZap} className="text-white text-sm" />
          </div>
          <h2 className="font-bold text-base text-slate-800 dark:text-white">
            AI Recommended
          </h2>
        </div>
        <Link
          to="/jobs"
          className="text-xs font-semibold text-slate-400 dark:text-white/40 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
        >
          See all
        </Link>
      </div>

      {isLoading ? (
        isComputing ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <div className="relative w-10 h-10">
              <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Icon as={FiZap} className="text-indigo-500 text-xs" />
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-white/40 text-center leading-relaxed">
              AI is finding your<br />best matches&hellip;
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl h-24 animate-pulse"
              />
            ))}
          </div>
        )
      ) : jobs.length === 0 ? (
        <div className="bg-slate-50 dark:bg-white/5 border border-dashed border-slate-300 dark:border-white/15 rounded-xl p-6 text-center">
          <p className="text-slate-500 dark:text-white/40 text-sm mb-2">
            No recommendations yet.
          </p>
          <Link
            to="/profile"
            className="text-indigo-500 font-semibold hover:underline text-sm"
          >
            Complete your profile
          </Link>
        </div>
      ) : (
        <div
          className="relative h-[28rem] overflow-hidden marquee-mask group"
          style={{ ['--marquee-duration' as string]: `${durationSeconds}s` }}
        >
          <div className="flex flex-col gap-3 animate-marquee-y group-hover:[animation-play-state:paused]">
            {loopedJobs.map((job, idx) => (
              <RecommendedJobItem key={`${job.id}-${idx}`} job={job} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const RecommendedJobItem: React.FC<{ job: Job }> = ({ job }) => (
  <Link
    to="/jobs"
    state={{ openJobId: job.id }}
    className="block shrink-0 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-4 hover:border-indigo-400 dark:hover:border-indigo-400/60 hover:shadow-md transition-all"
  >
    <div className="flex items-start justify-between gap-2 mb-2">
      <div className="min-w-0">
        <h3 className="font-semibold text-sm text-slate-800 dark:text-white truncate">
          {job.title}
        </h3>
        <p className="text-xs text-slate-500 dark:text-white/50 truncate">
          {job.company}
        </p>
      </div>
      <Icon
        as={FiArrowUpRight}
        className="text-slate-400 dark:text-white/40 shrink-0"
      />
    </div>
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-white/40 min-w-0">
        <Icon as={FiMapPin} className="shrink-0" />
        <span className="truncate">{job.location || 'Remote'}</span>
      </div>
      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gradient-to-r from-indigo-500/10 to-violet-500/10 text-indigo-600 dark:text-indigo-300 border border-indigo-500/20 shrink-0">
        Match
      </span>
    </div>
  </Link>
);

export default Dashboard;