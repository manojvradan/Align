import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiGrid, FiFileText, FiLogOut, FiBriefcase, FiBell, FiZap } from 'react-icons/fi';
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
    { to: '/skills', icon: FiZap, text: 'Skills' },
    { to: '/notifications', icon: FiBell, text: 'Notifications' },
  ];

  return (
    <aside className="bg-white dark:bg-[#0d0d1a] border-r border-slate-200 dark:border-white/10 w-64 flex-col justify-between p-6 hidden lg:flex transition-colors duration-300">
      <div>
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10">
          <div className="bg-gradient-to-br from-indigo-500 to-violet-600 w-10 h-10 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <span className="text-white font-bold text-xl">A</span>
          </div>
          <span className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">Align</span>
        </div>

        <p className="text-xs font-semibold text-slate-400 dark:text-white/30 uppercase tracking-widest mb-3 px-3">
          Main
        </p>

        <nav>
          <ul className="space-y-1">
            {navLinks.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className={`flex items-center px-3 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium ${
                    isActive(link.to)
                      ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/20'
                      : 'text-slate-600 dark:text-white/50 hover:bg-slate-100 dark:hover:bg-white/8 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon as={link.icon} className="mr-3 text-base shrink-0" />
                  {link.text}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <button
        onClick={handleLogout}
        className="flex items-center px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-white/40 hover:bg-slate-100 dark:hover:bg-white/8 hover:text-slate-900 dark:hover:text-white w-full transition-all duration-200"
      >
        <Icon as={FiLogOut} className="mr-3 text-base shrink-0" />
        Log out
      </button>
    </aside>
  );
};

export default Sidebar;