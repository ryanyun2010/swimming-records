import { useEffect, useState } from "react";
import { GoogleLogin } from "@react-oauth/google";

export default function AdminPage() {
  const [token, setToken] = useState(null);
  const [userEmail, setUserEmail] = useState(null);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [meets, setMeets] = useState([]);

  /* ---------------- AUTH ---------------- */

  const handleLoginSuccess = async (credentialResponse) => {
    const idToken = credentialResponse.credential;
    setToken(idToken);

    const res = await fetch(
      "https://swimming-api.ryanyun2010.workers.dev/verify",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      }
    );

    if (!res.ok) {
      alert("Token verification failed");
      return;
    }

    const data = await res.json();
    if (!data.allowed) {
      alert("Unauthorized");
      return;
    }

    setUserEmail(data.email);
    setLoginSuccess(true);
  };

  /* ---------------- FETCH MEETS ---------------- */

  useEffect(() => {
    if (!loginSuccess) return;

    fetch("https://swimming-api.ryanyun2010.workers.dev/meets")
      .then((res) => res.json())
      .then(setMeets)
      .catch(() => alert("Failed to load meets"));
  }, [loginSuccess]);

  /* ---------------- ADD MEET ---------------- */

  const addMeet = async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);

    const dateSeconds = Math.floor(
      new Date(form.get("date")).getTime() / 1000
    );

    const res = await fetch(
      "https://swimming-api.ryanyun2010.workers.dev/meets",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: form.get("name"),
          location: form.get("location"),
          date: dateSeconds,
        }),
      }
    );

    if (!res.ok) {
      alert("Failed to add meet");
      return;
    }

    e.target.reset();
    const updated = await fetch(
      "https://swimming-api.ryanyun2010.workers.dev/meets"
    ).then((r) => r.json());
    setMeets(updated);
  };

  /* ---------------- ADD RECORD ---------------- */

  const addRecord = async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);

    const res = await fetch(
      "https://swimming-api.ryanyun2010.workers.dev/records",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          swimmer_name: form.get("swimmer"),
          meet_id: Number(form.get("meet_id")),
          event: form.get("event"),
          type: form.get("type"),
          start: form.get("start"),
          time: Number(form.get("time")),
        }),
      }
    );

    if (!res.ok) {
      alert("Failed to add record");
      return;
    }

    alert("Record added");
    e.target.reset();
  };

  /* ---------------- UI ---------------- */

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      {!loginSuccess ? (
        <GoogleLogin
          onSuccess={handleLoginSuccess}
          onError={() => alert("Login failed")}
        />
      ) : (
        <>
          <p>
            Logged in as <strong>{userEmail}</strong>
          </p>

          <hr />

          {/* ADD MEET */}
          <h2>Add Meet</h2>
          <form onSubmit={addMeet}>
            <input name="name" placeholder="Meet name" required />
            <input name="location" placeholder="Location" required />
            <input name="date" type="date" required />
            <button type="submit">Add Meet</button>
          </form>

          <hr />

          {/* ADD RECORD */}
          <h2>Add Swimmer Result</h2>
          <form onSubmit={addRecord}>
            <input name="swimmer" placeholder="Swimmer name" required />

            <select name="meet_id" required>
              <option value="">Select meet</option>
              {meets.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>

            <input name="event" placeholder="Event (e.g. 100 Free)" required />

            <select name="type">
              <option value="individual">Individual</option>
              <option value="relay">Relay</option>
            </select>

            <select name="start">
              <option value="flat">Flat start</option>
              <option value="relay">Relay start</option>
            </select>

            <input
              name="time"
              type="number"
              step="0.01"
              placeholder="Time (seconds)"
              required
            />

            <button type="submit">Add Record</button>
          </form>
        </>
      )}
    </div>
  );
}

