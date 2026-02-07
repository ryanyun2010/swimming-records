import { useEffect, useState} from "react";
import "./App.css";
import { BrowserRouter as Router, Routes, Route, useSearchParams} from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import AdminPage from "./pages/AdminPage"; // your AdminPage component
import { formatDate, zodParseWith, getResponseJSONAndParse ,formatTime} from "./lib/utils";
import { timesSchema, meetsSchema , Time, Meet, Swimmer, formatEventLabel, swimmersSchema, Relay, relaySchema} from "./lib/defs";
import { z, ZodError } from "zod";
import * as Errors from "./lib/errors";
import { ResultAsync, okAsync, errAsync } from "neverthrow";
import { ErrorRes } from "./lib/errors";




function Home() {
	const [recentMeets, setRecentMeets] = useState<Meet[]>([]);
	const [searchParams, setSearchParams] = useSearchParams();
	const [currentTimes, setCurrentTimes] = useState<Time[]>([]);
	const [currentRelays, setCurrentRelays] = useState<Relay[]>([]);

	const [curMeetInfo, setCurMeetInfo] = useState<Meet | null>(null);
	const [curSwimmerInfo, setCurSwimmerInfo] = useState<Swimmer | null>(null);
	const [curRelayInfo, setCurRelayInfo] = useState<{id: number, swimmer_names: string[], date: number, event: string} | null>(null);

	const [times, setTimes] = useState<Time[]>([]);
	const [swimmers, setSwimmers] = useState<Swimmer[]>([]);
	const [meets, setMeets] = useState<Meet[]>([]);
	const [relays, setRelays] = useState<Relay[]>([]);





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

		ResultAsync.fromPromise(fetch("https://swimming-api.ryanyun2010.workers.dev/meets"), (e) => new Errors.NoResponse(`Failed to fetch meets: ${JSON.stringify(e)}`))
		.andThen((res) => getResponseJSONAndParse(res, meetsSchema, (e) => new Errors.MalformedResponse(`Failed to parse meets response: ${JSON.stringify(e)}`)))
		.match(
			(data) => {
				setMeets(data);
				setRecentMeets(data.sort((a: Meet, b: Meet) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5));
			},
			(err) => {
				console.error("Failed to load meet records:", err);
				alert("Failed to load meets, see console");
			}
		);

		ResultAsync.fromPromise(fetch("https://swimming-api.ryanyun2010.workers.dev/relays"), (e) => new Errors.NoResponse(`Failed to fetch relays: ${JSON.stringify(e)}`))
		.andThen((res) => getResponseJSONAndParse(res, z.array(relaySchema), (e) => new Errors.MalformedResponse(`Failed to parse relays response: ${JSON.stringify(e)}`)))
		.match(
			(data) => {
				setRelays(data);
			},
			(err) => {
				console.error("Failed to load relays:", err);
				alert("Failed to load relays, see console");
			}
		);

	}, []);
	useEffect(() => {
		setCurMeetInfo(null);
		setCurSwimmerInfo(null);
		setCurRelayInfo(null);
		if (searchParams.get("meet_id") != null && searchParams.get("meet_id")!.length > 0) {
			setCurMeetInfo(meets.find((m) => m.id == parseInt(searchParams.get("meet_id")!)) ?? null);
		} 

		if (searchParams.get("swimmer_id") != null && searchParams.get("swimmer_id")!.length > 0) {
			setCurSwimmerInfo(swimmers.find((s) => s.id == parseInt(searchParams.get("swimmer_id")!)) ?? null);
		} 

		if (searchParams.get("relay_id") != null && searchParams.get("relay_id")!.length > 0) {
			let id = parseInt(searchParams.get("relay_id")!);
			const relay = relays.find((r) => r.id == id);
			if (relay) {
				const record1 = times.find((t) => t.id == relay.record_1_id);
				const record2 = times.find((t) => t.id == relay.record_2_id);
				const record3 = times.find((t) => t.id == relay.record_3_id);
				const record4 = times.find((t) => t.id == relay.record_4_id);
				const swimmer_names = [record1, record2, record3, record4].map((rec) => rec?.swimmer_name ?? "Unknown");
				const date = record1?.meet_date ?? Date.now();
				const event = relay.relay_type == "200_mr" ? "200 Medley Relay" : relay.relay_type == "200_fr" ? "200 Freestyle Relay" : "400 Freestyle Relay";
				setCurRelayInfo({id, swimmer_names, date ,event});
			} 
		}

	}, [searchParams, swimmers, meets, relays]);

	useEffect(() => {
		if (curRelayInfo != null && curMeetInfo == null && curSwimmerInfo == null) {
			const relay = relays.find((r) => r.id == curRelayInfo.id);
			if (relay) {
				const record1 = times.find((t) => t.id == relay.record_1_id);
				const record2 = times.find((t) => t.id == relay.record_2_id);
				const record3 = times.find((t) => t.id == relay.record_3_id);
				const record4 = times.find((t) => t.id == relay.record_4_id);
				setCurrentTimes([record1, record2, record3, record4].filter((t): t is Time => t !== undefined));
				setCurrentRelays(relays.filter((r) => r.id == curRelayInfo.id));
			} else {
				setCurrentTimes([]);
				setCurrentRelays([]);
			}
		} else if (curMeetInfo != null && curSwimmerInfo == null) {
			setCurrentTimes(times.filter((t) => t.meet_id == curMeetInfo.id));
			setCurrentRelays(relays.filter((r) => {
				const record1 = times.find((t) => t.id == r.record_1_id);
				const record2 = times.find((t) => t.id == r.record_2_id);
				const record3 = times.find((t) => t.id == r.record_3_id);
				const record4 = times.find((t) => t.id == r.record_4_id);
				return [record1, record2, record3, record4].some((rec) => rec?.meet_id == curMeetInfo.id);
			}));
		} else if (curSwimmerInfo != null && curMeetInfo == null) {
			setCurrentTimes(times.filter((t) => t.swimmer_id == curSwimmerInfo.id));
				setCurrentRelays(relays.filter((r) => {
					const record1 = times.find((t) => t.id == r.record_1_id);
					const record2 = times.find((t) => t.id == r.record_2_id);
					const record3 = times.find((t) => t.id == r.record_3_id);
					const record4 = times.find((t) => t.id == r.record_4_id);
					return [record1, record2, record3, record4].some((rec) => rec?.swimmer_id == curSwimmerInfo.id);
				}));
		} else if (curSwimmerInfo != null && curMeetInfo != null) {
			setCurrentTimes(times.filter((t) => t.swimmer_id == curSwimmerInfo.id && t.meet_id == curMeetInfo.id));
			setCurrentRelays(relays.filter((r) => {
				const record1 = times.find((t) => t.id == r.record_1_id);
				const record2 = times.find((t) => t.id == r.record_2_id);
				const record3 = times.find((t) => t.id == r.record_3_id);
				const record4 = times.find((t) => t.id == r.record_4_id);
				return [record1, record2, record3, record4].some((rec) => rec?.swimmer_id == curSwimmerInfo.id && rec?.meet_id == curMeetInfo.id);
			}));
		} else {
			setCurrentTimes([]);
			setCurrentRelays([]);
		}
	}, [curMeetInfo, curSwimmerInfo, times, relays, curRelayInfo]);

	function renderHeader() {
		if (curRelayInfo != null && curMeetInfo == null && curSwimmerInfo == null) {
			return <h2>Results for Relay: {curRelayInfo.event} | {curRelayInfo.swimmer_names.join(", ")} | {formatDate(curRelayInfo.date)}</h2>
		}
		else if (curMeetInfo != null && curSwimmerInfo == null) {
			return <h2>Results for Meet: {curMeetInfo.name} | {curMeetInfo.location} | {formatDate(curMeetInfo.date)}</h2>
		} else if (curSwimmerInfo != null && curMeetInfo == null) {
			return <h2>Results for Swimmer: {curSwimmerInfo.name} '{curSwimmerInfo.graduating_year % 100}</h2>
		} else if (curSwimmerInfo != null && curMeetInfo != null) {
			return <h2>Results for Swimmer: {curSwimmerInfo.name} '{curSwimmerInfo.graduating_year % 100} at Meet: {curMeetInfo.name} | {curMeetInfo.location} | {formatDate(curMeetInfo.date)}</h2>
		} else {
			return <h2>Invalid search params</h2>
		}
	}
	function getRelayID(record_id: number): number | null {
		const relay = relays.find((r) => r.record_1_id == record_id || r.record_2_id == record_id || r.record_3_id == record_id || r.record_4_id == record_id);
		return relay ? relay.id : null;
	}

	
	if (searchParams.get("meet_id") == null && searchParams.get("swimmer_id") == null && searchParams.get("relay_id") == null) {
		return (
			<div className="app-shell">
				<div className="app-inner">
					<div className="accent-card hero-card">
						<div className="hero-row">
							<div>
								<div className="hero-eyebrow">Nueva Swim & Dive Team</div>
								<h1 className="hero-title">Swimming Records</h1>
								<p className="hero-subtitle">Select a meet to see results.</p>

							</div>
						</div>
					</div>

					<div className="section-block">
						<div className="section-header">
							<div className="section-bar" />
							<h2 className="section-title">Recent Meets</h2>
						</div>
						<ul className="card-list">
						{recentMeets.map((r) => (
							<li
							key={r.id}
							className="accent-card meet-card"
							onClick={() => setSearchParams({ meet_id: r.id.toString() })}
							>
								<div className="meet-row">
									<div className="meet-title">{r.name}</div>
									<div className="meet-meta">{r.location} · {formatDate(r.date)}</div>
								</div>
							</li>
						))}
						</ul>
					</div>
				</div>
			</div>
		);
	} else {
		return (
			<div className="app-shell">
				<div className="app-inner">
					<div className="accent-card hero-card">
						<div className="hero-row">
							<div>
								<div className="hero-eyebrow">Records View</div>
								<h1 className="hero-title">Nueva Swimming Records</h1>
								<div className="hero-subtitle">{renderHeader()}</div>
							</div>
							<button
								type="button"
								onClick={() => setSearchParams({})}
								className="back-button"
							>
								Back to Meets
							</button>
						</div>
					</div>

					<div className="section-block">
						<div className="section-header">
							<div className="section-bar" />
							<h2 className="section-title">Event Results</h2>
						</div>
						<ul className="card-list">
						{currentTimes.map((r) => (
							<li
							key={r.id}
							className="accent-card result-card"
							>
								<div className="result-row">
									<div className="name-line">
										<span
											onClick={() => setSearchParams({ swimmer_id: r.swimmer_id.toString() })}
											className="name-link"
										>
											{r.swimmer_name} '{r.swimmer_year % 100}
										</span>
										<span className="divider-dot">•</span>
										<span className="tag tag-event">{formatEventLabel(r.event)}</span>
										<div className="tag-row">
											{(r.type == "relay") ? (
												<span style={{cursor: "pointer"}} className="tag tag-meta" onClick={() => setSearchParams({relay_id: (getRelayID(r.id) ?? "").toString()})}>{(r.start) == "flat" ? "Relay Split · Flat Start" : "Relay Split · Relay Start"}</span>
											) : (
												<span className="tag tag-meta">Individual</span>
											)}
										</div>
									</div>
									<div className="time">{formatTime(r.time)}</div>
								</div>
								<div className="meta-line">
									{r.meet_name} · {formatDate(r.meet_date)} · {r.meet_location}
								</div>
							</li>
						))}
						{currentRelays.map((r) => {
							const record1 = times.find((t) => t.id == r.record_1_id);
							const record2 = times.find((t) => t.id == r.record_2_id);
							const record3 = times.find((t) => t.id == r.record_3_id);
							const record4 = times.find((t) => t.id == r.record_4_id);
								return (
								<li
								key={r.id}
								className="accent-card result-card"
								>
									<div className="result-row">
										<div className="name-line">
										<span
											onClick={() => {
												if (record1) setSearchParams({ swimmer_id: record1.swimmer_id.toString() });
											}}
											className="name-link"
										>
											{record1?.swimmer_name} '{(record1?.swimmer_year ?? 0) % 100}
										</span>
										<span className="divider-dot">•</span>
										<span
											onClick={() => {
												if (record2) setSearchParams({ swimmer_id: record2.swimmer_id.toString() });
											}}
											className="name-link"
										>
											{record2?.swimmer_name} '{(record2?.swimmer_year ?? 0) % 100}
										</span>
										<span className="divider-dot">•</span>
										<span
											onClick={() => {
												if (record3) setSearchParams({ swimmer_id: record3.swimmer_id.toString() });
											}}
											className="name-link"
										>
											{record3?.swimmer_name} '{(record3?.swimmer_year ?? 0) % 100}
										</span>
										<span className="divider-dot">•</span>
										<span
											onClick={() => {
												if (record4) setSearchParams({ swimmer_id: record4.swimmer_id.toString() });
											}}
											className="name-link"
										>
											{record4?.swimmer_name} '{(record4?.swimmer_year ?? 0) % 100}
										</span>
										<span className="divider-dot">•</span>
										<span className="tag tag-event">
											{(r.relay_type == "200_mr") ? "200 Medley Relay" : (r.relay_type == "200_fr") ? "200 Freestyle Relay" : "400 Freestyle Relay"}
										</span>
										<div className="tag-row">
											<span className="tag tag-meta" style={{cursor: "pointer"}} onClick={ () => setSearchParams({relay_id: r.id.toString()}) }>Relay</span>
										</div>
										</div>
										<div className="time">{formatTime(r.time)}</div>
									</div>
									<div className="meta-line">
										{record1?.meet_name ?? ""}{record1?.meet_date ? ` · ${formatDate(record1.meet_date)}` : ""}{record1?.meet_location ? ` · ${record1.meet_location}` : ""}
									</div>
								</li>
							)
						})}
						</ul>
					</div>
				</div>
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
