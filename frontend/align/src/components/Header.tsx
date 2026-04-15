import React from 'react';
import { FiBell, FiSun, FiMoon } from 'react-icons/fi';
import Icon from './Icon';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const Header: React.FC = () => {
  const { user } = useAuth();
  const firstName = user?.full_name?.split(' ')[0];
  const { isDark, toggleTheme } = useTheme();

  return (
    <header className="bg-white/80 dark:bg-[#0d0d1a]/80 backdrop-blur-sm border-b border-slate-200 dark:border-white/10 px-6 py-4 flex justify-end items-center w-full transition-colors duration-300">
      <div className="flex items-center gap-3">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="p-2 rounded-lg text-slate-500 dark:text-white/50 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-800 dark:hover:text-white transition-all"
        >
          <Icon as={isDark ? FiSun : FiMoon} className="text-lg" />
        </button>

        {/* Notifications */}
        <button className="relative p-2 rounded-lg text-slate-500 dark:text-white/50 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-800 dark:hover:text-white transition-all">
          <Icon as={FiBell} className="text-lg" />
          <span className="absolute top-1.5 right-1.5 block h-1.5 w-1.5 rounded-full bg-red-500" />
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-slate-200 dark:bg-white/10" />

        {/* User */}
        <div className="flex items-center gap-3">
          <img
            src="https://i.pravatar.cc/40?img=1"
            alt="User"
            className="w-9 h-9 rounded-full border-2 border-slate-200 dark:border-white/20"
          />
          <div>
            <div className="font-semibold text-slate-800 dark:text-white text-sm leading-tight">
              {firstName || '...'}
            </div>
            <div className="text-xs text-slate-400 dark:text-white/40">Student</div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;