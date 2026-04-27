import React, { useState } from 'react';
import { FiAlertCircle, FiLoader, FiPlus } from 'react-icons/fi';
import Icon from '../components/Icon';
import { fetchAuthSession } from 'aws-amplify/auth';
import { FileUpload } from "../components/ui/file-upload"; // Aceternity UI component
import apiClient from '../api/axiosConfig';

const ResumeParser: React.FC = () => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [extractedSkills, setExtractedSkills] = useState<string[]>([]);
    const [resumeRawText, setResumeRawText] = useState<string>('');
    const [resumeS3Url, setResumeS3Url] = useState<string>('');
    const [isParsing, setIsParsing] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const API_ENDPOINT = `${import.meta.env.VITE_RESUME_PARSER_URL || 'http://127.0.0.1:8001'}/upload-resume/`;

    // New handler for the Aceternity FileUpload component
    const handleFileUpload = (files: File[]) => {
        // If the user uploads a file, take the first one
        if (files.length > 0) {
            setSelectedFile(files[0]);
            setExtractedSkills([]); // Reset previous results
            setResumeRawText('');
            setResumeS3Url('');
            setErrorMessage(null); // Clear previous errors
        } else {
            // If the user removes the file from the UI, clear the state
            setSelectedFile(null);
        }
    };

    const getAuthToken = async (): Promise<string | null> => {
        try {
            const { tokens } = await fetchAuthSession();
            const idToken = tokens?.idToken;

            if (idToken) {
                // The toString() method provides the JWT string
                return `Bearer ${idToken.toString()}`;
            }
            console.log("No ID token found in session.");
            return null;
        } catch (error) {
            console.log("User is not authenticated or session is invalid:", error);
            return null;
        }
    };

    const handleFileParse = async () => {
        if (!selectedFile) return;

        const token = await getAuthToken(); 
        if (!token) {
            setErrorMessage("Authentication failed. Please log in again.");
            return;
        }

        setIsParsing(true);
        setErrorMessage(null);
        const formData = new FormData();
        formData.append('file', selectedFile);

        try {
            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: { 'Authorization' : token },
                body: formData,
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.detail || 'An unknown error occurred during parsing.');
            }
            setExtractedSkills(data.extracted_skills);
            setResumeRawText(data.raw_text || '');
            setResumeS3Url(data.s3_url || '');

        } catch (error: any) {
            console.error("Parsing failed:", error);
            setErrorMessage(error.message);
        } finally {
            setIsParsing(false);
        }
    };

    const handleAddToProfile = async () => {
        if (extractedSkills.length === 0) return;
        
        setIsSaving(true);
        setMessage(null);

        try {
            // Save skills to profile
            const skillsPayload = extractedSkills.map(skill => ({ name: skill }));
            await apiClient.post('/users/me/skills/', skillsPayload);

            // Save full resume text and S3 URL so cover letter generation has full context
            if (resumeRawText || resumeS3Url) {
                await apiClient.put('/users/me', {
                    resume_text: resumeRawText || null,
                    resume_s3_url: resumeS3Url || null,
                });
            }

            setMessage({ type: 'success', text: "Skills successfully added to your profile!" });
            
            // Clear list after saving to prevent double submission
            setExtractedSkills([]);
            setSelectedFile(null);
            setResumeRawText('');
            setResumeS3Url('');

        } catch (error: any) {
            console.error("Save failed:", error);
            setMessage({ type: 'error', text: "Failed to save skills to profile." });
        } finally {
            setIsSaving(false);
        }
    };
  
    return (
      <div>
          <div className="mb-8">
              <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Resume Skill Extractor</h1>
              <p className="text-slate-500 dark:text-white/40 text-sm mt-1">
                  Upload your resume to automatically identify key skills and improve your profile.
              </p>
          </div>

          <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-8">
              <div className="w-full max-w-4xl mx-auto flex flex-col items-center">

                  {/* File Upload */}
                  <FileUpload onChange={handleFileUpload} />

                  {/* Error */}
                  {errorMessage && (
                      <div className="mt-6 flex items-center text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 p-3 rounded-xl w-full">
                          <Icon as={FiAlertCircle} className="mr-3 flex-shrink-0" />
                          <span className="text-sm">{errorMessage}</span>
                      </div>
                  )}

                  <button
                      onClick={handleFileParse}
                      disabled={!selectedFile || isParsing}
                      className="mt-8 w-full max-w-md bg-gradient-to-r from-indigo-500 to-violet-600 text-white px-6 py-3 rounded-xl font-semibold flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity shadow-lg shadow-indigo-500/25"
                  >
                      {isParsing ? (
                          <>
                              <Icon as={FiLoader} className="animate-spin mr-2" />
                              Parsing...
                          </>
                      ) : (
                          'Extract Skills from Resume'
                      )}
                  </button>
              </div>

              {/* Results */}
              {extractedSkills.length > 0 && (
                  <div className="mt-10 pt-6 border-t border-slate-200 dark:border-white/10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-3">
                          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Extracted Skills</h2>
                          <span className="text-sm text-slate-500 dark:text-white/40 bg-slate-100 dark:bg-white/8 border border-slate-200 dark:border-white/10 px-3 py-1 rounded-full">
                              {extractedSkills.length} found
                          </span>
                      </div>

                      <div className="flex flex-wrap gap-2.5 mb-8">
                          {extractedSkills.map((skill, index) => (
                              <span
                                  key={index}
                                  className="bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-500/20 px-3 py-1.5 rounded-full text-sm font-semibold"
                              >
                                  {skill}
                              </span>
                          ))}
                      </div>

                      <div className="flex justify-center">
                          <button
                              onClick={handleAddToProfile}
                              disabled={isSaving}
                              className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-emerald-500/25 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                              {isSaving ? (
                                  <>
                                      <Icon as={FiLoader} className="animate-spin" /> Saving...
                                  </>
                              ) : (
                                  <>
                                      <Icon as={FiPlus} /> Add These Skills to My Profile
                                  </>
                              )}
                          </button>
                      </div>
                  </div>
              )}
          </div>
      </div>
    );
};

export default ResumeParser;