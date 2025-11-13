import { createContext, useState, useContext, useEffect, type ReactNode } from 'react';
import apiClient from '../api/axiosConfig';
import { useNavigate } from 'react-router-dom';
import { Hub } from 'aws-amplify/utils';
import { 
  signIn, 
  signUp, 
  confirmSignUp, 
  signOut, 
  getCurrentUser,
} from 'aws-amplify/auth';

// Define the shape of your user and context
interface Skill {
  id: number;
  name: string;
}

interface User {
  id: number;
  email: string;
  full_name: string;
  created_at: string;
  skills: Skill[];
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  login: (formData: FormData) => Promise<void>;
  register: (userData: unknown) => Promise<void>;
  logout: () => void;
  confirmRegistration: (email: string, code: string) => Promise<void>;
  fetchUserProfile: () => Promise<void>; 
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = Hub.listen('auth', ({ payload: { event } }) => {
      if (event === 'signedIn') {
        fetchUserProfile();
      } else if (event === 'signedOut') {
        setUser(null);
        navigate('/login');
      }
    });

    checkCurrentUser(); // Check on initial load

    return unsubscribe;
  },[navigate]);

  // Check the current authenticated user
  const checkCurrentUser = async () => {
    setIsLoading(true);
    try {
      // Replaces Auth.currentAuthenticatedUser()
      await getCurrentUser(); 
      await fetchUserProfile();
      // If successful, the Hub listener will fire and fetch the profile
    } catch (error) {
      // This catch block only runs if getCurrentUser() fails.
      // This means the user is definitely not logged in.
      console.log('No Cognito session found.');
      setUser(null);
    } finally {
      // This block will ALWAYS run after the try/catch
      console.log('Finished auth check, setting isLoading to false.');
      setIsLoading(false);
    }
  };

  
  const fetchUserProfile = async () => {
    try {
      // This automatically uses the Cognito JWT from axiosConfig
      const { data } = await apiClient.get<User>('/users/me/');
      setUser(data);
      return true;
    } catch (error) {
      console.error("Failed to fetch user profile from our backend", error);
      // This might happen if the user is in Cognito but not yet in our DB
      setUser(null);
      return false;
    }
  };

  const login = async (formData: any) => {
    await signIn({
      username: formData.email, 
      password: formData.password 
    });
  };

  const register = async (userData: any) => {
    await signUp({
      username: userData.email,
      password: userData.password,
      options: {
        userAttributes: {
          email: userData.email,
          'custom:full_name': userData.full_name,
        },
      }
    });
    navigate(`/confirm-registration?email=${encodeURIComponent(userData.email)}`);
  };

  const confirmRegistration = async (email: string, code: string) => {
    await confirmSignUp({
      username: email,
      confirmationCode: code,
    });

    // After confirmation, navigate to login
    navigate('/login');
  };

  const logout = async () => {
    await signOut();
    // Hub listener will handle state change
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!user, user, isLoading, login, logout, fetchUserProfile, register, confirmRegistration }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context easily
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};