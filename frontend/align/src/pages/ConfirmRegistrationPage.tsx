// src/pages/ConfirmRegistrationPage.tsx

import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const ConfirmRegistrationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialEmail = searchParams.get('email') || '';

  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Get the confirmRegistration function from our updated AuthContext
  const { confirmRegistration } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsLoading(true);

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedCode = code.trim();

    if (!normalizedEmail || !normalizedCode) {
        setError("Please provide both an email and the verification code.");
        setIsLoading(false);
        return;
    }

    try {
      await confirmRegistration(normalizedEmail, normalizedCode);
      setSuccessMessage('Account confirmed successfully! You can now log in.');
      // Optional: Automatically redirect after a few seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      // Display user-friendly errors from Cognito
      setError(err.message || 'Failed to confirm account. Please try again.');
      console.error("Confirmation error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen w-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className="w-full max-w-md p-8 space-y-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white">Confirm Your Account</h2>
            <p className="mt-2 text-gray-500 dark:text-gray-400">
              We sent a verification code to your email. Please enter it below.
            </p>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
            className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-shrink-0 self-start mt-1"
          >
            {isDark ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" /></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" /></svg>
            )}
          </button>
        </div>
        
        <form className="space-y-6" onSubmit={handleSubmit}>
          {error && (
            <p className="text-sm text-center text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 p-3 rounded-lg">
              {error}
            </p>
          )}
          {successMessage && (
            <p className="text-sm text-center text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 p-3 rounded-lg">
              {successMessage}
            </p>
          )}
          
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              disabled={isLoading || !!successMessage}
              className="mt-1 w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 disabled:bg-gray-100 dark:disabled:bg-gray-600"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Verification Code</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              required
              disabled={isLoading || !!successMessage}
              className="mt-1 w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 disabled:bg-gray-100 dark:disabled:bg-gray-600"
            />
          </div>
          
          {!successMessage && (
            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full py-3 px-4 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 disabled:bg-purple-300 dark:disabled:bg-purple-800 transition-colors"
            >
              {isLoading ? 'Verifying...' : 'Verify Account'}
            </button>
          )}
        </form>

        <p className="text-center text-sm text-gray-600 dark:text-gray-400">
            {successMessage ? (
                <Link to="/login" className="font-medium text-purple-600 dark:text-purple-400 hover:text-purple-500">
                    Click here to Log In
                </Link>
            ) : (
                <Link to="/login" className="font-medium text-purple-600 dark:text-purple-400 hover:text-purple-500">
                    Back to Login
                </Link>
            )}
        </p>
      </div>
    </div>
  );
};

export default ConfirmRegistrationPage;