import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiGrid, FiFileText, FiLogOut, FiBriefcase, FiBell, FiZap, FiX } from 'react-icons/fi';
import Icon from './Icon';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose }) => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;
  const { logout } = useAuth();

  // Close drawer on route change (mobile)
  useEffect(() => {
    if (onClose) onClose();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Lock body scroll when drawer is open on mobile
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

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

  const sidebarContent = (
    <aside className="bg-white dark:bg-[#0d0d1a] border-r border-slate-200 dark:border-white/10 w-64 flex flex-col justify-between p-6 h-full transition-colors duration-300">
      <div>
        {/* Logo row with close button on mobile */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-indigo-500 to-violet-600 w-10 h-10 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <span className="text-white font-bold text-xl">A</span>
            </div>
            <span className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">Align</span>
          </div>
          {/* Close button — only visible in mobile drawer */}
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="lg:hidden p-1.5 rounded-lg text-slate-400 dark:text-white/40 hover:bg-slate-100 dark:hover:bg-white/10 transition-all"
          >
            <Icon as={FiX} className="text-lg" />
          </button>
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

  return (
    <>
      {/* Desktop: static sidebar */}
      <div className="hidden lg:flex h-full">{sidebarContent}</div>

      {/* Mobile: slide-in drawer */}
      <div className={`lg:hidden fixed inset-0 z-[300] flex transition-all duration-300 ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={onClose}
        />
        {/* Drawer panel */}
        <div className={`relative h-full transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          {sidebarContent}
        </div>
      </div>
    </>
  );
};

export default Sidebar;