import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';

export default function AdminPage() {
  const [token, setToken] = useState(null);
  const [userEmail, setUserEmail] = useState(null);

	const handleLoginSuccess = async (credentialResponse) => {
		const idToken = credentialResponse.credential;

		// Send the token to your Worker to verify
		const res = await fetch("https://swimming-api.ryanyun2010.workers.dev/verify", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"Authorization": `Bearer ${idToken}` // send token in header
			},
		});

		if (res.ok) {
			const data = await res.json();
			if (data.allowed) {
				alert(`Welcome, ${data.email}`);
			} else {
				alert("Access denied");
			}
		} else {
			alert("Token verification failed");
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


