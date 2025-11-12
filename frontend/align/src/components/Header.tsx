import React from 'react';
import { Link } from 'react-router-dom';

const Header: React.FC = () => {
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

export default Header;