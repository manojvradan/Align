// src/pages/ConfirmRegistrationPage.tsx

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ConfirmRegistrationPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Get the confirmRegistration function from our updated AuthContext
  const { confirmRegistration } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsLoading(true);

    if (!email || !code) {
        setError("Please provide both an email and the verification code.");
        setIsLoading(false);
        return;
    }

    try {
      await confirmRegistration(email, code);
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
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-xl shadow-lg">
        <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-800">Confirm Your Account</h2>
            <p className="mt-2 text-gray-500">
              We sent a verification code to your email. Please enter it below.
            </p>
        </div>
        
        <form className="space-y-6" onSubmit={handleSubmit}>
          {error && <p className="text-sm text-center text-red-600 bg-red-100 p-3 rounded-lg">{error}</p>}
          {successMessage && <p className="text-sm text-center text-green-600 bg-green-100 p-3 rounded-lg">{successMessage}</p>}
          
          <div>
            <label className="text-sm font-medium text-gray-700">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              disabled={isLoading || !!successMessage}
              className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 disabled:bg-gray-100"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-700">Verification Code</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              required
              disabled={isLoading || !!successMessage}
              className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 disabled:bg-gray-100"
            />
          </div>
          
          {!successMessage && (
            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full py-3 px-4 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 disabled:bg-purple-300 transition-colors"
            >
              {isLoading ? 'Verifying...' : 'Verify Account'}
            </button>
          )}

        </form>

        <p className="text-center text-sm text-gray-600">
            {successMessage ? (
                <Link to="/login" className="font-medium text-purple-600 hover:text-purple-500">
                    Click here to Log In
                </Link>
            ) : (
                <Link to="/login" className="font-medium text-purple-600 hover:text-purple-500">
                    Back to Login
                </Link>
            )}
        </p>
      </div>
    </div>
  );
};

export default ConfirmRegistrationPage;