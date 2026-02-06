import { useEffect, useState} from "react";
import { BrowserRouter as Router, Routes, Route, useSearchParams} from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import AdminPage from "./pages/AdminPage"; // your AdminPage component
import { formatDate, zodParseWith, getResponseJSONAndParse ,formatTime} from "./lib/utils";
import { timesSchema, meetsSchema , Time, Meet, Swimmer, formatEventLabel, swimmersSchema} from "./lib/defs";
import { z, ZodError } from "zod";
import * as Errors from "./lib/errors";
import { ResultAsync, okAsync, errAsync } from "neverthrow";
import { ErrorRes } from "./lib/errors";




function Home() {
	const [recentMeets, setRecentMeets] = useState<Meet[]>([]);
	const [meets, setMeets] = useState<Meet[]>([]);
	const [searchParams, setSearchParams] = useSearchParams();

	const [curMeetInfo, setCurMeetInfo] = useState<Meet | null>(null);
	const [curSwimmerInfo, setCurSwimmerInfo] = useState<Swimmer | null>(null);

	const [times, setTimes] = useState<Time[]>([]);
	const [currentTimes, setCurrentTimes] = useState<Time[]>([]);

	const [swimmers, setSwimmers] = useState<Swimmer[]>([]);

	const [doneLoading, setDoneLoading] = useState(false);

	useEffect(() => {
		ResultAsync.fromPromise(fetch("https://swimming-api.ryanyun2010.workers.dev/swimmers"), (e) => new Errors.NoResponse(`Failed to fetch swimmers: ${JSON.stringify(e)}`))
		.andThen((res) => getResponseJSONAndParse(res, swimmersSchema, (e) => new Errors.MalformedResponse(`Failed to parse swimmers response: ${JSON.stringify(e)}`)))
		.match(
			(data) => {
				setSwimmers(data);
			},
			(err) => {
				console.error("Failed to load swimmers:", err);
				alert("Failed to load swimmers, see console");
			}
		);

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

		ResultAsync.fromPromise(fetch("https://swimming-api.ryanyun2010.workers.dev/meets"), (e) => new Errors.NoResponse(`Failed to fetch recent meets: ${JSON.stringify(e)}`))
		.andThen((res) => getResponseJSONAndParse(res, meetsSchema, (e) => new Errors.MalformedResponse(`Failed to parse recent meets response: ${JSON.stringify(e)}`)))
		.match(
			(data) => {
				setMeets(data);
				setRecentMeets(data.sort((a: Meet, b: Meet) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5));
			},
			(err) => {
				console.error("Failed to load meet records:", err);
				alert("Failed to load records, see console");
			}
		);

	}, []);
	useEffect(() => {
		setCurMeetInfo(null);
		setCurSwimmerInfo(null);
		if (searchParams.get("meet_id") != null && searchParams.get("meet_id")!.length > 0) {
			setCurMeetInfo(meets.find((m) => m.id == parseInt(searchParams.get("meet_id")!)) ?? null);
		} 

		if (searchParams.get("swimmer_id") != null && searchParams.get("swimmer_id")!.length > 0) {
			setCurSwimmerInfo(swimmers.find((s) => s.id == parseInt(searchParams.get("swimmer_id")!)) ?? null);
		} 
	}, [searchParams, swimmers, meets]);

	useEffect(() => {
		if (curMeetInfo != null && curSwimmerInfo == null) {
			setCurrentTimes(times.filter((t) => t.meet_id == curMeetInfo.id));
		} else if (curSwimmerInfo != null && curMeetInfo == null) {
			setCurrentTimes(times.filter((t) => t.swimmer_id == curSwimmerInfo.id));
		} else if (curSwimmerInfo != null && curMeetInfo != null) {
			setCurrentTimes(times.filter((t) => t.swimmer_id == curSwimmerInfo.id && t.meet_id == curMeetInfo.id));
		} else {
			setCurrentTimes([]);
		}
	}, [curMeetInfo, curSwimmerInfo, times]);

	function renderHeader() {
		if (curMeetInfo != null && curSwimmerInfo == null) {
			return <h2>Results for Meet: {curMeetInfo.name} | {curMeetInfo.location} | {formatDate(curMeetInfo.date)}</h2>
		} else if (curSwimmerInfo != null && curMeetInfo == null) {
			return <h2>Results for Swimmer: {curSwimmerInfo.name} '{curSwimmerInfo.graduating_year % 100}</h2>
		} else if (curSwimmerInfo != null && curMeetInfo != null) {
			return <h2>Results for Swimmer: {curSwimmerInfo.name} '{curSwimmerInfo.graduating_year % 100} at Meet: {curMeetInfo.name} | {curMeetInfo.location} | {formatDate(curMeetInfo.date)}</h2>
		} else {
			return <h2>Invalid search params</h2>
		}
	}

	
	if (searchParams.get("meet_id") == null && searchParams.get("swimmer_id") == null) {
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
	} else {
		return (
			<div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
			<h1>Nueva Swimming Records</h1>
			{
			renderHeader()	
			}
			<ul style={{ listStyle: "none", padding: 0 }}>
			{currentTimes.map((r) => (
				<li
				key={r.id}
				style={{
					padding: "0.5rem 0",
					borderBottom: "1px solid #ddd"
				}}
				>
				<strong>
				{r.swimmer_name} '{r.swimmer_year % 100} | {formatEventLabel(r.event)} {(r.type == "relay") ? ((r.start) == "flat" ? " | Relay Split, Flat Start" : " | Relay Split, Relay Start ") : ""} | {formatTime(r.time)}
				</strong>
				<br></br>
				{r.meet_name} | {formatDate(r.meet_date)} | {r.meet_location}
				</li>
			))}
			</ul>
			</div>
		);

	}
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
