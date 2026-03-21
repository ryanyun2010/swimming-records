import { useEffect, useState, useMemo, JSX } from "react";
import "./App.css";
import { BrowserRouter as Router, Routes, Route, useSearchParams} from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
// import AdminPage from "./pages/AdminPage"; 
import { formatDate, getResponseJSONAndParse, formatTime, fetchAndParse, reducerByID} from "./lib/utils";
import { RecordProg, Meet, Relay, RelayLeg, Swimmer, Result, SEvent} from "./lib/defs";
import * as Errors from "./lib/errors";
import { ResultAsync, errAsync, okAsync, Result as Res, ok , err} from "neverthrow";
import { useSwimData } from "./hooks/useSwimData";
import { ParsedTime, useParsedTimes } from "./hooks/useParsedTimes";
import { useRelayHelpers } from "./hooks/useRelayHelpers";
import { useSearchParamParser } from "./hooks/useSearchParamParser";
import { useTimeFilterer } from "./hooks/useTimeFilterer";


function Home() {

	const [searchParams, setSearchParams] = useSearchParams();

	const data = useSwimData();
	const parsedTimes = useParsedTimes(data).match(
		(times) => times,
		(err) => {
			console.error("Failed to parse times:", err);
			return [];
		}
	); ;

	const relayHelpers = useRelayHelpers(parsedTimes, data.relayLegs);
	const searchParamParser = useSearchParamParser(data,searchParams,relayHelpers);
	const timeFilterer = useTimeFilterer(parsedTimes,data,relayHelpers,searchParamParser);

	const { curRelayInfo, curMeetInfo, curSwimmerInfo } = searchParamParser;
	const { currentTimes, currentRelays } = timeFilterer;
	const { getRelayLegsForRelay, getParsedTimesForRelay } = relayHelpers;
	const { swimmers, meets, events, relays, relayLegs } = data;


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
