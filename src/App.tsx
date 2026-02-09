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

interface ParsedTime {
	id: number,
	swimmer_id: number,
	meet_id: number,
	event: string,
	type: string,
	time: number,
	start: string,
	meet_name: string,
	meet_date: number,
	meet_location: string,
	swimmer_name: string,
	swimmer_year: number,
	current_PR: {change: number | null} | null,
	current_SR: {change: number | null} | null,
	previous_PR: {change: number | null, til: number}[] | null,
	previous_SR: {change: number | null, til: number}[] | null
}


function Home() {
	const [recentMeets, setRecentMeets] = useState<Meet[]>([]);
	const [searchParams, setSearchParams] = useSearchParams();
	const [currentTimes, setCurrentTimes] = useState<ParsedTime[]>([]);
	const [currentRelays, setCurrentRelays] = useState<Relay[]>([]);

	const [curMeetInfo, setCurMeetInfo] = useState<Meet | null>(null);
	const [curSwimmerInfo, setCurSwimmerInfo] = useState<Swimmer | null>(null);
	const [curRelayInfo, setCurRelayInfo] = useState<{id: number, swimmer_names: string[], date: number, event: string} | null>(null);

	const [rawTimes, setRawTimes] = useState<Record<number, Time>>([]);
	const [swimmers, setSwimmers] = useState<Record<number,Swimmer>>([]);
	const [meets, setMeets] = useState<Record<number,Meet>>([]);
	const [relays, setRelays] = useState<Record<number, Relay>>([]);

	const [parsedTimes, setParsedTimes] = useState<Record<number,ParsedTime>>({});



	useEffect(() => {
		ResultAsync.fromPromise(fetch("https://swimming-api.ryanyun2010.workers.dev/swimmers"), (e) => new Errors.NoResponse(`Failed to fetch swimmers: ${JSON.stringify(e)}`))
		.andThen((res) => getResponseJSONAndParse(res, swimmersSchema, (e) => new Errors.MalformedResponse(`Failed to parse swimmers response: ${JSON.stringify(e)}`)))
		.match(
			(data) => {
				setSwimmers(data.reduce((acc: Record<number, Swimmer>, swimmer: Swimmer) => {;
					acc[swimmer.id] = swimmer;
					return acc;
				}, {}));
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
				setRawTimes(data.reduce((acc: Record<number, Time>, time: Time) => {
					acc[time.id] = time;
					return acc;
				}, {}));
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
				setMeets(data.reduce((acc: Record<number, Meet>, meet: Meet) => {
					acc[meet.id] = meet;
					return acc;
				}, {}));
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
				setRelays(data.reduce((acc: Record<number, Relay>, relay: Relay) => {
					acc[relay.id] = relay;
					return acc;
				}, {}));
			},
			(err) => {
				console.error("Failed to load relays:", err);
				alert("Failed to load relays, see console");
			}
		);

	}, []);

	useEffect(() => {
		let parsedTimes = Object.values(rawTimes).reduce((acc: Record<number, ParsedTime>, time: Time) => {
			acc[time.id] = {
				...time,
				current_PR: null,
				current_SR: null,
				previous_PR: null,
				previous_SR: null
			}
			return acc;
		},{});


		let byEvent: Record<string, {date: number, record_id: number, time: number}[]>  = {};
		let byPersonByEvent: Record<string, Record<string,{date: number,record_id: number, time: number}[]>>  = {};
		for (let entry of Object.entries(rawTimes)) {
			const time = entry[1];
			let evt_identifier = time.event + "|" + time.type + (time.start == "relay") ? "|relay": "";

			byEvent[evt_identifier] = [...(byEvent[evt_identifier] ?? []), {date: time.meet_date, record_id: time.id, time: time.time}];
			if (!byPersonByEvent[time.swimmer_name]) {
				byPersonByEvent[time.swimmer_name] = {};
			}
			byPersonByEvent[time.swimmer_name][evt_identifier] = [...(byPersonByEvent[time.swimmer_name][evt_identifier] ?? []), {date: time.meet_date, record_id: time.id, time: time.time}];

		}

		for (let event of Object.entries(byEvent)) {
			const times = [...event[1]].sort((a: {date: number, record_id: number, time: number}, b: {date: number, record_id: number, time:number}) => a.date - b.date);
			let cur_best = null;
			let potential_SRs = [];
			for (let time of times) {
				if (cur_best == null || time.time < cur_best.time) {
					cur_best = time;
					potential_SRs.push(time);
				}
			}
			if (!cur_best) {
				continue;
			}
			if (cur_best.record_id in parsedTimes) {
				if (potential_SRs.length > 1) {
					parsedTimes[cur_best.record_id].current_SR = {change: cur_best.time - potential_SRs[potential_SRs.length - 2].time};
				} else { 
					parsedTimes[cur_best.record_id].current_SR = {change: null};
				}
			}
			for (let i = 0; i < potential_SRs.length -1; i++) {
				let time = potential_SRs[i];
				if (time.record_id in parsedTimes) {
					if (i > 0) {
						parsedTimes[time.record_id].previous_SR = [...(parsedTimes[time.record_id].previous_SR ?? []), {change: time.time - potential_SRs[i-1].time, til: potential_SRs[i+1].date}]; 
					} else {
						parsedTimes[time.record_id].previous_SR = [...(parsedTimes[time.record_id].previous_SR ?? []), {change: null, til: potential_SRs[i+1].date}]; 
					}
				}
			}
		}

		for (let swimmer of Object.entries(byPersonByEvent)) {
			const byEventStore = swimmer[1];
			for (let event of Object.entries(byEventStore)) {
				const times = [...event[1]].sort((a: {date: number, record_id: number, time: number}, b: {date: number, record_id: number, time:number}) => a.date - b.date);
				let cur_best = null;
				let potential_PRs = [];
				for (let time of times) {
					if (cur_best == null || time.time < cur_best.time) {
						cur_best = time;
						potential_PRs.push(time);
					}
				}
				if (!cur_best) {
					continue;
				}
				if (cur_best.record_id in parsedTimes) {
					if (potential_PRs.length > 1) {
						parsedTimes[cur_best.record_id].current_PR = {change: cur_best.time - potential_PRs[potential_PRs.length - 2].time};
					} else { 
						parsedTimes[cur_best.record_id].current_PR = {change: null};
					}
				}
				for (let i = 0; i < potential_PRs.length -1; i++) {
					let time = potential_PRs[i];
					if (time.record_id in parsedTimes) {
						if (i > 0) {
							parsedTimes[time.record_id].previous_PR = [...(parsedTimes[time.record_id].previous_PR ?? []), {change: time.time - potential_PRs[i-1].time, til: potential_PRs[i+1].date}]; 
						} else {
							parsedTimes[time.record_id].previous_PR = [...(parsedTimes[time.record_id].previous_PR ?? []), {change: null, til: potential_PRs[i+1].date}]; 
						}
					}
				}
			}
		}
		setParsedTimes(parsedTimes);
		
	}, [rawTimes, swimmers, meets, relays]);

	useEffect(() => {
		setCurMeetInfo(null);
		setCurSwimmerInfo(null);
		setCurRelayInfo(null);
		if (searchParams.get("meet_id") != null && searchParams.get("meet_id")!.length > 0) {
			setCurMeetInfo(meets[parseInt(searchParams.get("meet_id")!)] ?? null);
		} 

		if (searchParams.get("swimmer_id") != null && searchParams.get("swimmer_id")!.length > 0) {
			setCurSwimmerInfo(swimmers[parseInt(searchParams.get("swimmer_id")!)] ?? null);
		} 

		if (searchParams.get("relay_id") != null && searchParams.get("relay_id")!.length > 0) {

			let id = parseInt(searchParams.get("relay_id")!);
			const relay = relays[id] ?? null;
			if (relay) {
				const record1 = parsedTimes[relay.record_1_id];
				const record2 = parsedTimes[relay.record_2_id];
				const record3 = parsedTimes[relay.record_3_id];
				const record4 = parsedTimes[relay.record_4_id];
				const swimmer_names = [record1, record2, record3, record4].map((rec) => rec?.swimmer_name ?? "Unknown");
				const date = record1?.meet_date ?? Date.now();
				const event = relay.relay_type == "200_mr" ? "200 Medley Relay" : relay.relay_type == "200_fr" ? "200 Freestyle Relay" : "400 Freestyle Relay";
				setCurRelayInfo({id, swimmer_names, date ,event});
			} 
		}

	}, [searchParams, swimmers, meets, relays]);

	useEffect(() => {
		if (curRelayInfo != null && curMeetInfo == null && curSwimmerInfo == null) {
			const relay = relays[curRelayInfo.id] ?? null;
			if (relay) {
				const record1 = parsedTimes[relay.record_1_id];
				const record2 = parsedTimes[relay.record_2_id];
				const record3 = parsedTimes[relay.record_3_id];
				const record4 = parsedTimes[relay.record_4_id];
				setCurrentTimes([record1, record2, record3, record4].filter((t): t is ParsedTime => t !== undefined));
				setCurrentRelays(relays[curRelayInfo.id] ? [relays[curRelayInfo.id]] : []);
			} else {
				setCurrentTimes([]);
				setCurrentRelays([]);
			}
		} else if (curMeetInfo != null && curSwimmerInfo == null) {
			setCurrentTimes(Object.values(parsedTimes).filter((t) => t.meet_id == curMeetInfo.id));
			setCurrentRelays(Object.values(relays).filter((r) => {
				const record1 = parsedTimes[r.record_1_id];
				const record2 = parsedTimes[r.record_2_id];
				const record3 = parsedTimes[r.record_3_id];
				const record4 = parsedTimes[r.record_4_id];
				return [record1, record2, record3, record4].some((rec) => rec?.meet_id == curMeetInfo.id);
			}));
		} else if (curSwimmerInfo != null && curMeetInfo == null) {
			setCurrentTimes(Object.values(parsedTimes).filter((t) => t.swimmer_id == curSwimmerInfo.id));
			setCurrentRelays(Object.values(relays).filter((r) => {
				const record1 = parsedTimes[r.record_1_id];
				const record2 = parsedTimes[r.record_2_id];
				const record3 = parsedTimes[r.record_3_id];
				const record4 = parsedTimes[r.record_4_id];
				return [record1, record2, record3, record4].some((rec) => rec?.swimmer_id == curSwimmerInfo.id);
			}));
		} else if (curSwimmerInfo != null && curMeetInfo != null) {
			setCurrentTimes(Object.values(parsedTimes).filter((t) => t.swimmer_id == curSwimmerInfo.id && t.meet_id == curMeetInfo.id));
			setCurrentRelays(Object.values(relays).filter((r) => {
				const record1 = parsedTimes[r.record_1_id];
				const record2 = parsedTimes[r.record_2_id];
				const record3 = parsedTimes[r.record_3_id];
				const record4 = parsedTimes[r.record_4_id];
				return [record1, record2, record3, record4].some((rec) => rec?.swimmer_id == curSwimmerInfo.id && rec?.meet_id == curMeetInfo.id);
			}));
		} else {
			setCurrentTimes([]);
			setCurrentRelays([]);
		}
	}, [curMeetInfo, curSwimmerInfo, parsedTimes, relays, curRelayInfo]);


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
		const relay = Object.values(relays).find((r) => r.record_1_id == record_id || r.record_2_id == record_id || r.record_3_id == record_id || r.record_4_id == record_id);
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
							const record1 = parsedTimes[r.record_1_id];
							const record2 = parsedTimes[r.record_2_id];
							const record3 = parsedTimes[r.record_3_id];
							const record4 = parsedTimes[r.record_4_id];
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
