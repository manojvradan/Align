import React, { useState, useEffect, useCallback } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';
import { FiPlus, FiX, FiRefreshCw, FiZap } from 'react-icons/fi';
import SkillGalaxy from '../components/SkillGalaxy';
import type { LiveSkillData } from '../components/SkillGalaxy';
import { getCached, isFresh, setCached, TTL } from '../api/cache';

const PROFILE_KEY = '/users/me/';

interface Skill { id: number; name: string }
interface UserProfile {
    skills: Skill[];
    preferred_job_role?: string | null;
    first_name: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const getAuthHeaders = async (): Promise<Record<string, string>> => {
    try {
        const session = await fetchAuthSession();
        const idToken = session.tokens?.idToken?.toString();
        if (!idToken) throw new Error('No ID token.');
        return { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` };
    } catch {
        return { 'Content-Type': 'application/json' };
    }
};

const SkillsPage: React.FC = () => {
    const [profile, setProfile] = useState<UserProfile | null>(
        () => getCached<UserProfile>(PROFILE_KEY)
    );
    const [isLoading, setIsLoading] = useState(() => getCached(PROFILE_KEY) === null);
    const [error, setError] = useState<string | null>(null);
    const [newSkill, setNewSkill] = useState('');
    const [addError, setAddError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [saveMsg, setSaveMsg] = useState<string | null>(null);
    // Live Gemini skill data
    const [liveData, setLiveData] = useState<LiveSkillData | null>(null);
    const [isFetchingLive, setIsFetchingLive] = useState(false);
    const [liveError, setLiveError] = useState<string | null>(null);

    const fetchLiveSkills = useCallback(async (role: string) => {
        setIsFetchingLive(true);
        setLiveError(null);
        try {
            const headers = await getAuthHeaders();
            if (!headers.Authorization) return;
            const res = await fetch(
                `${API_BASE_URL}/users/me/skills/for-role?role=${encodeURIComponent(role)}`,
                { headers }
            );
            if (!res.ok) throw new Error('Gemini unavailable');
            const data: LiveSkillData = await res.json();
            setLiveData(data);
        } catch (e: unknown) {
            // Non-fatal — fall back to static map silently
            setLiveError('Live skill data unavailable (GEMINI_API_KEY not set). Showing curated suggestions.');
        } finally {
            setIsFetchingLive(false);
        }
    }, []);

    const fetchProfile = useCallback(async () => {
        if (isFresh(PROFILE_KEY, TTL.PROFILE)) { setIsLoading(false); return; }
        if (getCached(PROFILE_KEY) === null) setIsLoading(true);
        setError(null);
        try {
            const headers = await getAuthHeaders();
            if (!headers.Authorization) throw new Error('Not authenticated.');
            const res = await fetch(`${API_BASE_URL}/users/me/`, { headers });
            if (!res.ok) throw new Error('Failed to load profile.');
            const data: UserProfile = await res.json();
            setCached(PROFILE_KEY, data);
            setProfile(data);
            if (data.preferred_job_role?.trim()) {
                fetchLiveSkills(data.preferred_job_role.trim());
            }
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Unknown error');
        } finally {
            setIsLoading(false);
        }
    }, [fetchLiveSkills]);;

    useEffect(() => { fetchProfile(); }, [fetchProfile]);

    const handleAddSkill = async () => {
        const trimmed = newSkill.trim();
        if (!trimmed || !profile) return;
        // Prevent duplicates (client-side guard)
        if (profile.skills.some(s => s.name.toLowerCase() === trimmed.toLowerCase())) {
            setAddError('You already have that skill.');
            return;
        }
        setIsSaving(true);
        setAddError(null);
        setSaveMsg(null);
        try {
            const headers = await getAuthHeaders();
            const res = await fetch(`${API_BASE_URL}/users/me/skills/`, {
                method: 'POST',
                headers,
                body: JSON.stringify([{ name: trimmed }]),
            });
            if (!res.ok) throw new Error('Failed to add skill.');
            setProfile(await res.json());
            setNewSkill('');
            setSaveMsg('Skill added!');
            setTimeout(() => setSaveMsg(null), 2500);
        } catch (e: unknown) {
            setAddError(e instanceof Error ? e.message : 'Error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleRemoveSkill = (skillId: number) => {
        if (!profile) return;
        // Optimistic UI — backend skill removal endpoint can be wired when available
        setProfile({ ...profile, skills: profile.skills.filter(s => s.id !== skillId) });
    };

    /* ------------------------------------------------------------------ */
    if (isLoading) {
        return (
            <div>
                <div className="mb-8">
                    <div className="h-7 w-40 bg-slate-200 dark:bg-white/10 rounded-lg animate-pulse mb-2" />
                    <div className="h-4 w-56 bg-slate-200 dark:bg-white/10 rounded animate-pulse" />
                </div>
                <div className="space-y-6">
                    <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl h-96 animate-pulse" />
                    <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl h-48 animate-pulse" />
                </div>
            </div>
        );
    }

    if (error) return <div className="p-8 text-center text-red-500 dark:text-red-400">{error}</div>;
    if (!profile) return null;

    return (
        <div>
            {/* Header */}
            <div className="mb-8 flex items-start justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Skills</h1>
                    <p className="text-slate-500 dark:text-white/40 text-sm mt-1">
                        See how your skills stack up against your dream role — and what to learn next.
                    </p>
                </div>
                <button
                    onClick={fetchProfile}
                    className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/50 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                >
                    <FiRefreshCw className={`text-base ${isFetchingLive ? 'animate-spin' : ''}`} />
                    {isFetchingLive ? 'Fetching live data…' : 'Refresh'}
                </button>
            </div>

            <div className="space-y-6">
                {/* Live data status banner */}
                {isFetchingLive && (
                    <div className="flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-xl px-4 py-2.5">
                        <FiZap className="animate-pulse shrink-0" />
                        Querying Gemini with Google Search grounding for live skill requirements…
                    </div>
                )}
                {liveError && !isFetchingLive && (
                    <div className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 rounded-xl px-4 py-2.5">
                        {liveError}
                    </div>
                )}

                {/* Galaxy — full width */}
                <SkillGalaxy
                    skills={profile.skills}
                    dreamRole={profile.preferred_job_role}
                    size="lg"
                    liveData={liveData}
                />

                {/* Manage skills card */}
                <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-base font-bold text-slate-800 dark:text-white">
                            My Skills
                            <span className="ml-2 text-xs font-normal text-slate-400 dark:text-white/30">
                                ({profile.skills.length} total)
                            </span>
                        </h2>
                        {saveMsg && (
                            <span className="text-xs text-emerald-600 dark:text-emerald-400 animate-pulse">
                                {saveMsg}
                            </span>
                        )}
                    </div>

                    {/* Skill chips */}
                    <div className="flex flex-wrap gap-2 mb-6 min-h-[2.5rem]">
                        {profile.skills.length === 0 && (
                            <p className="text-sm text-slate-400 dark:text-white/30">
                                No skills yet — add your first one below.
                            </p>
                        )}
                        {profile.skills.map((skill) => (
                            <span
                                key={skill.id}
                                className="inline-flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-500/20 px-3 py-1 rounded-full text-sm font-medium"
                            >
                                {skill.name}
                                <button
                                    onClick={() => handleRemoveSkill(skill.id)}
                                    aria-label={`Remove ${skill.name}`}
                                    className="text-indigo-400 dark:text-indigo-400/60 hover:text-indigo-600 dark:hover:text-indigo-200 transition-colors"
                                >
                                    <FiX className="w-3 h-3" />
                                </button>
                            </span>
                        ))}
                    </div>

                    {/* Add skill input */}
                    <div className="flex gap-2 items-start">
                        <div className="flex-1">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newSkill}
                                    onChange={(e) => { setNewSkill(e.target.value); setAddError(null); }}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddSkill()}
                                    placeholder="Add a skill (e.g. Python, Figma, Docker)"
                                    className="flex-1 px-4 py-2.5 text-sm bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-500/50 transition-colors"
                                />
                                <button
                                    onClick={handleAddSkill}
                                    disabled={isSaving || !newSkill.trim()}
                                    className="px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-xl font-semibold text-sm hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-1.5"
                                >
                                    {isSaving ? (
                                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                        </svg>
                                    ) : (
                                        <FiPlus />
                                    )}
                                    Add
                                </button>
                            </div>
                            {addError && (
                                <p className="mt-1.5 text-xs text-red-500 dark:text-red-400">{addError}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Tip card */}
                <div className="bg-gradient-to-br from-indigo-500/10 to-violet-500/10 border border-indigo-200/50 dark:border-indigo-500/20 rounded-2xl p-5 text-sm text-slate-600 dark:text-white/50">
                    <span className="font-semibold text-indigo-700 dark:text-indigo-300">Tip: </span>
                    Your dream role is set on the{' '}
                    <a href="/profile" className="underline underline-offset-2 text-indigo-600 dark:text-indigo-300 hover:text-indigo-800 dark:hover:text-indigo-100 transition-colors">
                        Profile page
                    </a>
                    . Change it there to re-generate your skill map for a different role.
                </div>
            </div>
        </div>
    );
};

export default SkillsPage;
