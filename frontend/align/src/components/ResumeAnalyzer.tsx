import React, { useState, useRef } from 'react';
import axios from 'axios';
import apiClient from '../api/axiosConfig'; // Your User API client (Port 8000)
import { FiUploadCloud, FiPlus, FiLoader } from 'react-icons/fi';
import Icon from './Icon';

const RESUME_PARSER_URL = import.meta.env.VITE_RESUME_PARSER_URL || 'http://localhost:8001';

const ResumeAnalyzer: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [extractedSkills, setExtractedSkills] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setMessage(null);
      setExtractedSkills([]); // Reset previous results
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;

    setIsAnalyzing(true);
    setMessage(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      // 1. Call Resume Parser Service
      const response = await axios.post(`${RESUME_PARSER_URL}/upload-resume/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const skills = response.data.extracted_skills;
      
      if (skills.length === 0) {
        setMessage({ type: 'error', text: "No skills found in resume. Try adding keywords manually." });
      } else {
        setExtractedSkills(skills);
        setMessage({ type: 'success', text: `Found ${skills.length} skills!` });
      }

    } catch (error) {
      console.error("Parsing error:", error);
      setMessage({ type: 'error', text: "Failed to analyze resume. Please try again." });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddToProfile = async () => {
    if (extractedSkills.length === 0) return;
    setIsSaving(true);

    try {
      // 2. Format data for User API (Must match SkillCreate schema: { name: string })
      const skillsPayload = extractedSkills.map(skill => ({ name: skill }));

      // 3. Call User API (using your authenticated apiClient)
      await apiClient.post('/users/me/skills/', skillsPayload);

      setMessage({ type: 'success', text: "Skills successfully added to your profile!" });
      setExtractedSkills([]); // Clear after saving
      setFile(null); // Reset file
      
    } catch (error) {
      console.error("Save error:", error);
      setMessage({ type: 'error', text: "Failed to save skills to profile." });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <h3 className="text-lg font-bold text-gray-800 mb-4">Resume Skill Extractor</h3>
      <p className="text-sm text-gray-500 mb-6">
        Upload your resume to automatically extract skills and add them to your profile to improve job recommendations.
      </p>

      {/* Upload Area */}
      <div className="flex gap-4 items-center mb-6">
        <input 
          type="file" 
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".pdf,.docx"
          className="hidden" 
        />
        
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-medium transition-colors"
        >
          {file ? file.name : "Select Resume (PDF/DOCX)"}
        </button>

        <button 
          onClick={handleAnalyze}
          disabled={!file || isAnalyzing}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-all ${
            !file || isAnalyzing ? 'bg-indigo-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 shadow-md'
          }`}
        >
          {isAnalyzing ? (
            <>
              <Icon as={FiLoader} className="animate-spin" /> Analyzing...
            </>
          ) : (
            <>
              <Icon as={FiUploadCloud} /> Analyze
            </>
          )}
        </button>
      </div>

      {/* Message Banner */}
      {message && (
        <div className={`p-3 rounded-lg text-sm mb-4 ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* Extracted Skills Display */}
      {extractedSkills.length > 0 && (
        <div className="animate-fade-in-up">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-semibold text-gray-700 text-sm">Extracted Skills:</h4>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{extractedSkills.length} found</span>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            {extractedSkills.map((skill, index) => (
              <span key={index} className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-semibold border border-indigo-100">
                {skill}
              </span>
            ))}
          </div>

          <button
            onClick={handleAddToProfile}
            disabled={isSaving}
            className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold shadow-md hover:shadow-lg transition-all flex justify-center items-center gap-2"
          >
            {isSaving ? (
              <>
                <Icon as={FiLoader} className="animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Icon as={FiPlus} /> Add Skills to My Profile
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default ResumeAnalyzer;