import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiGrid, FiFileText, FiBookOpen, FiLogOut, FiUploadCloud } from 'react-icons/fi';
import Icon from './Icon';
import { useAuth } from '../context/AuthContext'

const Sidebar: React.FC = () => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;
  const { logout } = useAuth();

  const handleLogout = async() => {
    try{
      await logout();
    } catch (error) {
      console.error('Error signing out: ', error);
    }
  } 

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
        <button 
          onClick={handleLogout}
          className="flex items-center text-gray-600 hover:text-purple-600 w-full">
          <Icon as={FiLogOut} className="mr-3" />
          Log-out
        </button>
      </div>
    </div>
  );
};

export default Sidebar;