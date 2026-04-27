import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const DashboardLayout: React.FC = () => {
  return (
    <div className="flex h-screen w-screen bg-slate-100 dark:bg-[#080810] font-sans transition-colors duration-300">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-visible">
        <Header />
        <main className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;