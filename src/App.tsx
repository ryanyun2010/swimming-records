import { useEffect, useState, useMemo } from "react";
import "./App.css";
import { BrowserRouter as Router, Routes, Route, useSearchParams} from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
// import AdminPage from "./pages/AdminPage"; 
import { formatDate, zodParseWith, getResponseJSONAndParse ,formatTime} from "./lib/utils";
import { recordProgsSchema, RecordProg, meetsSchema, Meet, relaysSchema, Relay, relayLegsSchema, RelayLeg, swimmersSchema, Swimmer, resultsSchema, Result, eventsSchema, SEvent} from "./lib/defs";
import { z, ZodError } from "zod";
import * as Errors from "./lib/errors";
import { ResultAsync } from "neverthrow";

interface ParsedTime {
	swimmer_id: number,
	meet_id: number,
	event_name: string,
	result_id: number | null,
	relay_leg_id: number | null,
	type: string,
	time: number,
	start: string,
	meet_name: string,
	meet_date: string,
	meet_location: string,
	swimmer_first_name: string,
	swimmer_last_name: string,
	swimmer_gender: string,
	swimmer_year: number,
	current_PR: {change: number | null} | null,
	current_SR: {change: number | null} | null,
	previous_PR: {change: number | null, til: string} | null,
	previous_SR: {change: number | null, til: string} | null
}


function Home() {
	const [searchParams, setSearchParams] = useSearchParams();

	const [currentTimes, setCurrentTimes] = useState<ParsedTime[]>([]);
	const [currentRelays, setCurrentRelays] = useState<Relay[]>([]);

	const [curMeetInfo, setCurMeetInfo] = useState<Meet | null>(null);
	const [curSwimmerInfo, setCurSwimmerInfo] = useState<Swimmer | null>(null);
	const [curRelayInfo, setCurRelayInfo] = useState<{id: number, swimmer_names: string[], date: string, event: string} | null>(null);

	const [results, setResults] = useState<Record<number, Result>>({});
	const [swimmers, setSwimmers] = useState<Record<number, Swimmer>>({});
	const [meets, setMeets] = useState<Record<number, Meet>>({});
	const [relays, setRelays] = useState<Record<number, Relay>>({});
	const [relayLegs, setRelayLegs] = useState<Record<number, RelayLeg>>({});
	const [events, setEvents] = useState<Record<number, SEvent>>({});
	const [recordProgs, setRecordProgs] = useState<RecordProg[]>([]);
	const relayLegIDsByRelayID = useMemo<Record<number, number[]>>(
		() => {
			const mapping: Record<number, number[]> = {};
			for (let relayLeg of Object.values(relayLegs)) {
				if (!mapping[relayLeg.relay_id]) {
					mapping[relayLeg.relay_id] = [];
				}
				mapping[relayLeg.relay_id].push(relayLeg.id);
			}
			return mapping;
		}
	, [relayLegs]);

	const parsedTimes = useMemo<ParsedTime[]>(() => {
		let times: ParsedTime[] = [];
		for (let result of Object.values(results)) {
			if (!(result.id in swimmers) || !(result.meet_id in meets)) {
				console.warn(`Skipping result ${result.id} due to missing swimmer or meet info for swimmer_id ${result.swimmer_id} or meet_id ${result.meet_id}`);
				continue;
			}
			if (!(result.event_id in events)){
				console.warn(`Skipping result ${result.id} due to missing event info for event_id ${result.event_id}`);
				continue;
			}
			const swimmer = swimmers[result.swimmer_id];
			const meet = meets[result.meet_id];
			const event = events[result.event_id];
			
			const parsedTime: ParsedTime = {
				swimmer_id: result.swimmer_id,
				meet_id: result.meet_id,
				event_name: event.name,
				result_id: result.id,
				relay_leg_id: null,
				type: "individual",
				time: result.time_ms,
				start: "flat",
				meet_name: meet.name,
				meet_date: meet.date,
				meet_location: meet.location,
				swimmer_first_name: swimmer.first_name,
				swimmer_last_name: swimmer.last_name,
				swimmer_gender: swimmer.gender,
				swimmer_year: swimmer.graduating,
				current_PR: null,
				current_SR: null,
				previous_PR: null,
				previous_SR: null
			};
			times.push(parsedTime);
		}
		for (let relayLeg of Object.values(relayLegs)) {
			if (!(relayLeg.swimmer_id in swimmers) || !(relays[relayLeg.relay_id]) || !(relays[relayLeg.relay_id].meet_id in meets)) {
				console.warn(`Skipping relay leg ${relayLeg.id} due to missing swimmer, relay, or meet info for swimmer_id ${relayLeg.swimmer_id}, relay_id ${relayLeg.relay_id}, or meet_id ${relays[relayLeg.relay_id]?.meet_id}`);
				continue;
			}
			const swimmer = swimmers[relayLeg.swimmer_id];
			const relay = relays[relayLeg.relay_id];
			const meet = meets[relay.meet_id];
			const event = events[relay.event_id];
			let leg_name = "";
			if (event.name == "200 Medley Relay" || event.name == "200 Freestyle Relay" || event.name == "400 Freestyle Relay") {
				if (event.name == "200 Medley Relay") {
					if (relayLeg.leg_order == 1) leg_name = "50 Backstroke";
					else if (relayLeg.leg_order == 2) leg_name = "50 Breaststroke";
					else if (relayLeg.leg_order == 3) leg_name = "50 Butterfly";
					else if (relayLeg.leg_order == 4) leg_name = "50 Freestyle";
				} else if (event.name == "200 Freestyle Relay") {
					leg_name = `50 Freestyle`;
				}
				else if (event.name == "400 Freestyle Relay") {
					leg_name = `100 Freestyle`;
				}
			}
			const parsedTime: ParsedTime = {
				swimmer_id: relayLeg.swimmer_id,
				meet_id: relay.meet_id,
				event_name: leg_name,
				result_id: null,	
				relay_leg_id: relayLeg.id,
				type: "relay",
				time: relayLeg.split_time,
				start: relayLeg.leg_order == 1 ? "flat" : "relay",
				meet_name: meet.name,
				meet_date: meet.date,
				meet_location: meet.location,
				swimmer_first_name: swimmer.first_name,
				swimmer_last_name: swimmer.last_name,
				swimmer_gender: swimmer.gender,
				swimmer_year: swimmer.graduating,
				current_PR: null,
				current_SR: null,
				previous_PR: null,
				previous_SR: null
			}
			times.push(parsedTime);
		}
		let last_bests: Record<string, number> = {};
		let last_SR_bests: Record<number, number> = {};
		for (let recordProg of recordProgs) {
			if (recordProg.type == "relay") {
				continue;
			}
			if (!(recordProg.swimmer_id in swimmers) || !(recordProg.meet_id in meets) || !(recordProg.event_id in events)) {
				console.warn(`Skipping record prog ${recordProg.id} due to missing swimmer, meet, or event info for swimmer_id ${recordProg.swimmer_id}, meet_id ${recordProg.meet_id}, or event_id ${recordProg.event_id}`);
				continue;
			}
			let timepid = null;
			for (let i = 0; i < times.length; i++ ) {
				const time = times[i];
				if (time.meet_id == recordProg.meet_id && time.swimmer_id == recordProg.swimmer_id) {
					if (recordProg.leg_id && recordProg.leg_id == time.relay_leg_id) {
						timepid = i;	
					} 
					else if (recordProg.result_id && recordProg.result_id == time.result_id) {
						timepid = i;
					}
				}
			}
			if (!timepid) {
				console.warn(`Could not find time for record prog ${recordProg.id} with swimmer_id ${recordProg.swimmer_id}, meet_id ${recordProg.meet_id}, event_id ${recordProg.event_id}`);
				continue;
			}
			let timep = times[timepid];

			let last_best = last_bests[`${recordProg.swimmer_id}-${recordProg.event_id}-${recordProg.leg_id ?? 'indiv'}`];
			if (last_best !== undefined) {
				let last_best_cur = times[last_best].current_PR ?? {change: null};
				times[last_best].previous_PR = {change: last_best_cur.change, til: timep.meet_date};
				times[last_best].current_PR = null;
				timep.current_PR = {change: timep.time - times[last_best].time};
			} else {
				timep.current_PR = {change: null};
			}
			last_bests[`${recordProg.swimmer_id}-${recordProg.event_id}-${recordProg.leg_id} ?? 'indiv'`] = timepid;

			let last_SR_best = last_SR_bests[recordProg.event_id];
			if (last_SR_best !== undefined) {
				let last_SR_best_cur = times[last_SR_best].current_SR ?? {change: null};
				times[last_SR_best].previous_SR = {change: last_SR_best_cur.change, til: timep.meet_date};
				times[last_SR_best].current_SR = null;
				timep.current_SR = {change: timep.time - times[last_SR_best].time};
			} else {
				timep.current_SR = {change: null};
			}
			last_SR_bests[recordProg.event_id] = timepid;
		}
		return times;
	}, [results, swimmers, meets, relays, relayLegs, relayLegIDsByRelayID, events]);

	
	useEffect(() => {
		ResultAsync.fromPromise(fetch("https://swimming-api.ryanyun2010.workers.dev/results"), (e) => new Errors.NoResponse(`Failed to fetch results: ${JSON.stringify(e)}`))
		.andThen((res) => getResponseJSONAndParse(res, resultsSchema, (e) => new Errors.MalformedResponse(`Failed to parse results response: ${JSON.stringify(e)}`)))
		.match(
			(data) => {
				setSwimmers(data.reduce((acc: Record<number, Result>, result: Result) => {;
					acc[result.id] = result;
					return acc;
				}, {}));
			},
			(err) => {
				console.error("Failed to load results:", err);
				alert("Failed to load results, see console");
			}
		)});

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
		)});

	useEffect(() => {
		ResultAsync.fromPromise(fetch("https://swimming-api.ryanyun2010.workers.dev/meets"), (e) => new Errors.NoResponse(`Failed to fetch meets: ${JSON.stringify(e)}`))
		.andThen((res) => getResponseJSONAndParse(res, meetsSchema, (e) => new Errors.MalformedResponse(`Failed to parse meets response: ${JSON.stringify(e)}`)))
		.match(
			(data) => {
				setSwimmers(data.reduce((acc: Record<number, Meet>, meet: Meet) => {;
					acc[meet.id] = meet;
					return acc;
				}, {}));
			},
			(err) => {
				console.error("Failed to load meets:", err);
				alert("Failed to load meets, see console");
			}
		)});

	useEffect(() => {
		ResultAsync.fromPromise(fetch("https://swimming-api.ryanyun2010.workers.dev/relays"), (e) => new Errors.NoResponse(`Failed to fetch relays: ${JSON.stringify(e)}`))
		.andThen((res) => getResponseJSONAndParse(res, relaysSchema, (e) => new Errors.MalformedResponse(`Failed to parse relays response: ${JSON.stringify(e)}`)))
		.match(
			(data) => {
				setSwimmers(data.reduce((acc: Record<number, Relay>, relay: Relay) => {;
					acc[relay.id] = relay;
					return acc;
				}, {}));
			},
			(err) => {
				console.error("Failed to load relay:", err);
				alert("Failed to load relay, see console");
			}
		)});

	useEffect(() => {
		ResultAsync.fromPromise(fetch("https://swimming-api.ryanyun2010.workers.dev/relay_legs"), (e) => new Errors.NoResponse(`Failed to fetch relays legs: ${JSON.stringify(e)}`))
		.andThen((res) => getResponseJSONAndParse(res, relayLegsSchema, (e) => new Errors.MalformedResponse(`Failed to parse relay legs response: ${JSON.stringify(e)}`)))
		.match(
			(data) => {
				setSwimmers(data.reduce((acc: Record<number, RelayLeg>, relayLeg: RelayLeg) => {;
					acc[relayLeg.id] = relayLeg;
					return acc;
				}, {}));
			},
			(err) => {
				console.error("Failed to load relay leg:", err);
				alert("Failed to load relay leg, see console");
			}
		)});

	useEffect(() => {
		ResultAsync.fromPromise(fetch("https://swimming-api.ryanyun2010.workers.dev/events"), (e) => new Errors.NoResponse(`Failed to fetch events: ${JSON.stringify(e)}`))
		.andThen((res) => getResponseJSONAndParse(res, eventsSchema, (e) => new Errors.MalformedResponse(`Failed to parse events response: ${JSON.stringify(e)}`)))
		.match(
			(data) => {
				setSwimmers(data.reduce((acc: Record<number, SEvent>, event: SEvent) => {
					acc[event.id] = event;
					return acc;
				}, {}));
			},
			(err) => {
				console.error("Failed to load event:", err);
				alert("Failed to load event, see console");
			}
		)});
	
	
	useEffect(() => {
		ResultAsync.fromPromise(fetch("https://swimming-api.ryanyun2010.workers.dev/records"), (e) => new Errors.NoResponse(`Failed to fetch record progressions: ${JSON.stringify(e)}`))
		.andThen((res) => getResponseJSONAndParse(res, recordProgsSchema, (e) => new Errors.MalformedResponse(`Failed to parse record progressions response: ${JSON.stringify(e)}`)))
		.match(
			(data) => {
				setSwimmers(data.reduce((acc: Record<number, RecordProg>, record: RecordProg) => {;
					acc[record.id] = record;
					return acc;
				}, {}));
			},
			(err) => {
				console.error("Failed to load record progression:", err);
				alert("Failed to load record progression, see console");
			}
		)});


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
				let relay_leg_ids = relayLegIDsByRelayID[relay.id] ?? [];
				if (relay_leg_ids.length != 4) { console.warn(`Relay ${relay.id} has ${relay_leg_ids.length} legs, expected 4`); }
				else {
					const leg1 = relayLegs[relay_leg_ids[0]];
					const leg2 = relayLegs[relay_leg_ids[1]];
					const leg3 = relayLegs[relay_leg_ids[2]];
					const leg4 = relayLegs[relay_leg_ids[3]];
					const swimmer_names = [leg1, leg2, leg3, leg4].map((leg) => {
						const swimmer = swimmers[leg.swimmer_id];
						return swimmer ? `${swimmer.first_name} ${swimmer.last_name}` : "Unknown";
					});
					if (!(relay.meet_id in meets)) {
						console.warn(`Missing meet info for relay ${relay.id} with meet_id ${relay.meet_id}`);
					} else {
						const event = events[relay.event_id]?.name ?? "Unknown Event";
						setCurRelayInfo({id, swimmer_names, date: meets[relay.meet_id].date ,event});
					}
				}
			} 
		}

	}, [searchParams, swimmers, meets, relays, relayLegs, relayLegIDsByRelayID, events ]);

	useEffect(() => {
		if (curRelayInfo != null && curMeetInfo == null && curSwimmerInfo == null) {
			const relay = relays[curRelayInfo.id] ?? null;
			let relay_leg_ids = relay ? relayLegIDsByRelayID[relay.id] ?? [] : [];
			if (relay_leg_ids.length != 4) {
				console.warn(`Relay ${relay?.id} has ${relay_leg_ids.length} legs, expected 4`);
				setCurrentTimes([]);
				setCurrentRelays([]);
				return;
			}
			if (relay) {
				const record1 = parsedTimes.find((t: ParsedTime) => t.relay_leg_id === relay_leg_ids[0]) ?? null;
				const record2 = parsedTimes.find((t: ParsedTime) => t.relay_leg_id === relay_leg_ids[1]) ?? null;
				const record3 = parsedTimes.find((t: ParsedTime) => t.relay_leg_id === relay_leg_ids[2]) ?? null;
				const record4 = parsedTimes.find((t: ParsedTime) => t.relay_leg_id === relay_leg_ids[3]) ?? null;
				setCurrentTimes([record1, record2, record3, record4].filter((t): t is ParsedTime => t !== undefined));
				setCurrentRelays(relays[curRelayInfo.id] ? [relays[curRelayInfo.id]] : []);
			} else {
				setCurrentTimes([]);
				setCurrentRelays([]);
			}
		} else if (curMeetInfo != null && curSwimmerInfo == null) {
			setCurrentTimes(Object.values(parsedTimes).filter((t) => t.meet_id == curMeetInfo.id));
			setCurrentRelays(Object.values(relays).filter((r) => {
				let relay_leg_ids = r ? relayLegIDsByRelayID[r.id] ?? [] : [];
				const record1 = parsedTimes.find((t: ParsedTime) => t.relay_leg_id === relay_leg_ids[0]) ?? null;
				const record2 = parsedTimes.find((t: ParsedTime) => t.relay_leg_id === relay_leg_ids[1]) ?? null;
				const record3 = parsedTimes.find((t: ParsedTime) => t.relay_leg_id === relay_leg_ids[2]) ?? null;
				const record4 = parsedTimes.find((t: ParsedTime) => t.relay_leg_id === relay_leg_ids[3]) ?? null;
				return [record1, record2, record3, record4].some((rec) => rec?.meet_id == curMeetInfo.id);
			}));
		} else if (curSwimmerInfo != null && curMeetInfo == null) {
			setCurrentTimes(Object.values(parsedTimes).filter((t) => t.swimmer_id == curSwimmerInfo.id));
			setCurrentRelays(Object.values(relays).filter((r) => {
				let relay_leg_ids = r ? relayLegIDsByRelayID[r.id] ?? [] : [];
				const record1 = parsedTimes.find((t: ParsedTime) => t.relay_leg_id === relay_leg_ids[0]) ?? null;
				const record2 = parsedTimes.find((t: ParsedTime) => t.relay_leg_id === relay_leg_ids[1]) ?? null;
				const record3 = parsedTimes.find((t: ParsedTime) => t.relay_leg_id === relay_leg_ids[2]) ?? null;
				const record4 = parsedTimes.find((t: ParsedTime) => t.relay_leg_id === relay_leg_ids[3]) ?? null;
				return [record1, record2, record3, record4].some((rec) => rec?.swimmer_id == curSwimmerInfo.id);
			}));
		} else if (curSwimmerInfo != null && curMeetInfo != null) {
			setCurrentTimes(Object.values(parsedTimes).filter((t) => t.swimmer_id == curSwimmerInfo.id && t.meet_id == curMeetInfo.id));
			setCurrentRelays(Object.values(relays).filter((r) => {
				let relay_leg_ids = r ? relayLegIDsByRelayID[r.id] ?? [] : [];
				const record1 = parsedTimes.find((t: ParsedTime) => t.relay_leg_id === relay_leg_ids[0]) ?? null;
				const record2 = parsedTimes.find((t: ParsedTime) => t.relay_leg_id === relay_leg_ids[1]) ?? null;
				const record3 = parsedTimes.find((t: ParsedTime) => t.relay_leg_id === relay_leg_ids[2]) ?? null;
				const record4 = parsedTimes.find((t: ParsedTime) => t.relay_leg_id === relay_leg_ids[3]) ?? null;
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
			return <h2>Results for Swimmer: {curSwimmerInfo.first_name} {curSwimmerInfo.last_name} '{curSwimmerInfo.graduating % 100}</h2>
		} else if (curSwimmerInfo != null && curMeetInfo != null) {
			return <h2>Results for Swimmer: {curSwimmerInfo.first_name} {curSwimmerInfo.last_name} '{curSwimmerInfo.graduating % 100} at Meet: {curMeetInfo.name} | {curMeetInfo.location} | {formatDate(curMeetInfo.date)}</h2>
		} else {
			return <h2>Invalid search params</h2>
		}
	}
	function formatChange(change: number | null | undefined): string {
		if (change === null || change === undefined) return "";
		const sign = change < 0 ? "-" : "+";
		const seconds = Math.abs(change).toFixed(2);
		return `${sign}${seconds}s`;
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
						{Object.values(meets).map((r) => (
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
						{currentTimes.map((r) => {
							const isSchoolRecord = r.current_SR != null;
							const isSchoolRecordFirst = r.current_SR?.change === null;
							const isPersonalRecord = r.current_PR != null && r.current_PR.change !== null;
							const isFirstTimeSwim = r.current_PR?.change === null;
							const srDelta = formatChange(r.current_SR?.change);
							const prDelta = formatChange(r.current_PR?.change);
							const previousPR = r.previous_PR ?? null;
							const previousSR = r.previous_SR ?? null;
							return (
								<li
								className="accent-card result-card"
								>
									<div className="result-row">
										<div className="name-line">
											<span
												onClick={() => setSearchParams({ swimmer_id: r.swimmer_id.toString() })}
												className="name-link"
											>
												{r.swimmer_first_name} {r.swimmer_last_name} '{r.swimmer_year % 100}
											</span>
											<span className="divider-dot">•</span>
											<span className="tag tag-event">{r.event_name}</span>
											<div className="tag-row">
												{(r.type == "relay") ? (
													<span style={{cursor: "pointer"}} className="tag tag-meta" onClick={() => setSearchParams({relay_id: (r.relay_leg_id ? relayLegs[r.relay_leg_id].relay_id : null) ?? ""}.toString())}>{(r.start) == "flat" ? "Relay Split · Flat Start" : "Relay Split · Relay Start"}</span>
												) : (
													<span className="tag tag-meta">Individual</span>
												)}
												{isSchoolRecord ? (
													isSchoolRecordFirst ? <span className="tag tag-sr-first">SCHOOL RECORD: FIRST TIME</span> : <span className="tag tag-sr">SCHOOL RECORD {srDelta}</span>
												) : null}
												{isPersonalRecord ? <span className="tag tag-pr">PR {prDelta}</span> : null}
												{isFirstTimeSwim ? <span className="tag tag-fts">FTS</span> : null}
												{
													previousPR != null ?
													(previousPR.change === null
														? <span key={`prev-pr}`} className="tag tag-fts">FTS</span>
														: <span key={`prev-pr`} className="tag tag-pr-prev">PREVIOUS PR {formatChange(previousPR.change)}</span>) : null
												}
												{ previousSR != null ?
													(previousSR.change === null
														? <span key={`prev-sr`} className="tag tag-sr-first">PREVIOUS SCHOOL RECORD: FIRST TIME</span>
														: <span key={`prev-sr`} className="tag tag-sr-prev">PREVIOUS SCHOOL RECORD {formatChange(previousSR.change)}
														</span>) : null
												}
											</div>
										</div>
										<div className="time">{formatTime(r.time)}</div>
									</div>
									<div className="meta-line">
										{r.meet_name} · {formatDate(r.meet_date)} · {r.meet_location}
									</div>
								</li>
							);
						})}
						{currentRelays.map((r) => {
							const relay_leg_ids = relayLegIDsByRelayID[r.id] ?? [];
							const record1 = relayLegs[relay_leg_ids[0]];
							const record2 = relayLegs[relay_leg_ids[0]];
							const record3 = relayLegs[relay_leg_ids[0]];
							const record4 = relayLegs[relay_leg_ids[0]];

							const swimmer1 = record1 ? swimmers[record1.swimmer_id] : null;
							const swimmer2 = record2 ? swimmers[record2.swimmer_id] : null;
							const swimmer3 = record3 ? swimmers[record3.swimmer_id] : null;
							const swimmer4 = record4 ? swimmers[record4.swimmer_id] : null;

							const event = events[r.event_id];
							const meet = meets[r.meet_id];

							if (!record1 || !record2 || !record3 || !record4 || !swimmer1 || !swimmer2 || !swimmer3 || !swimmer4) {
								console.warn(`Missing record or swimmer info for relay ${r.id}, skipping render`);
								return null;
							}
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
											{swimmer1.first_name} {swimmer1.last_name} '{(swimmer1.graduating ?? 0) % 100}
										</span>
										<span className="divider-dot">•</span>
										<span
											onClick={() => {
												if (record2) setSearchParams({ swimmer_id: record2.swimmer_id.toString() });
											}}
											className="name-link"
										>
											{swimmer2.first_name} {swimmer2.last_name} '{(swimmer2.graduating ?? 0) % 100}
										</span>
										<span className="divider-dot">•</span>
										<span
											onClick={() => {
												if (record3) setSearchParams({ swimmer_id: record3.swimmer_id.toString() });
											}}
											className="name-link"
										>
											{swimmer3.first_name} {swimmer3.last_name} '{(swimmer3.graduating ?? 0) % 100}
										</span>
										<span className="divider-dot">•</span>
										<span
											onClick={() => {
												if (record4) setSearchParams({ swimmer_id: record4.swimmer_id.toString() });
											}}
											className="name-link"
										>
											{swimmer4.first_name} {swimmer4.last_name} '{(swimmer4.graduating ?? 0) % 100}
										</span>
										<span className="divider-dot">•</span>
										<span className="tag tag-event">
										{event.name}
										</span>
										<div className="tag-row">
											<span className="tag tag-meta" style={{cursor: "pointer"}} onClick={ () => setSearchParams({relay_id: r.id.toString()}) }>Relay</span>
										</div>
										</div>
										<div className="time">{formatTime(r.time_ms)}</div>
									</div>
									<div className="meta-line">
										{meet?.name ?? ""}{meet?.date ? ` · ${formatDate(meet.date)}` : ""}{meet?.location ? ` · ${meet.location}` : ""}
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
					{/* <Route path="/admin" element={<AdminPage />} /> */}
				</Routes>
			</Router>
		</GoogleOAuthProvider>
	);
}

export default App;
