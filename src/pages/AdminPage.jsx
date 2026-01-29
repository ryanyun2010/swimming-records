import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';

export default function AdminPage() {
  const [token, setToken] = useState(null);
  const [userEmail, setUserEmail] = useState(null);

  const handleLoginSuccess = async (credentialResponse) => {
    const idToken = credentialResponse.credential;
    setToken(idToken);

    // Decode token to get user info (optional)
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
    if (res.ok) {
      const payload = await res.json();
      setUserEmail(payload.email); // Store email
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      {!token ? (
        <GoogleLogin
          onSuccess={handleLoginSuccess}
          onError={() => alert('Login failed')}
        />
      ) : (
        <div>
          <p>Logged in as: <strong>{userEmail}</strong></p>
          <p>Your Google ID token is stored and ready for API requests.</p>
        </div>
      )}
    </div>
  );
}

