import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import AdminPage from "./pages/AdminPage"; // your AdminPage component
import { formatEventLabel, formatDate, formatTime } from "./lib/utils";

// --- Home Page ---
function Home() {
	const [records, setRecords] = useState([]);
	const [recentMeets, setRecentMeets] = useState([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		fetch("https://swimming-api.ryanyun2010.workers.dev")
			.then((res) => {
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				return res.json();
			})
			.then((data) => {
				setRecords(data);
			})
			.catch((err) => {
				console.error("Failed to load records:", err);
				alert("Failed to load records, see console");
			});
	}, []);

	useEffect(() => {
		fetch("https://swimming-api.ryanyun2010.workers.dev/recent_meets")
			.then((res) => {
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				return res.json();
			})
			.then((data) => {
				setRecentMeets(data);
			})
			.catch((err) => {
				console.error("Failed to load records:", err);
				alert("Failed to load records, see console");
			});
	}, []);

	//if (loading) return <p>Loading records...</p>;

	// return (
	// 	<div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
	// 		<h1>Swimming Records</h1>
	// 		<ul style={{ listStyle: "none", padding: 0 }}>
	// 			{records.map((r) => (
	// 				<li
	// 					key={r.id}
	// 					style={{
	// 						padding: "0.5rem 0",
	// 						borderBottom: "1px solid #ddd"
	// 					}}
	// 				>
	//
	// 					<strong>{r.swimmer_name} '{Number(r.swimmer_year) % 100}</strong> —{" "}
	// 					{formatEventLabel(r.event)} —{" "}
	// 				<strong>{formatTime(r.time)}</strong>
	// 					<br />
	// 					<small>
	// 						Meet: {r.meet_name} | {r.meet_location} |{" "}
	// 						{formatDate(r.meet_date)}
	// 					</small>
	// 				</li>
	// 			))}
	// 		</ul>
	// 	</div>
	// );
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
							{r.name} | {r.location} |{" "}
							{formatDate(r.date)}
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
