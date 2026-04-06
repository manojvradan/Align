import React, { useState, useEffect } from 'react';
import { FiPlus, FiSave, FiUpload } from 'react-icons/fi';
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
    const [newProject, setNewProject] = useState({ title: '', description: '' });

    // API endpoints
    const API_BASE_URL = 'http://127.0.0.1:8000';

    // 2. The getAuthHeaders function is updated for Amplify v6
    const getAuthHeaders = async () => {
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
        return <div className="p-8 text-center">Loading profile...</div>;
    }

    if (error) {
        return <div className="p-8 text-center text-red-600">{error}</div>;
    }
    
    if (!profile) {
        return null; // Or some placeholder
    }

    return (
        <div className="p-8 bg-gray-50 h-full">
            <h1 className="text-3xl font-bold text-gray-800 mb-8">Edit Your Profile</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Profile Picture Section */}
                <div className="lg:col-span-1">
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-xl font-bold mb-4">Profile Picture</h2>
                        <div className="flex flex-col items-center">
                            <img
                                src={profile.profile_picture_url || 'https://via.placeholder.com/150'}
                                alt="Profile"
                                className="w-32 h-32 rounded-full object-cover mb-4"
                            />
                            <button className="flex items-center bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600">
                                <FiUpload className="mr-2" />
                                Upload New Picture
                            </button>
                        </div>
                    </div>
                </div>

                {/* University and Details Section */}
                <div className="lg:col-span-2">
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-xl font-bold mb-4">Your Details</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input
                                type="text"
                                name="university"
                                value={profile.university || ''}
                                onChange={handleProfileChange}
                                placeholder="University"
                                className="p-2 border border-gray-300 rounded-md"
                            />
                            <input
                                type="text"
                                name="major"
                                value={profile.major || ''}
                                onChange={handleProfileChange}
                                placeholder="Major"
                                className="p-2 border border-gray-300 rounded-md"
                            />
                            <input
                                type="number"
                                name="graduation_year"
                                value={profile.graduation_year || ''}
                                onChange={handleProfileChange}
                                placeholder="Graduation Year"
                                className="p-2 border border-gray-300 rounded-md"
                            />
                            <input
                                type="text"
                                name="preferred_job_role"
                                value={profile.preferred_job_role || ''}
                                onChange={handleProfileChange}
                                placeholder="Graduation Year"
                                className="p-2 border border-gray-300 rounded-md"
                            />
                        </div>
                        <button 
                            onClick={handleProfileUpdate}
                            className="mt-6 flex items-center bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600"
                        >
                            <FiSave className="mr-2" />
                            Save Changes
                        </button>
                    </div>

                    {/* Skills Section */}
                    <div className="bg-white p-6 rounded-lg shadow-md mt-8">
                        <h2 className="text-xl font-bold mb-4">Your Skills</h2>
                        <div className="flex flex-wrap gap-2 mb-4">
                            {profile.skills.map(skill => (
                                <span key={skill.id} className="bg-gray-200 text-gray-800 px-3 py-1 rounded-full text-sm">
                                    {skill.name}
                                </span>
                            ))}
                        </div>
                        <div className="flex items-center">
                            <input
                                type="text"
                                value={newSkill}
                                onChange={(e) => setNewSkill(e.target.value)}
                                placeholder="Add a new skill"
                                className="p-2 border border-gray-300 rounded-md flex-grow"
                            />
                            <button 
                                onClick={handleAddSkill}
                                className="ml-2 bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600"
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