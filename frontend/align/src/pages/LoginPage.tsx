import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Link, Navigate, useNavigate } from 'react-router-dom';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, isAuthenticated, isLoading, fetchUserProfile } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const validate = (): boolean => {
    const errors: { email?: string; password?: string } = {};
    if (!email.trim()) {
      errors.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email address.';
    }
    if (!password) {
      errors.password = 'Password is required.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;
    setIsSubmitting(true);

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await login({ email, password } as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      if (err && err.name === 'UserAlreadyAuthenticatedException') {
        const syncSuccess = await fetchUserProfile();
        if (syncSuccess) {
          navigate('/dashboard', { replace: true });
        } else {
          setError('Could not sync your profile. Please try again.');
        }
      } else if (err?.name === 'UserNotFoundException' || err?.name === 'NotAuthorizedException') {
        setError('Incorrect email or password. Please try again.');
      } else if (err?.name === 'UserNotConfirmedException') {
        setError('Your account has not been confirmed. Please check your email for a verification code.');
      } else if (err?.name === 'TooManyRequestsException' || err?.name === 'LimitExceededException') {
        setError('Too many attempts. Please wait a moment before trying again.');
      } else if (err?.name === 'NetworkError' || err?.message?.toLowerCase().includes('network')) {
        setError('Network error. Please check your connection and try again.');
      } else {
        setError('Failed to sign in. Please try again later.');
        console.error(err);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-white">Loading Session...</div>;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const inputBase = 'w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-400';
  const inputNormal = `${inputBase} border-gray-300 dark:border-gray-600`;
  const inputError = `${inputBase} border-red-500 bg-red-50 dark:bg-red-900/20`;

  return (
    <div className="flex items-center justify-center min-h-screen w-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold text-gray-800 dark:text-white">Sign In</h2>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
            className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            {isDark ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" /></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" /></svg>
            )}
          </button>
        </div>
        <form className="space-y-5" onSubmit={handleSubmit} noValidate>
          {error && (
            <div className="text-sm text-center text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 p-3 rounded-lg">
              {error}
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setFieldErrors(prev => ({ ...prev, email: undefined })); }}
              placeholder="you@example.com"
              className={`mt-1 ${fieldErrors.email ? inputError : inputNormal}`}
            />
            {fieldErrors.email && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.email}</p>}
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setFieldErrors(prev => ({ ...prev, password: undefined })); }}
              placeholder="••••••••"
              className={`mt-1 ${fieldErrors.password ? inputError : inputNormal}`}
            />
            {fieldErrors.password && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.password}</p>}
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2 px-4 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 disabled:bg-purple-300 transition-colors"
          >
            {isSubmitting ? 'Signing in...' : 'Login'}
          </button>
        </form>
        <p className="text-center text-gray-600 dark:text-gray-400">
          Don't have an account?{' '}
          <Link to="/register" className="font-medium text-purple-500 hover:text-purple-400">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;