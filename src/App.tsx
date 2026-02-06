import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import AdminPage from "./pages/AdminPage"; // your AdminPage component
import { formatDate, zodParseWith, getResponseJSONAndParse } from "./lib/utils";
import { timesSchema, meetsSchema , Time, Meet} from "./lib/defs";
import { z, ZodError } from "zod";
import * as Errors from "./lib/errors";
import { ResultAsync, okAsync, errAsync } from "neverthrow";
import { ErrorRes } from "./lib/errors";




function Home() {
	const [recentMeets, setRecentMeets] = useState<Meet[]>([]);
	const [times, setTimes] = useState<Time[]>([]);

	useEffect(() => {
		ResultAsync.fromPromise(fetch("https://swimming-api.ryanyun2010.workers.dev/"), (e) => new Errors.NoResponse(`Failed to fetch records: ${JSON.stringify(e)}`))
		.andThen((res) => getResponseJSONAndParse(res, timesSchema, (e) => new Errors.MalformedResponse(`Failed to parse records response: ${JSON.stringify(e)}`)))
		.match(
			(data) => {
				setTimes(data);
			},
			(err) => {
				console.error("Failed to load records:", err);
				alert("Failed to load records, see console");
			}
		);

		ResultAsync.fromPromise(fetch("https://swimming-api.ryanyun2010.workers.dev/recent_meets"), (e) => new Errors.NoResponse(`Failed to fetch recent meets: ${JSON.stringify(e)}`))
		.andThen((res) => getResponseJSONAndParse(res, meetsSchema, (e) => new Errors.MalformedResponse(`Failed to parse recent meets response: ${JSON.stringify(e)}`)))
		.match(
			(data) => {
				setRecentMeets(data);
			},
			(err) => {
				console.error("Failed to load meet records:", err);
				alert("Failed to load records, see console");
			}
		);
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
							{r.name} | {r.location} | {formatDate(r.date)}

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
