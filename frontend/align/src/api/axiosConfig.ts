import axios from 'axios';
import { fetchAuthSession } from 'aws-amplify/auth';

// The base URL of your user-api service
const API_URL = 'http://127.0.0.1:8000'; // Adjust if your user-api runs on a different port

const apiClient = axios.create({
  baseURL: API_URL,
});

// Interceptor to add the auth token to every request
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString()
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    } catch (error) {
      // User is not authenticated
      console.log('No active session found for Axios interceptor');
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default apiClient;