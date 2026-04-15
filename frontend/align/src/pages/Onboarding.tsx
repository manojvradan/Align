import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBook, FiTarget, FiCalendar, FiArrowRight, FiBriefcase, FiCheck, FiLoader, FiChevronLeft } from 'react-icons/fi';
import Icon from '../components/Icon'; 
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/axiosConfig';
import axios from 'axios';
import { FileUpload } from "../components/ui/file-upload";

const SUGGESTED_ROLES = [
  // Tech
  "Frontend Developer", "Backend Developer", "Full Stack Developer",
  "Data Scientist", "Product Manager", "UI/UX Designer", "Cybersecurity Analyst",
  // Business & Finance
  "Investment Banking Analyst", "Financial Analyst", "Management Consultant",
  "Marketing Coordinator", "Business Analyst", "HR Specialist", "Accountant",
  // Engineering
  "Mechanical Engineer", "Civil Engineer", "Electrical Engineer", "Chemical Engineer",
  // Creative & Arts
  "Graphic Designer", "Content Writer", "Video Editor", "Architect",
  // Science & Health
  "Research Assistant", "Lab Technician", "Biomedical Engineer", "Nurse", "Pharmacist",
  // Law & Policy
  "Legal Assistant", "Policy Analyst", "Journalist"
];

const PARSER_ENDPOINT = `${import.meta.env.VITE_RESUME_PARSER_URL || 'http://127.0.0.1:8001'}/upload-resume/`;

const Onboarding: React.FC = () => {
  const { user, updateUser, fetchUserProfile } = useAuth(); // <--- Get fetchUserProfile
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  
  const [formData, setFormData] = useState({
    university: user?.university || '',
    major: user?.major || '',
    graduation_year: user?.graduation_year || new Date().getFullYear() + 1,
    preferred_job_role: user?.preferred_job_role || ''
  });

   // Resume Data
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_resumeFile, setResumeFile] = useState<File | null>(null);
  const [extractedSkills, setExtractedSkills] = useState<string[]>([]);
  const [inferredSkills, setInferredSkills] = useState<string[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);

  const PARSE_STEPS = [
    'Reading your resume...',
    'Fetching skills from resume...',
    'Drawing parallels to job roles...',
    'LLM enriching your profile...',
    'Almost there...'
  ];
  const [parseStepIndex, setParseStepIndex] = useState(0);

  useEffect(() => {
    if (!isParsing) { setParseStepIndex(0); return; }
    const interval = setInterval(() => {
      setParseStepIndex(i => (i + 1) % PARSE_STEPS.length);
    }, 1800);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isParsing]);

  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const roleDropdownRef = useRef<HTMLDivElement>(null);

  const filteredRoles = SUGGESTED_ROLES.filter(role =>
    role.toLowerCase().includes(formData.preferred_job_role.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(e.target as Node)) {
        setRoleDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.university && formData.major) {
      setStep(2);
    } else {
      alert("Please fill in all fields.");
    }
  };

  const handleFileUpload = async (files: File[]) => {
    if (files.length > 0) {
      const file = files[0];
      setResumeFile(file);
      setParseError(null);
      
      // Auto-parse immediately upon upload
      await parseResume(file);
    }
  };

  const parseResume = async (file: File) => {
    setIsParsing(true);
    const data = new FormData();
    data.append('file', file);

    try {
      // Call your Python Resume Parser Service
      const response = await axios.post(PARSER_ENDPOINT, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const skills = response.data.extracted_skills || [];
      setExtractedSkills(skills);
    } catch (error) {
      console.error("Resume parsing failed:", error);
      setParseError("Could not parse resume. You can still continue, but we won't be able to auto-fill your skills.");
    } finally {
      setIsParsing(false);
    }
  };

  const handleFinalSubmit = async () => {
    setIsLoading(true);

    try {
      // 1. Update Profile Details
      await apiClient.put('/users/me', formData);

      // 2. If we have extracted skills, save them and run LLM enrichment
      if (extractedSkills.length > 0) {
        const skillsPayload = extractedSkills.map(skill => ({ name: skill }));
        await apiClient.post('/users/me/skills/', skillsPayload);

        // 3. Enrich profile: LLM infers additional skills + generates summary
        const enrichRes = await apiClient.post('/users/me/enrich');
        const allSkillNames: string[] = (enrichRes.data.skills ?? []).map(
          (s: { name: string }) => s.name
        );
        const extractedLower = extractedSkills.map(s => s.toLowerCase());
        const newInferred = allSkillNames.filter(
          n => !extractedLower.includes(n.toLowerCase())
        );
        setInferredSkills(newInferred);
      }

      console.log('Onboarding complete.');

      // 3. Refresh Context
      await fetchUserProfile();
      if (updateUser) {
        await updateUser({ ...user, ...formData });
      }

      // 4. Redirect — slight delay so user can see AI-inferred skills
      setTimeout(() => navigate('/dashboard'), 1800);

    } catch (error) {
      console.error("Failed to save profile", error);
      alert("Something went wrong saving your profile. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6">
      <div className="max-w-xl w-full">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-3">
            {step === 1 ? "Let's personalize your feed" : "Add your Resume"}
          </h1>
          <p className="text-slate-500 text-lg">
            {step === 1 
              ? "Tell us about your studies and what kind of internship you are looking for."
              : "Upload your resume so our AI can extract your skills and match you to jobs."}
          </p>
        </div>

        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm relative transition-all duration-300">
          
          {/* Decorative Blob */}
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-slate-50 rounded-full z-0 opacity-50 pointer-events-none"></div>

          {/* --- STEP 1: PROFILE FORM --- */}
          {step === 1 && (
            <form onSubmit={handleNextStep} className="space-y-6 relative z-10 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">University / College</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Icon as={FiBook} className="text-slate-400" />
                    </div>
                    <input
                      type="text"
                      name="university"
                      required
                      placeholder="e.g. Stanford University"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-800 focus:border-slate-800 outline-none transition-all text-slate-800"
                      value={formData.university}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Major / Field of Study</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Icon as={FiTarget} className="text-slate-400" />
                    </div>
                    <input
                      type="text"
                      name="major"
                      required
                      placeholder="e.g. Computer Science"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-800 focus:border-slate-800 outline-none transition-all text-slate-800"
                      value={formData.major}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Graduation Year</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Icon as={FiCalendar} className="text-slate-400" />
                    </div>
                    <input
                      type="number"
                      name="graduation_year"
                      required
                      min={new Date().getFullYear()}
                      max={new Date().getFullYear() + 6}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-800 focus:border-slate-800 outline-none transition-all text-slate-800"
                      value={formData.graduation_year}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Preferred Internship Role</label>
                  <div className="relative" ref={roleDropdownRef}>
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Icon as={FiBriefcase} className="text-slate-400" />
                    </div>
                    <input
                      type="text"
                      name="preferred_job_role"
                      required
                      autoComplete="off"
                      placeholder="e.g. Financial Analyst"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-800 focus:border-slate-800 outline-none transition-all text-slate-800"
                      value={formData.preferred_job_role}
                      onChange={handleChange}
                      onFocus={() => setRoleDropdownOpen(true)}
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    {roleDropdownOpen && filteredRoles.length > 0 && formData.preferred_job_role.length > 0 && (
                      <ul className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {filteredRoles.map(role => (
                          <li
                            key={role}
                            className="px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors"
                            onMouseDown={() => {
                              setFormData(prev => ({ ...prev, preferred_job_role: role }));
                              setRoleDropdownOpen(false);
                            }}
                          >
                            {role}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full bg-slate-800 text-white py-3.5 rounded-xl font-bold text-lg flex items-center justify-center hover:bg-slate-700 active:scale-[0.99] transition-all shadow-lg shadow-slate-200"
                >
                  Next Step <Icon as={FiArrowRight} className="ml-2" />
                </button>
              </div>
            </form>
          )}

          {/* --- STEP 2: RESUME UPLOAD --- */}
          {step === 2 && (
            <div className="space-y-6 relative z-10 animate-in fade-in slide-in-from-right-4 duration-300">
              
              {/* Back Button */}
              <button 
                onClick={() => setStep(1)}
                className="text-sm text-slate-500 hover:text-slate-800 flex items-center gap-1 mb-2"
              >
                <Icon as={FiChevronLeft} /> Back to details
              </button>

              {/* Upload Component */}
              <div className="w-full">
                <FileUpload onChange={handleFileUpload} />
              </div>

              {/* Parsing Loading State */}
              {isParsing && (
                <div className="flex flex-col items-center justify-center bg-indigo-50 p-5 rounded-lg gap-2">
                  <div className="flex items-center text-indigo-600 gap-2">
                    <Icon as={FiLoader} className="animate-spin shrink-0" />
                    <span className="text-sm font-medium transition-all duration-500">
                      {PARSE_STEPS[parseStepIndex]}
                    </span>
                  </div>
                  <div className="flex gap-1 mt-1">
                    {PARSE_STEPS.map((_, i) => (
                      <div
                        key={i}
                        className={`h-1 rounded-full transition-all duration-500 ${
                          i === parseStepIndex ? 'w-4 bg-indigo-500' : 'w-1.5 bg-indigo-200'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Error State */}
              {parseError && (
                <div className="text-red-600 bg-red-50 p-3 rounded-lg text-sm text-center">
                  {parseError}
                </div>
              )}

              {/* Extracted + AI-Inferred Skills Preview */}
              {!isParsing && extractedSkills.length > 0 && (
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-3">
                  {/* Parsed skills */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-sm font-bold text-slate-700">We found {extractedSkills.length} skills:</p>
                      <Icon as={FiCheck} className="text-green-500" />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {extractedSkills.slice(0, 10).map((skill, i) => (
                        <span key={i} className="bg-white border border-slate-200 px-2 py-1 rounded text-xs text-slate-600">
                          {skill}
                        </span>
                      ))}
                      {extractedSkills.length > 10 && (
                        <span className="text-xs text-slate-400 py-1">+{extractedSkills.length - 10} more</span>
                      )}
                    </div>
                  </div>

                  {/* AI-inferred skills */}
                  {inferredSkills.length > 0 && (
                    <div className="border-t border-slate-200 pt-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold bg-indigo-600 text-white px-2 py-0.5 rounded-full">✦ AI</span>
                        <p className="text-sm font-bold text-slate-700">AI enriched {inferredSkills.length} more skills:</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {inferredSkills.map((skill, i) => (
                          <span
                            key={i}
                            className="bg-white border border-indigo-400 ring-1 ring-indigo-300 shadow-sm shadow-indigo-100 px-2 py-1 rounded text-xs text-indigo-700 font-medium"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Final Submit Button */}
              <div className="pt-4">
                <button
                  onClick={handleFinalSubmit}
                  disabled={isLoading || isParsing}
                  className="w-full bg-slate-800 text-white py-3.5 rounded-xl font-bold text-lg flex items-center justify-center hover:bg-slate-700 active:scale-[0.99] transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-slate-200"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2"><Icon as={FiLoader} className="animate-spin" /> Setting up...</span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Complete Setup <Icon as={FiCheck} />
                    </span>
                  )}
                </button>
              </div>
            </div>
          )}

        </div>
        
        {/* Step Indicator */}
        <div className="flex justify-center gap-2 mt-6">
          <div className={`h-2 w-2 rounded-full transition-all ${step === 1 ? 'bg-slate-800 w-8' : 'bg-slate-300'}`}></div>
          <div className={`h-2 w-2 rounded-full transition-all ${step === 2 ? 'bg-slate-800 w-8' : 'bg-slate-300'}`}></div>
        </div>

      </div>
    </div>
  );
};

export default Onboarding;