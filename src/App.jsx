import { useEffect, useState } from "react";
import { formatEventLabel } from "./App"; // or keep in utils

// Helper to format Unix timestamp (seconds) to human-readable date
function formatDate(seconds) {
  if (!seconds) return "";
  const d = new Date(seconds * 1000);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function Home() {
  const [records, setRecords] = useState([]);

  useEffect(() => {
    fetch("https://swimming-api.ryanyun2010.workers.dev")
      .then((res) => res.json())
      .then((data) => setRecords(data))
      .catch((err) => console.error("Failed to load records", err));
  }, []);

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Swimming Records</h1>
      {records.length === 0 ? (
        <p>Loading records...</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {records.map((r) => (
            <li
              key={r.id}
              style={{
                padding: "0.5rem 0",
                borderBottom: "1px solid #ddd",
              }}
            >
              <strong>{r.swimmer_name}</strong> —{" "}
              {formatEventLabel(r.event)} — <strong>{r.time.toFixed(2)}s</strong>
              <br />
              <small>
                Meet: {r.meet_name} | {r.meet_location} |{" "}
                {formatDate(r.meet_date)}
              </small>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default Home;

