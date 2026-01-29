import { useEffect, useState } from "react";

function App() {
  const [records, setRecords] = useState([]);

  useEffect(() => {
    fetch("https://swimming-api.<your-subdomain>.workers.dev")
      .then((res) => res.json())
      .then((data) => setRecords(data));
  }, []);

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Swimming Records</h1>
      <ul>
        {records.map((r) => (
          <li key={r.id}>
            {r.name} — {r.event} — {r.time}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
