import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, Navigate, useNavigate } from 'react-router-dom';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);


  const { login, isAuthenticated, isLoading, fetchUserProfile} = useAuth();
  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await login({ email, password});
    } catch (err: any) {
      if (err && err.name === 'UserAlreadyAuthenticatedException') {
        console.log("User already authenticated, syncing profile...");
        const syncSuccess = await fetchUserProfile();
        if (syncSuccess) {
          // If the sync is successful, we navigate immediately.
          // This is the logic that fixes the "stuck" page.
          navigate('/', { replace: true });
        } else {
          setError('Could not sync your profile. Please try again.');
        }
      } else {
        setError('Failed to login. Please check your credentials.');
        console.error(err);
      }
    } finally {
      setIsSubmitting(false)}
  };

  if (isLoading) {
    return <div>Loading Session...</div>;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-xl shadow-lg">
        <h2 className="text-3xl font-bold text-center text-gray-800">Sign In</h2>
        <form className="space-y-6" onSubmit={handleSubmit}>
          {error && <p className="text-red-500 text-center">{error}</p>}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
          />
          <button type="submit" className="w-full py-2 px-4 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700">
            Login
          </button>
        </form>
         <p className="text-center text-gray-600">
            Don't have an account?{' '}
            <Link to="/register" className="font-medium text-purple-600 hover:text-purple-500">
                Sign up
            </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;