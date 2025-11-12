// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import './index.css'

import { Amplify } from 'aws-amplify';

// Access the environment variables
const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID;
const userPoolClientId = import.meta.env.VITE_COGNITO_APP_CLIENT_ID;

Amplify.configure({
  // The Auth key is now nested inside a Resources key
  Auth: {
    Cognito: {

      userPoolId: userPoolId, // YOUR USER POOL ID
      userPoolClientId: userPoolClientId, // YOUR APP CLIENT ID (note the name change)
    },
    oauth: {
      domain: 'your-cognito-domain.auth.your-region.amazoncognito.com',
      scope: ['email', 'openid', 'profile'],
      // This line is the likely cause of the reload loop
      redirectSignIn: 'http://localhost:5173/',
      redirectSignOut: 'http://localhost:5173/login',
      responseType: 'code'
    }

  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)