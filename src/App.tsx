import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import AdminPage from "./pages/AdminPage"; // your AdminPage component
import { formatDate } from "./lib/utils";
import { assertAreTimes, assertAreMeets, Meet } from "./lib/defs";

function Home() {
	const [times, setTimes] = useState([]);
	const [recentMeets, setRecentMeets] = useState<Meet[]>([]);

	useEffect(() => {
		fetch("https://swimming-api.ryanyun2010.workers.dev")
			.then((res) => {
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				return res.json();
			})
			.then((data) => {
				assertAreTimes(data.times);
				setTimes(data);
			})
			.catch((err) => {
				console.error("Failed to load records:", err);
				alert("Failed to load records, see console");
			});
		fetch("https://swimming-api.ryanyun2010.workers.dev/recent_meets")
			.then((res) => {
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				return res.json();
			})
			.then((data) => {
				assertAreMeets(data.meets);
				setRecentMeets(data);
			})
			.catch((err) => {
				console.error("Failed to load records:", err);
				alert("Failed to load records, see console");
			});
	}, []);

	return (
		<div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
			<h1>Nueva Swimming Records</h1>
			<h2>Recent Meets</h2>
			<ul style={{ listStyle: "none", padding: 0 }}>
				{recentMeets.map((r) => (
					<li
						key={r.id}
						style={{
							padding: "0.5rem 0",
							borderBottom: "1px solid #ddd"
						}}
					>
						<strong>
							{r.name} | {r.location} | {formatDate(parseInt(r.date))}
						</strong>
					</li>
				))}
			</ul>
		</div>
	);
}

// --- Main App with routing ---
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
