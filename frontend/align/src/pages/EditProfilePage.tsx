import React, { useState, useEffect } from 'react';
import { FiPlus, FiSave, FiUser, FiBook, FiCalendar, FiBriefcase, FiX } from 'react-icons/fi';
// 1. Import the new fetchAuthSession function from 'aws-amplify/auth'
import { fetchAuthSession } from 'aws-amplify/auth';

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
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // State for adding new skills and projects
    const [newSkill, setNewSkill] = useState('');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_newProject, _setNewProject] = useState({ title: '', description: '' });

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

            alert('Profile updated successfully!');
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
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Edit Profile</h1>
                <p className="text-slate-500 dark:text-white/40 text-sm mt-1">
                    Keep your information up to date for better internship matches.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Avatar card */}
                <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6 flex flex-col items-center text-center">
                    <div className="relative mb-4">
                        <img
                            src={profile.profile_picture_url || `https://ui-avatars.com/api/?name=${encodeURIComponent((profile.first_name || '') + ' ' + (profile.last_name || ''))}&background=6366f1&color=fff&size=128`}
                            alt="Profile"
                            className="w-24 h-24 rounded-full object-cover border-4 border-white dark:border-white/10 shadow-lg"
                        />
                        <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-emerald-500 rounded-full border-2 border-white dark:border-[#0d0d1a] flex items-center justify-center">
                            <FiUser className="text-white text-xs" />
                        </div>
                    </div>
                    <h2 className="font-bold text-slate-800 dark:text-white text-lg leading-tight">
                        {profile.first_name} {profile.last_name}
                    </h2>
                    <p className="text-slate-500 dark:text-white/40 text-sm mt-0.5">{profile.email}</p>
                    <div className="mt-4 w-full pt-4 border-t border-slate-100 dark:border-white/10 space-y-2 text-sm text-left">
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
                </div>

                {/* Right column */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Details card */}
                    <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6">
                        <h2 className="text-base font-bold text-slate-800 dark:text-white mb-5">Your Details</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                                { name: 'university', placeholder: 'University', icon: FiBook },
                                { name: 'major', placeholder: 'Major', icon: FiBriefcase },
                                { name: 'graduation_year', placeholder: 'Graduation Year', icon: FiCalendar, type: 'number' },
                                { name: 'preferred_job_role', placeholder: 'Preferred Job Role', icon: FiBriefcase },
                            ].map(({ name, placeholder, icon: Icon, type }) => (
                                <div key={name} className="relative">
                                    <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/30 text-sm" />
                                    <input
                                        type={type || 'text'}
                                        name={name}
                                        value={(profile[name as keyof UserProfile] as string | number) ?? ''}
                                        onChange={handleProfileChange}
                                        placeholder={placeholder}
                                        className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-500/50 transition-colors"
                                    />
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={handleProfileUpdate}
                            className="mt-5 flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-indigo-500/25"
                        >
                            <FiSave />
                            Save Changes
                        </button>
                    </div>

                    {/* Skills card */}
                    <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6">
                        <h2 className="text-base font-bold text-slate-800 dark:text-white mb-4">Skills</h2>
                        <div className="flex flex-wrap gap-2 mb-5">
                            {profile.skills.length === 0 && (
                                <p className="text-slate-400 dark:text-white/30 text-sm">No skills added yet.</p>
                            )}
                            {profile.skills.map((skill) => (
                                <span
                                    key={skill.id}
                                    className="inline-flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-500/20 px-3 py-1 rounded-full text-sm font-medium"
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
                                placeholder="Add a skill (e.g. Python)"
                                className="flex-1 px-4 py-2.5 text-sm bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-500/50 transition-colors"
                            />
                            <button
                                onClick={handleAddSkill}
                                className="px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity"
                            >
                                <FiPlus />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditProfilePage;