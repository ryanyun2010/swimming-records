import { useEffect, useState, useMemo, JSX } from "react";
import "./App.css";
import { BrowserRouter as Router, Routes, Route, useSearchParams} from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
// import AdminPage from "./pages/AdminPage"; 
import { formatDate, getResponseJSONAndParse, formatTime, fetchAndParse, reducerByID} from "./lib/utils";
import { recordProgsSchema, RecordProg, meetsSchema, Meet, relaysSchema, Relay, relayLegsSchema, RelayLeg, swimmersSchema, Swimmer, resultsSchema, Result, eventsSchema, SEvent} from "./lib/defs";
import * as Errors from "./lib/errors";
import { ResultAsync, errAsync, okAsync, Result as Res, ok , err} from "neverthrow";

interface ParsedTime {
	swimmer_id: number,
	meet_id: number,
	event_name: string,
	result_id: number | null,
	relay_leg_id: number | null,
	type: string, // "individual" or "relay_leg"
	time: number,
	start: string, // "flat" or "relay"
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

	function parseTimes(): Res<ParsedTime[], Errors.ErrorRes> {
		let times: ParsedTime[] = [];
		for (let result of Object.values(results)) {
			if (!(result.id in swimmers) || !(result.meet_id in meets)) {
				return err(new Errors.NotFound(`Missing swimmer or meet info for result ${result.id}`));
			}
			if (!(result.event_id in events)){
				return err(new Errors.NotFound(`Missing event info for result ${result.id}`));
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
				return err(new Errors.NotFound(`Missing swimmer, relay, or meet info for relay leg ${relayLeg.id}`));
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
		for (let recordProg of recordProgs) { // note record progs are sorted in chronological order by meet date asc server side, so we can just keep track of the last best time as we iterate
			if (recordProg.type == "relay") {
				continue;
			}
			if (!(recordProg.swimmer_id in swimmers) || !(recordProg.meet_id in meets) || !(recordProg.event_id in events)) {
				return err(new Errors.NotFound(`Missing swimmer, meet, or event info for record prog ${recordProg.id}`));
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
			if (timepid == null) {
				return err(new Errors.NotFound(`Could not find time for record prog ${recordProg.id} with swimmer_id ${recordProg.swimmer_id}, meet_id ${recordProg.meet_id}, event_id ${recordProg.event_id}`));
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
		return ok(times);
	}

	const parsedTimes = useMemo<ParsedTime[]>(() => parseTimes().match(
		(times) => times,
		(err) => {
			console.error("Failed to parse times:", err);
			return [];
		}
	), [results, swimmers, meets, relays, relayLegs, events, recordProgs]);

	const PTIndicesAndRLIDsByRelayID = useMemo<Record<number, number[][]>>( // first array in value is indices of parsedTimes that correspond to relay legs of the relay, second array is the corresponding relay leg ids, both arrays are in same order
		() => {
			const mapping: Record<number, number[][]> = {};
			for (let i = 0; i < parsedTimes.length; i++) {
				if (parsedTimes[i].type !== "relay_leg") continue;
				const time = parsedTimes[i];
				const relayLeg = relayLegs[time.relay_leg_id!];
				const relayID = relayLeg.relay_id;
				if (!mapping[relayID]) {
					mapping[relayID] = [[],[]];
				}
				mapping[relayID][0].push(i);
				mapping[relayID][1].push(time.relay_leg_id!);
			}
			return mapping;
		}
	, [parsedTimes, relayLegs]);

	function getParsedTimesForRelay(relayID: number): Res<ParsedTime[], Errors.NotFound> {
		const indicesAndIDs = PTIndicesAndRLIDsByRelayID[relayID];
		if (!indicesAndIDs) return err(new Errors.NotFound(`No parsed times found for relay ID ${relayID}`));
		const indices = indicesAndIDs[0];
		return ok(indices.map(i => parsedTimes[i]));
	}

	function getRelayLegsForRelay(relayID: number): Res<RelayLeg[], Errors.NotFound> {
		const indicesAndIDs = PTIndicesAndRLIDsByRelayID[relayID];
		if (!indicesAndIDs) return err(new Errors.NotFound(`No relay legs found for relay ID ${relayID}`));
		const relayLegIDs = indicesAndIDs[1];
		return ok(relayLegIDs.map(id => relayLegs[id]));
	}

	useEffect(() => {
		fetchAndParse("https://swimming-api.ryanyun2010.workers.dev/records", recordProgsSchema)
		.match(
			(data) => setRecordProgs(data),
			(err) => console.error("Failed to load record progressions:", err)
		)

		fetchAndParse("https://swimming-api.ryanyun2010.workers.dev/swimmers", swimmersSchema)
		.match(
			(data) => setSwimmers(reducerByID(data)),
			(err) => console.error("Failed to load swimmers:", err)
		)

		fetchAndParse("https://swimming-api.ryanyun2010.workers.dev/meets", meetsSchema)
		.match(
			(data) => setMeets(reducerByID(data)),
			(err) => console.error("Failed to load meets:", err)
		)

		fetchAndParse("https://swimming-api.ryanyun2010.workers.dev/relays", relaysSchema)
		.match(
			(data) => setRelays(reducerByID(data)),
			(err) => console.error("Failed to load relay:", err)
		)

		fetchAndParse("https://swimming-api.ryanyun2010.workers.dev/relay_legs", relayLegsSchema)
		.match(
			(data) => setRelayLegs(reducerByID(data)),
			(err) => console.error("Failed to load relay legs:", err)
		)

		fetchAndParse("https://swimming-api.ryanyun2010.workers.dev/events", eventsSchema)
		.match(
			(data) => setEvents(reducerByID(data)),
			(err) => console.error("Failed to load events:", err)
		)

		fetchAndParse("https://swimming-api.ryanyun2010.workers.dev/results", resultsSchema)
		.match(
			(data) => setResults(reducerByID(data)),
			(err) => console.error("Failed to load results:", err)
		)
	}, []);	

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
				getRelayLegsForRelay(relay.id)
				.andThen(
					(relayLegs: RelayLeg[]) => {
						if (relayLegs.length != 4) {return err(new Errors.NotFound(`Expected 4 relay legs for relay ${relay.id}, found ${relayLegs.length}`))}
						return ok(relayLegs.map(leg => swimmers[leg.swimmer_id]));
					})
				.map((swimmers: Swimmer[]) => swimmers.map(swimmer => `${swimmer.first_name} ${swimmer.last_name}`))
				.andThen((swimmer_names: string[]) => {
					const event = events[relay.event_id];
					if (!event) return err(new Errors.NotFound(`No event found with ID ${relay.event_id} `));
					if (!meets[relay.meet_id]) return err(new Errors.NotFound(`No meet found with ID ${relay.meet_id}`));
					setCurRelayInfo({id, swimmer_names, date: meets[relay.meet_id].date ,event: event.name});
					return ok(null)})
				.match(
					() => {},
					(err) => console.error(`Failed to load relay info for relay ID ${id}:`, err)
				);

			}
		}

	}, [searchParams, swimmers, meets, relays, relayLegs, PTIndicesAndRLIDsByRelayID, events ]);

	useEffect(() => {
		let timesToShow: ParsedTime[] = parsedTimes;
		let relaysToShow: Relay[] = Object.values(relays);

		if (curRelayInfo != null) {
			const relay = relays[curRelayInfo.id] ?? null;
			if (relay) {
				getParsedTimesForRelay(relay.id)
				.match(
					(data) => {timesToShow = data},
					(err) => {
						console.error(`Failed to get parsed times for relay ID ${relay.id}:`, err);
						timesToShow = [];
					}
				);
				relaysToShow = [relay];
			} else {
				console.warn(`No relay found with ID ${curRelayInfo.id}`);
				timesToShow = [];
			}
		}

		if (curMeetInfo != null) {
			timesToShow = timesToShow.filter((t) => t.meet_id == curMeetInfo.id);
			relaysToShow = relaysToShow.filter((r) => r.meet_id == curMeetInfo.id);
		}

		if (curSwimmerInfo != null) {
			timesToShow = timesToShow.filter((t) => t.swimmer_id == curSwimmerInfo.id);
			relaysToShow = relaysToShow.filter((r) =>getRelayLegsForRelay(r.id).match(
				(legs) =>  legs.some(leg => leg.swimmer_id == curSwimmerInfo.id),
				(err) => {console.warn(`Failed to get relay legs for relay ID ${r.id}:`, err); return false;}
			));
		}
		setCurrentTimes(timesToShow);
		setCurrentRelays(relaysToShow);
	}, [curMeetInfo, curSwimmerInfo, parsedTimes, relays, curRelayInfo, PTIndicesAndRLIDsByRelayID]);


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

	const [relayCardsToRender, setRelayCardsToRender] = useState<JSX.Element[]>();

	useEffect(() => {
		Res.combine(currentRelays.map((r) => Res.combine([ok(r),getRelayLegsForRelay(r.id)])
			.map(
				(rlegs: [Relay, RelayLeg[]]) => [rlegs[0], rlegs[1], rlegs[1].map(leg => swimmers[leg.swimmer_id] ?? undefined)] as [Relay, RelayLeg[], (Swimmer | undefined)[]])
				.andThen(([r, legs, swimmers]: [Relay, RelayLeg[], (Swimmer | undefined)[]]) => {
					if (legs.length != 4 || swimmers.length != 4) {
						return err(new Errors.NotFound(`Expected 4 legs and swimmers for relay ${r.id}, found ${legs.length} legs and ${swimmers.length} swimmers`));
					}
					if (swimmers.some(swimmer => swimmer == null)) {
						return err(new Errors.NotFound(`Missing swimmer info for at least one swimmer in relay ${r.id}`));
					}
					const event = events[r.event_id];
					const meet = meets[r.meet_id];
					return ok([r, legs, swimmers as Swimmer[], event, meet] as [Relay, RelayLeg[], Swimmer[], SEvent, Meet]);
				}).map(([r, legs, swimmers, event, meet]: [Relay, RelayLeg[], Swimmer[], SEvent, Meet]) => {
					const swimmerSpans = swimmers.map((swimmer, i) => (
						<span
							key={legs[i]?.swimmer_id ?? i}
							onClick={() => {
								if (legs[i]) setSearchParams({ swimmer_id: legs[i].swimmer_id.toString() });
							}}
							className="name-link"
						>
							{swimmer.first_name} {swimmer.last_name} '{(swimmer.graduating ?? 0) % 100}
						</span>
					));
					return (
						<li
							key={r.id}
							className="accent-card result-card"
						>
							<div className="result-row">
								<div className="name-line">
									{swimmerSpans.flatMap((node, i) =>
										i === 0 ? [node] : [<span key={`dot-${r.id}-${i}`} className="divider-dot">•</span>, node]
								)}
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
		);})))
		.match(res => setRelayCardsToRender(res), err => {
			console.error("Failed to get relay cards to render:", err);
			setRelayCardsToRender([]);
		});
	}, [currentRelays, curRelayInfo, events, meets, relays, swimmers, relayLegs]);
	
	const [timeCardsToRender, setTimeCardsToRender] = useState<JSX.Element[]>();
	useEffect(() => {
		setTimeCardsToRender(currentTimes.map((r) => {
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
			)}));
	}, [currentTimes, curMeetInfo, curSwimmerInfo, curRelayInfo, swimmers, meets, relays, relayLegs, events]);



	const [toRender, setToRender] = useState<JSX.Element>();
	useEffect(() => {
		if (searchParams.get("meet_id") == null && searchParams.get("swimmer_id") == null && searchParams.get("relay_id") == null) {
			setToRender(
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
			setToRender(
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
									{timeCardsToRender}
									{relayCardsToRender}
							</ul>
						</div>
					</div>
				</div>
			);

		}

	}, [searchParams, currentTimes, currentRelays, curMeetInfo, curSwimmerInfo, curRelayInfo, swimmers, meets, relays, relayLegs]);

	return toRender;

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
