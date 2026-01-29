import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import AdminPage from "./AdminPage"; // your Google login component

// Main page component (your existing app)
function Home() {
  const [records, setRecords] = useState([]);

  useEffect(() => {
    fetch("https://swimming-api.ryanyun2010.workers.dev")
      .then((res) => res.json())
      .then((data) => setRecords(data));
  }, []);

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Swimming Records</h1>
      <ul>
        {records.map((r) => (
          <li key={r.id}>
            {r.swimmer_name} — {r.event} — {r.time}
          </li>
        ))}
      </ul>
    </div>
  );
}

function App() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </Router>
    </GoogleOAuthProvider>
  );
}

export default App;

