import React from 'react';
import { FiBell } from 'react-icons/fi';
import Icon from './Icon';
import { useAuth } from '../context/AuthContext';

const Header: React.FC = () => {
  const { user } = useAuth(); 
  const firstName = user?.full_name?.split(' ')[0];

  return (
    <header className="bg-white/80 backdrop-blur-sm shadow-sm p-4 flex justify-between items-center w-full border-b border-slate-200">
      {/* Search Bar */}
      <div className="relative">
      </div>

      {/* User Actions */}
      <div className="flex items-center gap-6">
        <button className="relative text-slate-500 hover:text-slate-800">
          <Icon as={FiBell} className="text-xl" />
          <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
        </button>
        <div className="flex items-center gap-3">
            <img src="https://i.pravatar.cc/40?img=1" alt="User" className="w-10 h-10 rounded-full border-2 border-slate-200" />
            <div>
                <div className="font-semibold text-slate-800 text-sm">{firstName || '...'}</div>
                <div className="text-xs text-slate-500">Student</div>
            </div>
        </div>
      </div>
    </header>
  );
};

export default Header;