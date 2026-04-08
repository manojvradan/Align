import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiGrid, FiFileText, FiLogOut, FiUploadCloud, FiBriefcase } from 'react-icons/fi';
import Icon from './Icon';
import { useAuth } from '../context/AuthContext';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error signing out: ', error);
    }
  };

  const navLinks = [
    { to: '/dashboard', icon: FiGrid, text: 'Overview' },
    { to: '/jobs', icon: FiBriefcase, text: 'Search Internships' },
    { to: '/applied', icon: FiFileText, text: 'Applied Internships' },
    { to: '/resume-parser', icon: FiUploadCloud, text: 'Resume Parser' },
  ];

  return (
    <aside className="bg-white text-slate-800 w-64 flex flex-col justify-between p-6 hidden lg:flex border-r border-slate-200">
      <div>
        <div className="flex items-center gap-3 mb-12">
          <div className="bg-slate-800 w-10 h-10 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">A</span>
          </div>
          <span className="text-xl font-bold text-slate-800">Align</span>
        </div>
        <nav>
          <ul className="space-y-2">
            {navLinks.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className={`flex items-center p-3 rounded-lg transition-colors duration-200 ${
                    isActive(link.to)
                      ? 'bg-slate-800 text-white font-semibold'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                  }`}
                >
                  <Icon as={link.icon} className="mr-3 text-lg" />
                  {link.text}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <button
        onClick={handleLogout}
        className="flex items-center p-3 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-800 w-full transition-colors duration-200"
      >
        <Icon as={FiLogOut} className="mr-3 text-lg" />
        Log out
      </button>
    </aside>
  );
};

export default Sidebar;