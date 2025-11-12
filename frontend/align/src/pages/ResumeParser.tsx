import React, { useState } from 'react';
import { FiUploadCloud, FiFileText, FiX, FiAlertCircle } from 'react-icons/fi';
import Icon from '../components/Icon'; // Note the path change
import { fetchAuthSession } from 'aws-amplify/auth';


const ResumeParser: React.FC = () => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [extractedSkills, setExtractedSkills] = useState<string[]>([]);
    const [isParsing, setIsParsing] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Your backend endpoint URL
    const API_ENDPOINT = "http://127.0.0.1:8001/upload-resume/"; // This should be in an environment variable

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            setSelectedFile(event.target.files[0]);
            setExtractedSkills([]);
            setErrorMessage(null);
        }
    };

    const getAuthToken = async (): Promise<string | null> => {
        try {
            // fetchAuthSession() returns tokens directly
            const { tokens } = await fetchAuthSession();
            
            // The idToken object has a toString() method to get the JWT
            const idToken = tokens?.idToken;

            if (idToken) {
                return `Bearer ${idToken.toString()}`;
            }
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
            setErrorMessage("Could not find a valid session. Please log in again.");
            return;
        }

        setIsParsing(true);
        setErrorMessage(null);

        const formData = new FormData();
        formData.append('file', selectedFile);

        try {
            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Authorization' : token,
                },
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Something went wrong');
            }

            setExtractedSkills(data.extracted_skills);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            console.error("Parsing failed:", error);
            setErrorMessage(error.message || "An unexpected error occurred.");
        } finally {
            setIsParsing(false);
        }
    };
  
    const removeFile = () => {
        setSelectedFile(null);
        setExtractedSkills([]);
        setErrorMessage(null);
    }
  
    return (
      <div className="p-8 bg-gray-50 h-full">
          <h1 className="text-3xl font-bold text-gray-800">Resume Skill Extractor</h1>
          <p className="text-gray-500 mb-8">Upload your resume to automatically extract key skills.</p>
  
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
              <div className="flex flex-col items-center justify-center w-full">
                   {!selectedFile ? (
                      <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <Icon as={FiUploadCloud} className="w-10 h-10 mb-3 text-gray-400" />
                              <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                              <p className="text-xs text-gray-500">PDF or DOCX (MAX. 5MB)</p>
                          </div>
                          <input id="dropzone-file" type="file" className="hidden" onChange={handleFileChange} accept=".pdf,.doc,.docx" />
                      </label>
                   ) : (
                      <div className="w-full p-4 border-2 border-gray-300 border-dashed rounded-lg">
                          <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                  <Icon as={FiFileText} className="w-8 h-8 text-purple-600 mr-3" />
                                  <div>
                                      <p className="font-semibold text-gray-700">{selectedFile.name}</p>
                                      <p className="text-sm text-gray-500">{(selectedFile.size / 1024).toFixed(2)} KB</p>
                                  </div>
                              </div>
                              <button onClick={removeFile} className="p-2 text-gray-500 rounded-full hover:bg-gray-200">
                                  <Icon as={FiX} className="w-5 h-5" />
                              </button>
                          </div>
                      </div>
                   )}

                    {errorMessage && (
                        <div className="mt-4 flex items-center text-red-600 bg-red-100 p-3 rounded-lg w-full">
                            <Icon as={FiAlertCircle} className="mr-2" />
                            <span className="text-sm">{errorMessage}</span>
                        </div>
                    )}
  
                  <button
                      onClick={handleFileParse}
                      disabled={!selectedFile || isParsing}
                      className="mt-6 w-full max-w-xs bg-purple-600 text-purple-800 px-6 py-3 rounded-lg font-semibold flex items-center justify-center disabled:bg-purple-300 disabled:cursor-not-allowed transition-colors"
                  >
                      {isParsing ? 'Parsing...' : 'Extract Skills'}
                  </button>
              </div>
  
              {extractedSkills.length > 0 && (
                  <div className="mt-8">
                      <h2 className="text-2xl font-bold text-gray-800 mb-4">Extracted Skills</h2>
                      <div className="flex flex-wrap gap-2">
                          {extractedSkills.map((skill, index) => (
                              <span key={index} className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                                  {skill}
                              </span>
                          ))}
                      </div>
                  </div>
              )}
          </div>
      </div>
    );
};

export default ResumeParser;