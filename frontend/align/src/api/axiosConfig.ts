import axios from 'axios';
import { fetchAuthSession } from 'aws-amplify/auth';

// The base URL of your user-api service
const API_URL = 'http://127.0.0.1:8000'; // Adjust if your user-api runs on a different port

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to add the auth token to every request
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString()
      
      if (token) {
        console.log('[Axios Interceptor] Token found, adding to headers.');
        config.headers.Authorization = `Bearer ${token}`;
      } else {
        console.warn('[Axios Interceptor] No token found in session.');
      }
      return config;
    } catch (error) {
      console.error('[Axios Interceptor] Error fetching auth session:', error);
      // It's crucial to reject the promise if we can't get a token
      // This will prevent the request from hanging.
      return Promise.reject(error);
    }
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default apiClient;