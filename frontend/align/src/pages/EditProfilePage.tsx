import React, { useState, useEffect, useRef } from 'react';
import { FiPlus, FiSave, FiBook, FiCalendar, FiBriefcase, FiX, FiCamera, FiUser, FiTarget, FiCheckCircle } from 'react-icons/fi';
import { fetchAuthSession } from 'aws-amplify/auth';
import { useAuth } from '../context/AuthContext';

// Define the types for your data structures
interface Skill {
    id: number;
    name: string;
}

interface Project {
    id: number;
    title: string;
    description: string;
}

interface UserProfile {
    first_name: string;
    last_name: string;
    email: string;
    university: string | null;
    major: string | null;
    graduation_year: number | null;
    skills: Skill[];
    projects: Project[];
    profile_picture_url?: string;
    preferred_job_role?: string;
}

const EditProfilePage: React.FC = () => {
    const { fetchUserProfile } = useAuth();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
    const photoInputRef = useRef<HTMLInputElement>(null);

    // State for adding new skills and projects
    const [newSkill, setNewSkill] = useState('');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_newProject, _setNewProject] = useState({ title: '', description: '' });
    const [saveSuccess, setSaveSuccess] = useState(false);

    // API endpoints
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

    // 2. The getAuthHeaders function is updated for Amplify v6
    const getAuthHeaders = async (): Promise<Record<string, string>> => {
        try {
            // Use the new fetchAuthSession API
            const session = await fetchAuthSession();
            
            // Access tokens via the 'tokens' property and use toString()
            const idToken = session.tokens?.idToken?.toString();

            if (!idToken) {
                throw new Error("No ID token found in session.");
            }

            return {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`,
            };
        } catch (e) {
            console.error('Error getting auth session:', e);
            // Return headers without auth, which will be correctly rejected
            return { 'Content-Type': 'application/json' };
        }
    };

    useEffect(() => {
        const fetchProfile = async () => {
            setIsLoading(true);
            try {
                const headers = await getAuthHeaders();

                if (!headers.Authorization) {
                    throw new Error('You are not logged in. Please sign in to view your profile.');
                }
                
                const response = await fetch(`${API_BASE_URL}/users/me/`, { headers });

                if (response.status === 401) {
                    throw new Error('Your session has expired. Please log in again.');
                }
                if (!response.ok) {
                    throw new Error('Failed to fetch profile.');
                }
                
                const data = await response.json();
                setProfile(data);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchProfile();
    }, []);

    const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (profile) {
            setProfile({
                ...profile,
                [e.target.name]: e.target.value,
            });
        }
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const ALLOWED = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!ALLOWED.includes(file.type)) {
            setUploadError('Only JPEG, PNG, GIF, or WebP images are allowed.');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setUploadError('Image must be smaller than 5 MB.');
            return;
        }
        setIsUploadingPhoto(true);
        setUploadError(null);
        try {
            const session = await fetchAuthSession();
            const idToken = session.tokens?.idToken?.toString();
            if (!idToken) throw new Error('Not authenticated.');
            const formData = new FormData();
            formData.append('file', file);
            const response = await fetch(`${API_BASE_URL}/users/me/profile-picture`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${idToken}` },
                body: formData,
            });
            if (!response.ok) throw new Error('Failed to upload photo.');
            const updated = await response.json();
            setProfile((prev) => prev ? { ...prev, profile_picture_url: updated.profile_picture_url } : prev);
            // Sync the global auth context so Header updates immediately
            await fetchUserProfile();
        } catch (err: any) {
            setUploadError(err.message);
        } finally {
            setIsUploadingPhoto(false);
            // Reset the file input so the same file can be re-selected
            if (photoInputRef.current) photoInputRef.current.value = '';
        }
    };

    const handleAddSkill = async () => {
        if (!newSkill.trim() || !profile) return;
        try {
            const headers = await getAuthHeaders();
            const response = await fetch(`${API_BASE_URL}/users/me/skills/`, {
                method: 'POST',
                headers,
                body: JSON.stringify([{ name: newSkill }]),
            });

            if (!response.ok) throw new Error('Failed to add skill.');
            
            const updatedProfile = await response.json();
            setProfile(updatedProfile);
            setNewSkill('');

        } catch (err: any) {
            setError(err.message);
        }
    };
    
    const handleProfileUpdate = async () => {
        if (!profile) return;
        try {
            const headers = await getAuthHeaders();
            const response = await fetch(`${API_BASE_URL}/users/me/`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({
                    university: profile.university,
                    major: profile.major,
                    graduation_year: profile.graduation_year,
                    preferred_job_role: profile.preferred_job_role,
                }),
            });

            if (!response.ok) throw new Error('Failed to update profile.');

            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err: any) {
            setError(err.message);
        }
    };

    if (isLoading) {
        return (
            <div>
                <div className="mb-8">
                    <div className="h-8 w-56 bg-slate-200 dark:bg-white/10 rounded-lg animate-pulse mb-2" />
                    <div className="h-4 w-40 bg-slate-200 dark:bg-white/10 rounded animate-pulse" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl h-56 animate-pulse" />
                    <div className="lg:col-span-2 space-y-4">
                        <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl h-64 animate-pulse" />
                        <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl h-40 animate-pulse" />
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 text-center text-red-500 dark:text-red-400">{error}</div>
        );
    }

    if (!profile) return null;

    return (
        <div>
            {/* Page header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Profile</h1>
                <p className="text-slate-500 dark:text-white/40 text-sm mt-1">
                    Keep your information up to date for better internship matches.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

                {/* ── Left column: identity card ── */}
                <div className="space-y-4">
                    {/* Avatar + name card */}
                    <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6">
                        {/* Card title */}
                        <div className="flex items-center gap-2 mb-5">
                            <FiUser className="text-indigo-500 shrink-0" />
                            <h2 className="text-sm font-semibold text-slate-700 dark:text-white/70 uppercase tracking-wider">
                                Your Identity
                            </h2>
                        </div>

                        <div className="flex flex-col items-center text-center">
                            {/* Avatar */}
                            <div className="relative mb-4">
                                <input
                                    ref={photoInputRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/gif,image/webp"
                                    className="hidden"
                                    onChange={handlePhotoUpload}
                                />
                                <button
                                    type="button"
                                    onClick={() => photoInputRef.current?.click()}
                                    disabled={isUploadingPhoto}
                                    className="group relative block w-24 h-24 focus:outline-none"
                                    aria-label="Change profile photo"
                                >
                                    {profile.profile_picture_url ? (
                                        <img
                                            src={profile.profile_picture_url}
                                            alt="Profile"
                                            className="w-24 h-24 rounded-full object-cover border-4 border-indigo-400 dark:border-indigo-500 shadow-lg"
                                        />
                                    ) : (
                                        <div className="w-24 h-24 rounded-full border-4 border-dashed border-indigo-400 dark:border-indigo-500 flex items-center justify-center bg-indigo-50 dark:bg-indigo-500/10 shadow-lg">
                                            <svg viewBox="0 0 96 96" fill="none" className="w-20 h-20" aria-hidden="true">
                                                <circle cx="48" cy="38" r="18" fill="#a78bfa" />
                                                <ellipse cx="48" cy="74" rx="28" ry="16" fill="#a78bfa" opacity="0.65" />
                                            </svg>
                                        </div>
                                    )}
                                    <div className="absolute inset-0 rounded-full bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        {isUploadingPhoto ? (
                                            <svg className="animate-spin w-6 h-6 text-white" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                            </svg>
                                        ) : (
                                            <>
                                                <FiCamera className="text-white text-xl" />
                                                <span className="text-white text-[10px] mt-0.5 font-medium">Change</span>
                                            </>
                                        )}
                                    </div>
                                </button>
                                {uploadError && (
                                    <p className="absolute top-full mt-1 text-[10px] text-red-400 w-32 text-center -translate-x-4">{uploadError}</p>
                                )}
                            </div>

                            <h3 className="font-bold text-slate-800 dark:text-white text-lg leading-tight">
                                {profile.first_name} {profile.last_name}
                            </h3>
                            <p className="text-slate-500 dark:text-white/40 text-sm mt-0.5">{profile.email}</p>
                        </div>

                        {/* Summary row */}
                        {(profile.university || profile.major || profile.graduation_year) && (
                            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-white/10 space-y-2.5 text-sm">
                                {profile.university && (
                                    <div className="flex items-center gap-2 text-slate-600 dark:text-white/50">
                                        <FiBook className="shrink-0 text-indigo-500" />
                                        <span className="truncate">{profile.university}</span>
                                    </div>
                                )}
                                {profile.major && (
                                    <div className="flex items-center gap-2 text-slate-600 dark:text-white/50">
                                        <FiBriefcase className="shrink-0 text-violet-500" />
                                        <span className="truncate">{profile.major}</span>
                                    </div>
                                )}
                                {profile.graduation_year && (
                                    <div className="flex items-center gap-2 text-slate-600 dark:text-white/50">
                                        <FiCalendar className="shrink-0 text-emerald-500" />
                                        <span>Class of {profile.graduation_year}</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Skills card (left, compact) */}
                    <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <FiTarget className="text-violet-500 shrink-0" />
                            <h2 className="text-sm font-semibold text-slate-700 dark:text-white/70 uppercase tracking-wider">
                                Skills
                            </h2>
                            <span className="ml-auto text-xs text-slate-400 dark:text-white/30">
                                {profile.skills.length} added
                            </span>
                        </div>

                        <div className="flex flex-wrap gap-1.5 mb-4 min-h-[2rem]">
                            {profile.skills.length === 0 && (
                                <p className="text-slate-400 dark:text-white/30 text-xs">No skills added yet.</p>
                            )}
                            {profile.skills.map((skill) => (
                                <span
                                    key={skill.id}
                                    className="inline-flex items-center gap-1 bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-500/20 px-2.5 py-0.5 rounded-full text-xs font-medium"
                                >
                                    {skill.name}
                                    <button
                                        className="text-indigo-400 dark:text-indigo-400/60 hover:text-indigo-600 dark:hover:text-indigo-200 transition-colors"
                                        onClick={() => setProfile({ ...profile, skills: profile.skills.filter(s => s.id !== skill.id) })}
                                        aria-label={`Remove ${skill.name}`}
                                    >
                                        <FiX className="w-3 h-3" />
                                    </button>
                                </span>
                            ))}
                        </div>

                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newSkill}
                                onChange={(e) => setNewSkill(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddSkill()}
                                placeholder="Add a skill…"
                                className="flex-1 px-3 py-2 text-sm bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-500/50 transition-colors"
                            />
                            <button
                                onClick={handleAddSkill}
                                className="px-3 py-2 bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-xl text-sm hover:opacity-90 transition-opacity"
                                aria-label="Add skill"
                            >
                                <FiPlus />
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── Right column: editable details ── */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Academic details */}
                    <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6">
                        <div className="flex items-center gap-2 mb-6">
                            <FiBook className="text-indigo-500 shrink-0" />
                            <h2 className="text-sm font-semibold text-slate-700 dark:text-white/70 uppercase tracking-wider">
                                Academic Details
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {/* University */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-slate-500 dark:text-white/40 uppercase tracking-wide">
                                    University
                                </label>
                                <div className="relative">
                                    <FiBook className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/25 text-sm" />
                                    <input
                                        type="text"
                                        name="university"
                                        value={profile.university ?? ''}
                                        onChange={handleProfileChange}
                                        placeholder="e.g. MIT"
                                        className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-500/50 transition-colors"
                                    />
                                </div>
                            </div>

                            {/* Major */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-slate-500 dark:text-white/40 uppercase tracking-wide">
                                    Major / Field of Study
                                </label>
                                <div className="relative">
                                    <FiBriefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/25 text-sm" />
                                    <input
                                        type="text"
                                        name="major"
                                        value={profile.major ?? ''}
                                        onChange={handleProfileChange}
                                        placeholder="e.g. Computer Science"
                                        className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-500/50 transition-colors"
                                    />
                                </div>
                            </div>

                            {/* Graduation year */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-slate-500 dark:text-white/40 uppercase tracking-wide">
                                    Expected Graduation Year
                                </label>
                                <div className="relative">
                                    <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/25 text-sm" />
                                    <input
                                        type="number"
                                        name="graduation_year"
                                        value={profile.graduation_year ?? ''}
                                        onChange={handleProfileChange}
                                        placeholder="e.g. 2026"
                                        className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-500/50 transition-colors"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Career goals */}
                    <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6">
                        <div className="flex items-center gap-2 mb-1">
                            <FiTarget className="text-violet-500 shrink-0" />
                            <h2 className="text-sm font-semibold text-slate-700 dark:text-white/70 uppercase tracking-wider">
                                Career Goals
                            </h2>
                        </div>
                        <p className="text-xs text-slate-400 dark:text-white/30 mb-5 ml-6">
                            Used by the Skill Galaxy to surface the skills you need most.
                        </p>

                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-500 dark:text-white/40 uppercase tracking-wide">
                                Dream Job / Preferred Role
                            </label>
                            <div className="relative">
                                <FiBriefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/25 text-sm" />
                                <input
                                    type="text"
                                    name="preferred_job_role"
                                    value={profile.preferred_job_role ?? ''}
                                    onChange={handleProfileChange}
                                    placeholder="e.g. Frontend Engineer, Clinical Research Intern"
                                    className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-500/50 transition-colors"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Save button */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleProfileUpdate}
                            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-indigo-500/25"
                        >
                            <FiSave />
                            Save Changes
                        </button>
                        {saveSuccess && (
                            <span className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
                                <FiCheckCircle />
                                Saved successfully
                            </span>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
};

export default EditProfilePage;