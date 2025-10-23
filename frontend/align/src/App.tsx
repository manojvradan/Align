import React, { ElementType, useState } from 'react';
import { BrowserRouter, Routes, Route, Link, Outlet, useLocation } from 'react-router-dom';
import {
  FiGrid,
  FiFileText,
  FiBookmark,
  FiBookOpen,
  FiLogOut,
  FiArrowRight,
  FiBriefcase,
  FiUploadCloud,
  FiX,
  FiAlertCircle // Import an icon for errors
} from 'react-icons/fi';

//================================================
// Icon Wrapper
//================================================
interface IconProps {
  as: ElementType;
  className?: string;
}

const Icon: React.FC<IconProps> = ({ as: IconComponent, className }) => {
  return <IconComponent className={className} />;
};

//================================================
// Sidebar Component (No changes)
//================================================
const Sidebar: React.FC = () => {
    const location = useLocation();
    const isActive = (path: string) => location.pathname === path;
  
    return (
      <div className="bg-white text-gray-800 w-64 p-6 flex-col justify-between hidden lg:flex">
        <div>
          <div className="flex items-center mb-10">
            <div className="bg-purple-600 w-10 h-10 rounded-lg mr-3"></div>
            <span className="text-xl font-bold">Student Dashboard</span>
          </div>
          <nav>
            <ul>
              <li className="mb-4">
                <Link to="/" className={`flex items-center p-3 rounded-lg ${isActive('/') ? 'text-purple-600 bg-purple-100 font-semibold' : 'text-gray-600 hover:bg-purple-100'}`}>
                  <Icon as={FiGrid} className="mr-3" />
                  Overview
                </Link>
              </li>
              <li className="mb-4">
                <Link to="/applied" className={`flex items-center p-3 rounded-lg ${isActive('/applied') ? 'text-purple-600 bg-purple-100 font-semibold' : 'text-gray-600 hover:bg-purple-100'}`}>
                  <Icon as={FiFileText} className="mr-3" />
                  Applied Jobs
                </Link>
              </li>
              <li className="mb-4">
                 <Link to="/resume-parser" className={`flex items-center p-3 rounded-lg ${isActive('/resume-parser') ? 'text-purple-600 bg-purple-100 font-semibold' : 'text-gray-600 hover:bg-purple-100'}`}>
                  <Icon as={FiUploadCloud} className="mr-3" />
                  Resume Parser
                </Link>
              </li>
              <li>
                <Link to="/courses" className={`flex items-center p-3 rounded-lg ${isActive('/courses') ? 'text-purple-600 bg-purple-100 font-semibold' : 'text-gray-600 hover:bg-purple-100'}`}>
                  <Icon as={FiBookOpen} className="mr-3" />
                  Courses
                </Link>
              </li>
            </ul>
          </nav>
        </div>
        <div>
          <button className="flex items-center text-gray-600 hover:text-purple-600 w-full">
            <Icon as={FiLogOut} className="mr-3" />
            Log-out
          </button>
        </div>
      </div>
    );
};

//================================================
// Header Component (No changes)
//================================================
const Header: React.FC = () => {
    // ... (same as before)
    return (
        <header className="bg-white shadow-sm p-4 flex justify-between items-center w-full">
          <nav className="flex space-x-8">
            <Link to="/" className="text-purple-600 font-semibold">Dashboard</Link>
            <Link to="/jobs" className="text-gray-600 hover:text-purple-600">Jobs</Link>
            <Link to="/messages" className="text-gray-600 hover:text-purple-600">Messages</Link>
            <Link to="/calendar" className="text-gray-600 hover:text-purple-600">Calendar</Link>
            <Link to="/resume-builder" className="text-gray-600 hover:text-purple-600">Resume Builder</Link>
          </nav>
          <div className="flex items-center">
            <span className="text-gray-500 mr-4">Mon 29th Jul 2024</span>
            <div className="w-10 h-10 rounded-full flex items-center justify-center">
              <img src="https://i.pravatar.cc/40?img=1" alt="User" className="rounded-full" />
            </div>
          </div>
        </header>
      );
};

//================================================
// Dashboard Component (No changes)
//================================================
const Dashboard: React.FC = () => {
    // ... (same as before)
    return (
        <div className="p-8 bg-gray-50 h-full">
          <h1 className="text-3xl font-bold text-gray-800">Hello, Angela!</h1>
          <p className="text-gray-500 mb-8">Here is your daily activities and job alerts</p>
    
          {/* The rest of your original dashboard JSX goes here... */}
           <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
            {/* Left column */}
            <div className="xl:col-span-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div className="bg-white p-6 rounded-xl shadow-sm flex justify-between items-center">
                  <div>
                    <div className="text-4xl font-bold text-gray-800">4</div>
                    <div className="text-gray-500">Applied jobs</div>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <Icon as={FiBriefcase} className="text-2xl text-blue-500" />
                  </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm flex justify-between items-center">
                  <div>
                    <div className="text-4xl font-bold text-gray-800">6</div>
                    <div className="text-gray-500">Saved Jobs</div>
                  </div>
                  <div className="bg-orange-100 p-3 rounded-lg">
                    <Icon as={FiBookmark} className="text-2xl text-orange-500" />
                  </div>
                </div>
              </div>
            </div>
    
            {/* Right column */}
            <div className="space-y-4">
              <div className="bg-purple-600 text-white p-6 rounded-xl shadow-lg">
                <h2 className="font-bold text-md">Your profile editing is not completed.</h2>
                <p className="text-purple-200 text-sm mb-4">Complete your profile to stand out among other applicants</p>
                <button className="bg-white text-purple-600 w-full px-4 py-2 rounded-lg font-semibold flex items-center justify-center text-sm">
                  Edit Profile <Icon as={FiArrowRight} className="ml-2" />
                </button>
              </div>
              <div className="bg-purple-600 text-white p-6 rounded-xl shadow-lg flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-md">Your Resume Score is low</h2>
                  <p className="text-purple-200 text-sm">Build your Resume to increase your chances!</p>
                </div>
                <div className="bg-orange-400 w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold border-4 border-purple-500">59</div>
              </div>
              <button className="bg-white border-2 border-purple-600 text-purple-600 w-full mt-[-25px] mx-auto relative top-[-15px] px-4 py-2 rounded-lg font-semibold flex items-center justify-center text-sm shadow-md">
                Resume Editor <Icon as={FiArrowRight} className="ml-2" />
              </button>
            </div>
          </div>
        </div>
      );
};


//================================================
// UPDATED Resume Parser Page Component
//================================================
const ResumeParser: React.FC = () => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [extractedSkills, setExtractedSkills] = useState<string[]>([]);
    const [isParsing, setIsParsing] = useState(false);
    // NEW: Add state for error messages
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Your backend endpoint URL
    const API_ENDPOINT = "http://127.0.0.1:8000/upload-resume/";

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            setSelectedFile(event.target.files[0]);
            setExtractedSkills([]);
            setErrorMessage(null); // Clear previous errors
        }
    };

    const handleFileParse = async () => {
        if (!selectedFile) return;

        setIsParsing(true);
        setErrorMessage(null);

        // Use FormData to send the file
        const formData = new FormData();
        formData.append('file', selectedFile);

        try {
            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                // If the server returns an error (e.g., 400, 500), use its message
                throw new Error(data.detail || 'Something went wrong');
            }

            // Success! Update the state with the skills from the backend
            setExtractedSkills(data.extracted_skills);

        } catch (error: any) {
            console.error("Parsing failed:", error);
            setErrorMessage(error.message || "An unexpected error occurred.");
        } finally {
            // This will run whether the request succeeds or fails
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

                    {/* NEW: Display error messages here */}
                    {errorMessage && (
                        <div className="mt-4 flex items-center text-red-600 bg-red-100 p-3 rounded-lg w-full">
                            <Icon as={FiAlertCircle} className="mr-2" />
                            <span className="text-sm">{errorMessage}</span>
                        </div>
                    )}
  
                  <button
                      onClick={handleFileParse}
                      disabled={!selectedFile || isParsing}
                      className="mt-6 w-full max-w-xs bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold flex items-center justify-center disabled:bg-purple-300 disabled:cursor-not-allowed transition-colors"
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


//================================================
// Layout Component (No changes)
//================================================
const DashboardLayout: React.FC = () => {
    return (
        <div className="flex h-screen bg-white">
            <Sidebar />
            <div className="flex-1 flex flex-col">
                <Header />
                <main className="flex-1 overflow-y-auto">
                    <Outlet /> {/* Child routes will render here */}
                </main>
            </div>
        </div>
    );
};


//================================================
// Main App Component with Router (No changes)
//================================================
const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<DashboardLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/resume-parser" element={<ResumeParser />} />
          {/* Add other routes that need the dashboard layout here */}
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;