import React from 'react';
import { FiArrowRight, FiBriefcase, FiBookmark } from 'react-icons/fi';
import Icon from '../components/Icon'; // Note the path change

const Dashboard: React.FC = () => {
  return (
    <div className="p-8 bg-gray-50 h-full">
      <h1 className="text-3xl font-bold text-gray-800">Hello, Manojvradan!</h1>
      <p className="text-gray-500 mb-8">Here is your daily activities and job alerts</p>

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

export default Dashboard;