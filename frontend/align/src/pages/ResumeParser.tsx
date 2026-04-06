import React, { useState } from 'react';
import { FiAlertCircle, FiLoader, FiPlus } from 'react-icons/fi';
import Icon from '../components/Icon';
import { fetchAuthSession } from 'aws-amplify/auth';
import { FileUpload } from "../components/ui/file-upload"; // Aceternity UI component
import apiClient from '../api/axiosConfig';

const ResumeParser: React.FC = () => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [extractedSkills, setExtractedSkills] = useState<string[]>([]);
    const [isParsing, setIsParsing] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // This should be in an environment variable
    const API_ENDPOINT = "http://127.0.0.1:8001/upload-resume/"; 

    // New handler for the Aceternity FileUpload component
    const handleFileUpload = (files: File[]) => {
        // If the user uploads a file, take the first one
        if (files.length > 0) {
            setSelectedFile(files[0]);
            setExtractedSkills([]); // Reset previous results
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
            // Format data for the User API schema: [{ name: "Python" }, { name: "Java" }]
            const skillsPayload = extractedSkills.map(skill => ({ name: skill }));

            // Use apiClient (axios) which likely has your Base URL (port 8000) and Interceptors setup
            await apiClient.post('/users/me/skills/', skillsPayload);

            setMessage({ type: 'success', text: "Skills successfully added to your profile!" });
            
            // Optional: Clear list after saving to prevent double submission
            setExtractedSkills([]);
            setSelectedFile(null);

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
              <h1 className="text-3xl font-bold text-slate-800">Resume Skill Extractor</h1>
              <p className="text-slate-500">Upload your resume to automatically identify key skills and improve your profile.</p>
          </div>
  
          <div className="bg-white p-8 rounded-xl border border-slate-200">
              <div className="w-full max-w-4xl mx-auto flex flex-col items-center">
                  
                  {/* --- Aceternity UI Component Integration --- */}
                  <FileUpload onChange={handleFileUpload} />

                  {/* --- Feedback Messages --- */}
                  {errorMessage && (
                      <div className="mt-6 flex items-center text-red-600 bg-red-100 p-3 rounded-lg w-full">
                          <Icon as={FiAlertCircle} className="mr-3 flex-shrink-0" />
                          <span className="text-sm">{errorMessage}</span>
                      </div>
                  )}
  
                  <button
                      onClick={handleFileParse}
                      disabled={!selectedFile || isParsing}
                      className="mt-8 w-full max-w-md bg-slate-800 text-white px-6 py-3 rounded-lg font-semibold flex items-center justify-center disabled:bg-slate-400 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors"
                  >
                      {isParsing ? 'Parsing...' : 'Extract Skills from Resume'}
                  </button>
              </div>
  
              {/* --- Results Section --- */}
              {extractedSkills.length > 0 && (
                  <div className="mt-10 pt-6 border-t border-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="flex flex-col md:flex-row justify-between items-center mb-6">
                          <h2 className="text-2xl font-bold text-slate-800">Extracted Skills</h2>
                          <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                              {extractedSkills.length} found
                          </span>
                      </div>

                      <div className="flex flex-wrap gap-3 mb-8">
                          {extractedSkills.map((skill, index) => (
                              <span key={index} className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-3 py-1.5 rounded-full text-sm font-semibold">
                                  {skill}
                              </span>
                          ))}
                      </div>

                      {/* --- Add to Profile Button --- */}
                      <div className="flex justify-center">
                        <button
                            onClick={handleAddToProfile}
                            disabled={isSaving}
                            className="flex items-center gap-2 bg-green-600 text-white px-8 py-3 rounded-lg font-bold shadow-md hover:bg-green-700 hover:shadow-lg transition-all transform hover:-translate-y-0.5"
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