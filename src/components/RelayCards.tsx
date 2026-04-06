import { RelayHelpers } from "../hooks/useRelayHelpers";
import { SearchParamHandler } from "../hooks/useSearchParamHandler";
import { SwimData } from "../hooks/useSwimData";
import { Relay } from "../lib/defs";
import { Result as Res, ok, err } from "neverthrow";
import * as Errors from "../lib/errors";
import { formatChange, formatDate, formatTime } from "../lib/utils";
import { JSX, useMemo } from "react";

type RelayCardsProps = {
	data: SwimData;
	curRelays: Relay[];
	searchParamHandler: SearchParamHandler;
	relayHelpers: RelayHelpers;
};

export function RelayCards({ data, curRelays, searchParamHandler, relayHelpers }: RelayCardsProps): JSX.Element[] {
	const { swimmers, meets, events, relays, recordProgs } = data;
	const { setSearchParams } = searchParamHandler;
	const { getRelayLegsForRelay } = relayHelpers;

	const relayRecordInfo = useMemo(() => {
		type RecordInfo = {
			current_PR: { change: number | null } | null;
			current_SR: { change: number | null } | null;
			previous_PR: { change: number | null; til: string } | null;
			previous_SR: { change: number | null; til: string } | null;
		};
		const info: Record<number, RecordInfo> = {};
		const lastPR: Record<string, number> = {};
		const lastSR: Record<number, number> = {};

		const ensure = (relayId: number): RecordInfo => {
			if (!info[relayId]) {
				info[relayId] = { current_PR: null, current_SR: null, previous_PR: null, previous_SR: null };
			}
			return info[relayId];
		};

		for (let recordProg of recordProgs) {
			if (recordProg.type !== "relay") continue;
			if (recordProg.relay_id == null || !relays[recordProg.relay_id]) {
				console.warn(`Skipping relay record prog ${recordProg.id}: missing relay info.`);
				continue;
			}
			const relayId = recordProg.relay_id;
			const relay = relays[relayId];
			const meetDate = meets[relay.meet_id]?.date ?? "";
			const curInfo = ensure(relayId);

			if (!recordProg.school_record) {
				const key = `${recordProg.swimmer_id}-${recordProg.event_id}`;
				const lastId = lastPR[key];
				if (lastId !== undefined && relays[lastId]) {
					const lastInfo = ensure(lastId);
					const lastCur = lastInfo.current_PR ?? { change: null };
					lastInfo.previous_PR = { change: lastCur.change, til: meetDate };
					lastInfo.current_PR = null;
					curInfo.current_PR = { change: relay.time_ms - relays[lastId].time_ms };
				} else {
					curInfo.current_PR = { change: null };
				}
				lastPR[key] = relayId;
			} else {
				const key = recordProg.event_id;
				const lastId = lastSR[key];
				if (lastId !== undefined && relays[lastId]) {
					const lastInfo = ensure(lastId);
					const lastCur = lastInfo.current_SR ?? { change: null };
					lastInfo.previous_SR = { change: lastCur.change, til: meetDate };
					lastInfo.current_SR = null;
					curInfo.current_SR = { change: relay.time_ms - relays[lastId].time_ms };
				} else {
					curInfo.current_SR = { change: null };
				}
				lastSR[key] = relayId;
			}
		}

		return info;
	}, [recordProgs, relays, meets]);

	function renderRelayCard(r: Relay): Res<JSX.Element, Error> {
		const legsFailable = getRelayLegsForRelay(r.id);
		if (legsFailable.isErr())
			return err(
				new Errors.NotFound(`Failed to get relay legs for relay ID ${r.id}: ${legsFailable.error.message}`),
			);

		const legs = legsFailable.unwrapOr([]);
		if (legs.length != 4)
			return err(new Errors.NotFound(`Expected 4 relay legs for relay ID ${r.id}, found ${legs.length}`));

		const swimmersForLegs = legs.map((leg) => swimmers[leg.swimmer_id]);
		if (swimmersForLegs.some((swimmer) => swimmer == null))
			return err(new Errors.NotFound(`Missing swimmer info for at least one swimmer in relay ID ${r.id}`));

		const event = events[r.event_id];
		if (!event) return err(new Errors.NotFound(`No event found with ID ${r.event_id} for relay ID ${r.id}`));

		const meet = meets[r.meet_id];
		if (!meet) return err(new Errors.NotFound(`No meet found with ID ${r.meet_id} for relay ID ${r.id}`));

		const swimmerSpans = swimmersForLegs.map((swimmer, i) => (
			<span
				key={legs[i]?.swimmer_id ?? i}
				onClick={() => {
					if (legs[i])
						setSearchParams({
							swimmer_id: legs[i].swimmer_id.toString(),
						});
				}}
				className="name-link"
			>
				{swimmer.first_name} {swimmer.last_name} '{(swimmer.graduating ?? 0) % 100}
			</span>
		));

		const recordInfo = relayRecordInfo[r.id] ?? null;
		const isSchoolRecord = recordInfo?.current_SR != null;
		const isSchoolRecordFirst = recordInfo?.current_SR?.change === null;
		const isPersonalRecord = recordInfo?.current_PR != null && recordInfo.current_PR.change !== null;
		const isFirstTimeSwim = recordInfo?.current_PR?.change === null;
		const srDelta = formatChange(recordInfo?.current_SR?.change);
		const prDelta = formatChange(recordInfo?.current_PR?.change);
		const previousPR = recordInfo?.previous_PR ?? null;
		const previousSR = recordInfo?.previous_SR ?? null;

		return ok(
			<li key={r.id} className="accent-card result-card">
				<div className="result-row">
					<div className="name-line">
						{swimmerSpans.flatMap((node, i) =>
							i === 0
								? [node]
								: [
										<span key={`dot-${r.id}-${i}`} className="divider-dot">
											•
										</span>,
										node,
									],
						)}
						<span className="divider-dot">•</span>
						<span className="tag tag-event">{event.name}</span>
						<div className="tag-row">
							<span
								className="tag tag-meta"
								style={{ cursor: "pointer" }}
								onClick={() =>
									setSearchParams({
										relay_id: r.id.toString(),
									})
								}
							>
								Relay
							</span>
							{isSchoolRecord ? (
								isSchoolRecordFirst ? (
									<span className="tag tag-sr-first">SCHOOL RECORD: FIRST TIME</span>
								) : (
									<span className="tag tag-sr">SCHOOL RECORD {srDelta}</span>
								)
							) : null}
							{isPersonalRecord ? <span className="tag tag-pr">PR {prDelta}</span> : null}
							{isFirstTimeSwim ? <span className="tag tag-fts">FTS</span> : null}
							{previousPR != null ? (
								previousPR.change === null ? (
									<span key="prev-pr" className="tag tag-fts">
										FTS
									</span>
								) : (
									<span key={`prev-pr`} className="tag tag-pr-prev">
										PREVIOUS PR {formatChange(previousPR.change)}
									</span>
								)
							) : null}
							{previousSR != null ? (
								previousSR.change === null ? (
									<span key={`prev-sr`} className="tag tag-sr-first">
										PREVIOUS SCHOOL RECORD: FIRST TIME
									</span>
								) : (
									<span key={`prev-sr`} className="tag tag-sr-prev">
										PREVIOUS SCHOOL RECORD {formatChange(previousSR.change)}
									</span>
								)
							) : null}
						</div>
					</div>
					<div className="time">{formatTime(r.time_ms)}</div>
				</div>
				<div className="meta-line">
					{meet?.name ?? ""}
					{meet?.date ? ` · ${formatDate(meet.date)}` : ""}
					{meet?.location ? ` · ${meet.location}` : ""}
				</div>
			</li>,
		);
	}

	return curRelays
		.map((t) => renderRelayCard(t))
		.reduce(
			(acc: JSX.Element[], cur: Res<JSX.Element, Errors.ErrorRes>) =>
				cur.match(
					(cards) => [...acc, cards],
					(err) => {
						console.warn(`Failed to render a relay card, skipping render: `, err.toString());
						return acc;
					},
				),
			[],
		);
}
