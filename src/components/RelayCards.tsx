import { RelayHelpers } from "../hooks/useRelayHelpers";
import { SearchParamHandler } from "../hooks/useSearchParamHandler";
import { SwimData } from "../hooks/useSwimData";
import { Relay } from "../lib/defs";
import { Result as Res, ok, err } from "neverthrow";
import * as Errors from "../lib/errors";
import { formatChange, formatDate, formatTime } from "../lib/utils";
import { JSX } from "react";
import { useRelayRecordInfo } from "../hooks/useRelayRecordInfo";

type RelayCardsProps = {
	data: SwimData;
	curRelays: Relay[];
	searchParamHandler: SearchParamHandler;
	relayHelpers: RelayHelpers;
};

export function RelayCards({ data, curRelays, searchParamHandler, relayHelpers }: RelayCardsProps): JSX.Element[] {
	const { swimmers, meets, events } = data;
	const { setSearchParams } = searchParamHandler;
	const { getRelayLegsForRelay } = relayHelpers;
	const relayRecordInfo = useRelayRecordInfo(data);

	function renderRelayCard(r: Relay, addEventGap: boolean): Res<JSX.Element, Error> {
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
		const srChange = recordInfo?.current_SR?.change;
		const srDelta = formatChange(srChange != null ? Math.min(srChange, 0) : srChange);
		const previousSR = recordInfo?.previous_SR ?? null;
		const dqReasonRaw = r.invalid_reason;
		const hasDQReason = dqReasonRaw != null && dqReasonRaw.trim() !== "";
		const isDQ = r.is_valid === false || hasDQReason;
		const dqReason = hasDQReason ? dqReasonRaw : "DQ";

		return ok(
			<li key={r.id} className={`accent-card result-card`}>
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
						<span className="tag tag-event"
							onClick = {
								() => setSearchParams({
									event_id: r.event_id.toString(),
								})
							}
						>{event.name}</span>
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
							{isDQ ? <span className="tag tag-dq">Invalid{dqReason ? `: ${dqReason}` : ""}</span> : null}
							{isSchoolRecord ? (
								isSchoolRecordFirst ? (
									<span className="tag tag-sr-first" onClick = {
										() => setSearchParams({
											srs_only: "true",
											event_id: r.event_id.toString(),
										})
									}
									>SCHOOL RECORD: FIRST TIME</span>
								) : (
									<span className="tag tag-sr" onClick = 
										{
											() => setSearchParams({
												srs_only: "true",
												event_id: r.event_id.toString(),
											})
									}
										>SCHOOL RECORD {srDelta}</span>
								)
							) : null}
							{previousSR != null ? (
								previousSR.change === null ? (
									<span key={`prev-sr`} className="tag tag-sr-first" onClick = {
										() => setSearchParams({
											srs_only: "true",
											event_id: r.event_id.toString(),
										})
									}>
										PREVIOUS SCHOOL RECORD: FIRST TIME
									</span>
								) : (
									<span key={`prev-sr`} className="tag tag-sr-prev" onClick = {
										() => setSearchParams({
											srs_only: "true",
											event_id: r.event_id.toString(),
										})
									}>
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

	const rendered: JSX.Element[] = [];
	for (let index = 0; index < curRelays.length; index++) {
		const t = curRelays[index];
		const prev = index > 0 ? curRelays[index - 1] : null;
		const eventName = events[t.event_id]?.name ?? "";
		const prevEventName = prev ? events[prev.event_id]?.name ?? "" : "";
		const addEventGap = prev != null && eventName !== prevEventName;
		if (index == 0 || addEventGap) {
			rendered.push(
				<li key={`event-gap-${eventName}-${t.meet_id}-${index}`} className="event-gap-label">
					{eventName}
				</li>,
			);
		}
		const card = renderRelayCard(t, false);
		card.match(
			(node) => rendered.push(node),
			(err) => console.warn(`Failed to render a relay card, skipping render: `, err.toString()),
		);
	}
	return rendered;
}
