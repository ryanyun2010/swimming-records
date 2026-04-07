import { JSX, useMemo } from "react";
import { SearchParamHandler } from "../hooks/useSearchParamHandler";
import { SwimData } from "../hooks/useSwimData";
import { Relay } from "../lib/defs";
import { ParsedTime } from "../hooks/useParsedTimes";
import { Header } from "./Header";
import { TimeCards } from "./TimeCards";
import { RelayHelpers } from "../hooks/useRelayHelpers";
import { RelayCards } from "./RelayCards";
import { formatDate } from "../lib/utils";
import { useRelayRecordInfo } from "../hooks/useRelayRecordInfo";

type SearchProps = {
	data: SwimData;
	searchParamHandler: SearchParamHandler;
	relayHelpers: RelayHelpers;
	curRelays: Relay[];
	curParsedTimes: ParsedTime[];
};

export function Search({
	data,
	searchParamHandler,
	relayHelpers,
	curRelays,
	curParsedTimes,
}: SearchProps): JSX.Element {
	const { setSearchParams, curMeetInfo, curSwimmerInfo, curRelayInfo } = searchParamHandler;
	const showMeetSummary = curMeetInfo != null && curSwimmerInfo == null && curRelayInfo == null;

	const relayRecordInfo = useRelayRecordInfo(data);

	const meetSummary = useMemo(() => {
		let prs = 0;
		let fts = 0;
		let srs = 0;
		let srsCurrent = 0;

		const countTime = (t: ParsedTime) => {
			const hasPR = t.current_PR != null || t.previous_PR != null;
			const hasFTS = t.current_PR?.change === null || t.previous_PR?.change === null;
			const hasSR = t.current_SR != null || t.previous_SR != null;
			const hasCurrentSR = t.current_SR != null;
			if (hasPR) prs += 1;
			if (hasFTS) fts += 1;
			if (hasSR) srs += 1;
			if (hasCurrentSR) srsCurrent += 1;
		};

		const countRelay = (relayId: number) => {
			const info = relayRecordInfo[relayId];
			if (!info) return;
			const hasPR = info.current_PR != null || info.previous_PR != null;
			const hasFTS = info.current_PR?.change === null || info.previous_PR?.change === null;
			const hasSR = info.current_SR != null || info.previous_SR != null;
			const hasCurrentSR = info.current_SR != null;
			if (hasPR) prs += 1;
			if (hasFTS) fts += 1;
			if (hasSR) srs += 1;
			if (hasCurrentSR) srsCurrent += 1;
		};

		curParsedTimes.forEach((t) => countTime(t));
		curRelays.forEach((relay) => countRelay(relay.id));

		return { prs, fts, srs, srsCurrent };
	}, [curParsedTimes, curRelays, relayRecordInfo]);

	const sortedIndividualTimes = useMemo(() => {
		return [...curParsedTimes]
			.filter((t) => t.type === "individual")
			.sort((a, b) => {
				const eventCompare = a.event_name.localeCompare(b.event_name);
				if (eventCompare !== 0) return eventCompare;
				return b.time - a.time;
			});
	}, [curParsedTimes]);

	const sortedRelayLegTimes = useMemo(() => {
		return [...curParsedTimes]
			.filter((t) => t.type === "relay_leg")
			.sort((a, b) => {
				const eventCompare = a.event_name.localeCompare(b.event_name);
				if (eventCompare !== 0) return eventCompare;
				return b.time - a.time;
			});
	}, [curParsedTimes]);

	const sortedRelays = useMemo(() => {
		const { events } = data;
		return [...curRelays].sort((a, b) => {
			const eventA = events[a.event_id]?.name ?? "";
			const eventB = events[b.event_id]?.name ?? "";
			const eventCompare = eventA.localeCompare(eventB);
			if (eventCompare !== 0) return eventCompare;
			return b.time_ms - a.time_ms;
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
								<Header searchParamHandler={searchParamHandler} />
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
							<div className="meet-overview-stat stat-pr">
								<div className="stat-label">PRs</div>
								<div className="stat-value">{meetSummary.prs}</div>
								<div className="stat-sub">Personal records set</div>
							</div>
							<div className="meet-overview-stat stat-fts">
								<div className="stat-label">FTS</div>
								<div className="stat-value">{meetSummary.fts}</div>
								<div className="stat-sub">First-time swims</div>
							</div>
							<div className="meet-overview-stat stat-sr">
								<div className="stat-label">SRs</div>
								<div className="stat-value">
									{meetSummary.srs}
									<span className="stat-inline">{meetSummary.srsCurrent} still current</span>
								</div>
								<div className="stat-sub">School records at the time</div>
							</div>
						</div>
					</div>
				) : null}

				<div className="section-block">
					<div className="section-header section-header-sticky">
						<div className="section-bar" />
						<div className="section-title-row">
							<h2 className="section-title">Individual</h2>
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

				<div className="section-block">
					<div className="section-header section-header-sticky">
						<div className="section-bar" />
						<div className="section-title-row">
							<h2 className="section-title">Relay Legs</h2>
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
			</div>
		</div>
	);
}
