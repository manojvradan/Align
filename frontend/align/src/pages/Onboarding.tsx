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

  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichmentComplete, setEnrichmentComplete] = useState(false);
  const ENRICH_STEPS = [
    'Analyzing your skill patterns...',
    'Finding connections in your experience...',
    'Discovering hidden strengths...',
    'Enriching your profile with AI...',
    'Almost ready...',
  ];
  const [enrichStepIndex, setEnrichStepIndex] = useState(0);

  useEffect(() => {
    if (!isEnriching) { setEnrichStepIndex(0); return; }
    const interval = setInterval(() => {
      setEnrichStepIndex(i => (i + 1) % ENRICH_STEPS.length);
    }, 1600);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEnriching]);

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

  const handleDeleteExtractedSkill = (index: number) => {
    setExtractedSkills(prev => prev.filter((_, i) => i !== index));
  };

  const handleDeleteInferredSkill = (index: number) => {
    setInferredSkills(prev => prev.filter((_, i) => i !== index));
  };

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

  // Step 1 of 2: Save prerequisites + collect AI-enriched data to display
  const handleEnrich = async () => {
    setIsLoading(true);
    try {
      await apiClient.put('/users/me', formData);
      if (extractedSkills.length > 0) {
        const skillsPayload = extractedSkills.map(skill => ({ name: skill }));
        await apiClient.post('/users/me/skills/', skillsPayload);
      }
    } catch (error) {
      console.error("Failed to save profile", error);
      alert("Something went wrong saving your profile. Please try again.");
      setIsLoading(false);
      return;
    }
    setIsLoading(false);

    if (extractedSkills.length > 0) {
      setIsEnriching(true);
      try {
        const enrichRes = await apiClient.post('/users/me/enrich');
        const allSkillNames: string[] = (enrichRes.data.skills ?? []).map(
          (s: { name: string }) => s.name
        );
        const extractedLower = extractedSkills.map(s => s.toLowerCase());
        const newInferred = allSkillNames.filter(
          n => !extractedLower.includes(n.toLowerCase())
        );
        setInferredSkills(newInferred);
      } catch (error) {
        console.error("Enrichment failed:", error);
      } finally {
        setIsEnriching(false);
        setEnrichmentComplete(true);
      }
    } else {
      setEnrichmentComplete(true);
    }
  };

  // Step 2 of 2: Save final curated skills and navigate
  const handleGoToDashboard = async () => {
    setIsLoading(true);
    try {
      // Save the final curated skill list (extracted + inferred that weren't deleted)
      const finalSkills = [...extractedSkills, ...inferredSkills];
      if (finalSkills.length > 0) {
        const skillsPayload = finalSkills.map(skill => ({ name: skill }));
        await apiClient.post('/users/me/skills/', skillsPayload);
      }
      await fetchUserProfile();
      if (updateUser) await updateUser({ ...user, ...formData });
    } catch (error) {
      console.error("Failed to save final skills", error);
    } finally {
      setIsLoading(false);
    }
    navigate('/dashboard');
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
                      {extractedSkills.map((skill, i) => (
                        <span key={i} className="flex items-center gap-1 bg-white border border-slate-200 px-2 py-1 rounded text-xs text-slate-600">
                          {skill}
                          {!isEnriching && !enrichmentComplete && (
                            <button
                              onClick={() => handleDeleteExtractedSkill(i)}
                              className="text-slate-300 hover:text-red-400 transition-colors leading-none"
                              title="Remove skill"
                            >×</button>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* AI-inferred skills */}
                  {inferredSkills.length > 0 && (
                    <div className="border-t border-slate-200 pt-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold bg-indigo-600 text-white px-2 py-0.5 rounded-full">✦ AI</span>
                        <p className="text-sm font-bold text-slate-700">AI enriched {inferredSkills.length} more skills:</p>
                        <div className="relative group ml-auto shrink-0">
                          <div className="w-4 h-4 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-[10px] font-bold cursor-default select-none">?</div>
                          <div className="absolute right-0 bottom-6 w-64 bg-slate-800 text-white text-xs rounded-lg px-3 py-2 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-20 leading-relaxed">
                            We're making connections to add skills you might have missed word-for-word in your resume — things implied by your experience that a recruiter would expect you to know.
                            <div className="absolute right-2 -bottom-1.5 w-3 h-3 bg-slate-800 rotate-45" />
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {inferredSkills.map((skill, i) => (
                          <span
                            key={i}
                            className="flex items-center gap-1 bg-white border border-indigo-400 ring-1 ring-indigo-300 shadow-sm shadow-indigo-100 px-2 py-1 rounded text-xs text-indigo-700 font-medium"
                          >
                            {skill}
                            <button
                              onClick={() => handleDeleteInferredSkill(i)}
                              className="text-indigo-300 hover:text-red-400 transition-colors leading-none"
                              title="Remove skill"
                            >×</button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Enrichment Animation */}
              {isEnriching && (
                <div className="bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 rounded-xl p-6 flex flex-col items-center gap-4">
                  <div className="relative w-16 h-16">
                    <div className="absolute inset-0 rounded-full border-2 border-indigo-200 animate-ping opacity-40" />
                    <div className="absolute inset-0 rounded-full border-2 border-indigo-300 animate-spin" style={{ animationDuration: '3s' }} />
                    <div className="absolute inset-3 rounded-full border-2 border-violet-400 animate-spin" style={{ animationDuration: '2s', animationDirection: 'reverse' }} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-3 h-3 rounded-full bg-indigo-500 animate-pulse" />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-indigo-700">{ENRICH_STEPS[enrichStepIndex]}</p>
                    <p className="text-xs text-indigo-400 mt-1 animate-pulse">Our AI is working its magic</p>
                  </div>
                  <div className="flex gap-1">
                    {ENRICH_STEPS.map((_, i) => (
                      <div
                        key={i}
                        className={`h-1 rounded-full transition-all duration-500 ${
                          i === enrichStepIndex ? 'w-4 bg-indigo-500' : 'w-1.5 bg-indigo-200'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Before extraction: placeholder button */}
              {!isEnriching && !enrichmentComplete && extractedSkills.length === 0 && !isParsing && (
                <div className="pt-4">
                  <button
                    disabled
                    className="w-full bg-slate-100 text-slate-400 border border-slate-200 py-3.5 rounded-xl font-bold text-lg flex items-center justify-center cursor-not-allowed"
                  >
                    Extract my skills
                  </button>
                  <p className="text-center text-xs text-slate-400 mt-2">Upload your resume above to get started</p>
                </div>
              )}

              {/* After extraction: Enhance with AI button */}
              {!isEnriching && !enrichmentComplete && extractedSkills.length > 0 && (
                <div className="pt-4">
                  <button
                    onClick={handleEnrich}
                    disabled={isLoading || isParsing}
                    className="w-full bg-gradient-to-r from-indigo-500 to-violet-600 text-white py-3.5 rounded-xl font-bold text-lg flex items-center justify-center hover:opacity-90 cursor-pointer active:scale-[0.99] transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/25"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2"><Icon as={FiLoader} className="animate-spin" /> Setting up...</span>
                    ) : (
                      <span className="flex items-center gap-2">
                        ✦ Enhance with AI <Icon as={FiArrowRight} />
                      </span>
                    )}
                  </button>
                </div>
              )}

              {/* Go to Dashboard */}
              {enrichmentComplete && (
                <div className="pt-2 space-y-3">
                  {extractedSkills.length > 0 && (
                    <p className="text-center text-xs text-slate-400">Remove any skills that don't apply, then head to your dashboard.</p>
                  )}
                  <button
                    onClick={handleGoToDashboard}
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-indigo-500 to-violet-600 text-white py-3.5 rounded-xl font-bold text-lg flex items-center justify-center hover:opacity-90 active:scale-[0.99] transition-all shadow-lg shadow-indigo-500/25 disabled:opacity-70"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2"><Icon as={FiLoader} className="animate-spin" /> Saving...</span>
                    ) : (
                      <span className="flex items-center gap-2">Go to Dashboard <Icon as={FiArrowRight} /></span>
                    )}
                  </button>
                </div>
              )}
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