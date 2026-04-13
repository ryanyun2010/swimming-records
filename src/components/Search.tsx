import { JSX, useMemo } from "react";
import { SearchParamHandler, is_filtered } from "../hooks/useSearchParamHandler";
import { SwimData } from "../hooks/useSwimData";
import { Relay } from "../lib/defs";
import { ParsedTime } from "../hooks/useParsedTimes";
import { Header } from "./Header";
import { TimeCards } from "./TimeCards";
import { RelayHelpers } from "../hooks/useRelayHelpers";
import { RelayCards } from "./RelayCards";
import { formatDate } from "../lib/utils";
import { RelayRecordInfo } from "../hooks/useRelayRecordInfo";
import { findEventIdByLabel } from "../AdminPage/utils";
type SearchProps = {
	data: SwimData;
	searchParamHandler: SearchParamHandler;
	relayHelpers: RelayHelpers;
	curRelays: Relay[];
	curParsedTimes: ParsedTime[];
	relayRecordInfo: Record<number, RelayRecordInfo>;
};

export function Search({
	data,
	searchParamHandler,
	relayHelpers,
	curRelays,
	curParsedTimes,
	relayRecordInfo,
}: SearchProps): JSX.Element {
	const { setSearchParams, filters } = searchParamHandler;
	const showMeetSummary =
		filters.meet_id != null &&
		filters.event_id == null &&
		filters.relay_id == null &&
		filters.swimmer_id == null &&
		!filters.cur_prs_only &&
		!filters.prs_only &&
		!filters.cur_srs_only &&
		!filters.srs_only;

	const curMeetInfo = useMemo(() => {
		if (filters.meet_id == null) return null;
		const meet = data.meets[filters.meet_id];
		return meet ? { name: meet.name, date: meet.date } : null;
	}, [filters.meet_id, data.meets]);

	const meetSummary = useMemo(() => {
		let prs = 0;
		let prsCurrent = 0;
		let fts = 0;
		let srs = 0;
		let srsCurrent = 0;

		const countTime = (t: ParsedTime) => {
			const hasPR = t.current_PR != null || t.previous_PR != null;
			const hasCurrentPR = t.current_PR != null;
			const hasFTS = t.current_PR?.change === null || t.previous_PR?.change === null;
			const hasSR = t.current_SR != null || t.previous_SR != null;
			const hasCurrentSR = t.current_SR != null;
			if (hasPR) prs += 1;
			if (hasCurrentPR) prsCurrent += 1;
			if (hasFTS) fts += 1;
			if (hasSR) srs += 1;
			if (hasCurrentSR) srsCurrent += 1;
		};

		const countRelay = (relayId: number) => {
			const info = relayRecordInfo[relayId];
			if (!info) return;
			const hasSR = info.current_SR != null || info.previous_SR != null;
			const hasCurrentSR = info.current_SR != null;
			if (hasSR) srs += 1;
			if (hasCurrentSR) srsCurrent += 1;
		};

		curParsedTimes.forEach((t) => countTime(t));
		curRelays.forEach((relay) => countRelay(relay.id));

		return { prs, prsCurrent, fts, srs, srsCurrent };
	}, [curParsedTimes, curRelays, relayRecordInfo]);

	const sortedIndividualTimes = useMemo(() => {
		const { events } = data;
		const distanceByName = new Map<string, number>();
		Object.values(events).forEach((event) => {
			distanceByName.set(event.name, event.distance);
		});
		return [...curParsedTimes]
			.filter(
				(t) =>
					t.type === "individual" ||
					(t.type === "relay_leg" &&
						filters.note_legs &&
						t.relay_leg_id != null &&
						data.relayLegs[t.relay_leg_id].leg_order === 1),
			)
			.sort((a, b) => {
				const distanceA = distanceByName.get(a.event_name) ?? 0;
				const distanceB = distanceByName.get(b.event_name) ?? 0;
				if (distanceA !== distanceB) return distanceA - distanceB;
				let aeventc = a.event_name.replace(/(Boys|Girls)/g, "");
				let beventc = b.event_name.replace(/(Boys|Girls)/g, "");
				const eventCompare = aeventc.localeCompare(beventc);
				if (eventCompare !== 0) return eventCompare;
				let malea = a.event_name.includes("Boys");
				let maleb = b.event_name.includes("Boys");
				if (malea !== maleb) return malea ? 1 : -1;
				return a.time - b.time;

			});
	}, [curParsedTimes, data, filters]);

	const sortedRelayLegTimes = useMemo(() => {
		const { events } = data;
		const distanceByName = new Map<string, number>();
		Object.values(events).forEach((event) => {
			distanceByName.set(event.name, event.distance);
		});
		return [...curParsedTimes]
			.filter(
				(t) =>
					t.type === "relay_leg" &&
					!(filters.note_legs && t.relay_leg_id != null && data.relayLegs[t.relay_leg_id].leg_order === 1),
			)
			.sort((a, b) => {
				const distanceA = distanceByName.get(a.event_name) ?? 0;
				const distanceB = distanceByName.get(b.event_name) ?? 0;
				if (distanceA !== distanceB) return distanceA - distanceB;
				let aeventc = a.event_name.replace(/(Boys|Girls)/g, "");
				let beventc = b.event_name.replace(/(Boys|Girls)/g, "");
				const eventCompare = aeventc.localeCompare(beventc);
				if (eventCompare !== 0) return eventCompare;
				let malea = a.event_name.includes("Boys");
				let maleb = b.event_name.includes("Boys");
				if (malea !== maleb) return malea ? 1 : -1;
				return a.time - b.time;
			});
	}, [curParsedTimes, data, filters]);

	const sortedRelays = useMemo(() => {
		const { events } = data;
		return [...curRelays].sort((a, b) => {
			const eventA = events[a.event_id];
			const eventB = events[b.event_id];
			const distanceA = eventA?.distance ?? 0;
			const distanceB = eventB?.distance ?? 0;
			if (distanceA !== distanceB) return distanceA - distanceB;
			const eventNameA = eventA?.name ?? "";
			const eventNameB = eventB?.name ?? "";
			let aeventc = eventNameA.replace(/(Boys|Girls)/g, "");
			let beventc = eventNameB.replace(/(Boys|Girls)/g, "");
			const eventCompare = aeventc.localeCompare(beventc);
			if (eventCompare !== 0) return eventCompare;
			if (eventA.is_male !== eventB.is_male) return eventA.is_male ? 1 : -1;
			return a.time_ms - b.time_ms;
		});
	}, [curRelays, data]);
	return (
		<div className="app-shell">
			<div className="app-inner">
				<div className="accent-card hero-card">
					<div className="hero-row">
						<div>
							<div className="hero-eyebrow">Records View</div>
							<h1 className="hero-title">Nueva Swimming Records</h1>
							<div className="hero-subtitle">
								<Header
									searchParamHandler={searchParamHandler}
									data={data}
									relayHelpers={relayHelpers}
								/>
							</div>
						</div>
						<button type="button" onClick={() => setSearchParams({})} className="back-button">
							Back to Meets
						</button>
					</div>
				</div>

				{showMeetSummary ? (
					<div className="accent-card meet-overview-card">
						<div className="meet-overview-header">
							<div>
								<div className="meet-overview-eyebrow">Meet Overview</div>
								<h2 className="meet-overview-title">Records at this meet</h2>
								<p className="meet-overview-note">Includes records that were later broken.</p>
							</div>
							<div className="meet-overview-date">
								{curMeetInfo?.date ? formatDate(curMeetInfo.date) : ""}
							</div>
						</div>
						<div className="meet-overview-grid">
							<div
								className="meet-overview-stat stat-fts"
								onClick={() =>
									setSearchParams({
										fts_only: "true",
										note_legs: "true",
										meet_id: filters.meet_id?.toString() ?? "",
									})
								}
								style={{ cursor: "pointer" }}
							>
								<div className="stat-label">FIRST TIME SWIMS</div>
								<div className="stat-value">{meetSummary.fts}</div>
							</div>
							<div
								className="meet-overview-stat stat-pr"
								onClick={() =>
									setSearchParams({
										prs_only: "true",
										note_legs: "true",
										meet_id: filters.meet_id?.toString() ?? "",
									})
								}
								style={{ cursor: "pointer" }}
							>
								<div className="stat-label">PERSONAL RECORDS SET</div>
								<div className="stat-value">
									{meetSummary.prs}
									{meetSummary.prsCurrent > 0 ? (
										<span className="stat-inline">{meetSummary.prsCurrent} still current</span>
									) : null}
								</div>
							</div>
							<div
								className="meet-overview-stat stat-sr"
								onClick={() =>
									setSearchParams({
										srs_only: "true",
										note_legs: "true",
										meet_id: filters.meet_id?.toString() ?? "",
									})
								}
								style={{ cursor: "pointer" }}
							>
								<div className="stat-label">SCHOOL RECORDS SET</div>
								<div className="stat-value">
									{meetSummary.srs}
									{meetSummary.srsCurrent > 0 ? (
										<span className="stat-inline">{meetSummary.srsCurrent} still current</span>
									) : null}
								</div>
							</div>
						</div>
					</div>
				) : null}

				{sortedIndividualTimes.length > 0 ? (
					<div className="section-block">
						<div className="section-header section-header-sticky">
							<div className="section-bar" />
							<div className="section-title-row">
								<h2 className="section-title">{filters.note_legs ? "Flat Start" : "Individual"}</h2>
								<span className="section-count">{sortedIndividualTimes.length}</span>
							</div>
						</div>
						<ul className="card-list">
							<TimeCards
								data={data}
								curParsedTimes={sortedIndividualTimes}
								searchParamHandler={searchParamHandler}
							/>
						</ul>
					</div>
				) : null}

				{sortedRelayLegTimes.length > 0 ? (
					<div className="section-block">
						<div className="section-header section-header-sticky">
							<div className="section-bar" />
							<div className="section-title-row">
								<h2 className="section-title">{filters.note_legs ? "Relay Start" : "Relay Legs"}</h2>
								<span className="section-count">{sortedRelayLegTimes.length}</span>
							</div>
						</div>
						<ul className="card-list">
							<TimeCards
								data={data}
								curParsedTimes={sortedRelayLegTimes}
								searchParamHandler={searchParamHandler}
							/>
						</ul>
					</div>
				) : null}

				{sortedRelays.length > 0 ? (
					<div className="section-block">
						<div className="section-header section-header-sticky">
							<div className="section-bar" />
							<div className="section-title-row">
								<h2 className="section-title">Relays</h2>
								<span className="section-count">{sortedRelays.length}</span>
							</div>
						</div>
						<ul className="card-list">
							<RelayCards
								data={data}
								curRelays={sortedRelays}
								searchParamHandler={searchParamHandler}
								relayHelpers={relayHelpers}
							/>
						</ul>
					</div>
				) : null}
			</div>
		</div>
	);
}
