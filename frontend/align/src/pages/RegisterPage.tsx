import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

interface FieldErrors {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

const passwordRequirements = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'At least one uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'At least one lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { label: 'At least one number', test: (p: string) => /[0-9]/.test(p) },
  { label: 'At least one special character (!@#$%^&* etc.)', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

const RegisterPage: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [showRequirements, setShowRequirements] = useState(false);
  const { register } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [isLoading, setIsLoading] = useState(false);

  const clearFieldError = (field: keyof FieldErrors) =>
    setFieldErrors(prev => ({ ...prev, [field]: undefined }));

  const validate = (): boolean => {
    const errors: FieldErrors = {};

    if (!fullName.trim()) {
      errors.fullName = 'Full name is required.';
    } else if (fullName.trim().length < 2) {
      errors.fullName = 'Please enter your full name.';
    }

    if (!email.trim()) {
      errors.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email address.';
    }

    const failedReqs = passwordRequirements.filter(r => !r.test(password));
    if (!password) {
      errors.password = 'Password is required.';
    } else if (failedReqs.length > 0) {
      errors.password = `Password must meet all requirements: ${failedReqs.map(r => r.label.toLowerCase()).join('; ')}.`;
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password.';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;
    setIsLoading(true);

    try {
      await register({ full_name: fullName, email, password });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      if (err?.response?.data?.detail) {
        setError(err.response.data.detail);
      } else if (err?.name === 'UsernameExistsException') {
        setError('An account with this email already exists. Try signing in.');
      } else if (err?.name === 'InvalidPasswordException') {
        setError('Password does not meet the required policy. Please check the requirements below.');
        setShowRequirements(true);
      } else if (err?.name === 'InvalidParameterException') {
        setError('Invalid input. Please check your details and try again.');
      } else if (err?.name === 'TooManyRequestsException' || err?.name === 'LimitExceededException') {
        setError('Too many attempts. Please wait a moment before trying again.');
      } else if (err?.name === 'NetworkError' || err?.message?.toLowerCase().includes('network')) {
        setError('Network error. Please check your connection and try again.');
      } else {
        setError('Failed to create account. Please try again later.');
      }
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const inputBase = 'mt-1 w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400';
  const inputNormal = `${inputBase} border-gray-300 dark:border-gray-600`;
  const inputErr = `${inputBase} border-red-500 bg-red-50 dark:bg-red-900/20`;

  return (
    <div className="flex items-center justify-center min-h-screen w-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white">Create an Account</h2>
            <p className="mt-2 text-gray-500 dark:text-gray-400">Get started on your internship journey</p>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
            className="p-2 mt-1 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shrink-0"
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

          {/* Full Name */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => { setFullName(e.target.value); clearFieldError('fullName'); }}
              placeholder="John Doe"
              className={fieldErrors.fullName ? inputErr : inputNormal}
            />
            {fieldErrors.fullName && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.fullName}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); clearFieldError('email'); }}
              placeholder="you@example.com"
              className={fieldErrors.email ? inputErr : inputNormal}
            />
            {fieldErrors.email && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.email}</p>}
          </div>

          {/* Password */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); clearFieldError('password'); }}
              onFocus={() => setShowRequirements(true)}
              placeholder="••••••••"
              className={fieldErrors.password ? inputErr : inputNormal}
            />
            {fieldErrors.password && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.password}</p>}
            {showRequirements && (
              <ul className="mt-2 space-y-1">
                {passwordRequirements.map(req => {
                  const met = req.test(password);
                  return (
                    <li key={req.label} className={`flex items-center gap-1.5 text-xs ${met ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
                      <span>{met ? '✓' : '○'}</span>
                      {req.label}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); clearFieldError('confirmPassword'); }}
              placeholder="••••••••"
              className={fieldErrors.confirmPassword ? inputErr : inputNormal}
            />
            {fieldErrors.confirmPassword && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.confirmPassword}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 disabled:bg-purple-300 transition-colors"
          >
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-600 dark:text-gray-400">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-purple-500 hover:text-purple-400">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;