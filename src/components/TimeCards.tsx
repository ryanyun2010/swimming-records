import { SearchParamHandler } from "../hooks/useSearchParamHandler";
import { SwimData } from "../hooks/useSwimData";
import { JSX } from "react";
import { ParsedTime } from "../hooks/useParsedTimes";
import { formatChange, formatDate, formatTime } from "../lib/utils";
import { ErrorRes } from "../lib/errors";
import * as Errors from "../lib/errors";
import { Result as Res, err, ok } from "neverthrow";

type TimeCardsProps = {
	data: SwimData;
	curParsedTimes: ParsedTime[];
	searchParamHandler: SearchParamHandler;
};
export function TimeCards({ data, curParsedTimes, searchParamHandler }: TimeCardsProps): JSX.Element[] {
	const { relayLegs } = data;
	const { setSearchParams } = searchParamHandler;
	function renderTimeCard(t: ParsedTime, addEventGap: boolean): Res<JSX.Element, ErrorRes> {
		const isSchoolRecord = t.current_SR != null;
		const isSchoolRecordFirst = t.current_SR?.change === null;
		const isPersonalRecord = t.current_PR != null && t.current_PR.change !== null;
		const isFirstTimeSwim = t.current_PR?.change === null;
		const srChange = t.current_SR?.change;
		const prChange = t.current_PR?.change;
		const srDelta = formatChange(srChange != null ? Math.min(srChange, 0) : srChange);
		const prDelta = formatChange(prChange != null ? Math.min(prChange, 0) : prChange);
		const previousPR = t.previous_PR ?? null;
		const previousSR = t.previous_SR ?? null;
		const relayLeg = t.relay_leg_id != null ? relayLegs[t.relay_leg_id] : null;
		const dqReasonRaw = t.invalid_reason;
		const hasDQReason = dqReasonRaw != null && dqReasonRaw.trim() !== "";
		const isDQ = t.is_valid === false || hasDQReason;
		const dqReason = hasDQReason ? dqReasonRaw : "DQ";
		if (t.relay_leg_id != null && relayLeg == null)
			return err(
				new Errors.NotFound(
					`No relay leg found with ID ${t.relay_leg_id} for swimmer {t.swimmer_first_name} ${t.swimmer_last_name} in event ${t.event_name} at meet ${t.meet_name}`,
				),
			);
		return ok(
			<li
				className={`accent-card result-card`}
				key={`${t.type}-${t.result_id ?? t.relay_leg_id ?? t.swimmer_id}-${t.event_name}-${t.meet_id}`}
			>
				<div className="result-row">
					<div className="name-line">
						<span
							onClick={() =>
								setSearchParams({
									swimmer_id: t.swimmer_id.toString(),
								})
							}
							className="name-link"
						>
							{t.swimmer_first_name} {t.swimmer_last_name} '{t.swimmer_year % 100}
						</span>
						<span className="divider-dot">•</span>
						<span className="tag tag-event">{t.event_name}</span>
						<div className="tag-row">
							{t.type == "relay_leg" ? (
								<span
									style={{ cursor: "pointer" }}
									className="tag tag-meta"
									onClick={() => {
										if (relayLeg)
											setSearchParams({
												relay_id: relayLeg.relay_id.toString(),
											});
									}}
								>
									{t.start == "flat" ? "Relay Split · Flat Start" : "Relay Split · Relay Start"}
								</span>
							) : (
								<span className="tag tag-meta">Individual</span>
							)}
							{isDQ ? <span className="tag tag-dq">Invalid{dqReason ? `: ${dqReason}` : ""}</span> : null}
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
					<div className="time">{formatTime(t.time)}</div>
				</div>
				<div className="meta-line">
					{t.meet_name} · {formatDate(t.meet_date)} · {t.meet_location}
				</div>
			</li>,
		);
	}

	const rendered: JSX.Element[] = [];
	for (let index = 0; index < curParsedTimes.length; index++) {
		const t = curParsedTimes[index];
		const prev = index > 0 ? curParsedTimes[index - 1] : null;
		const addEventGap = prev != null && prev.event_name !== t.event_name;
		if (index == 0 || addEventGap) {
			rendered.push(
				<li key={`event-gap-${t.event_name}-${t.meet_id}-${index}`} className="event-gap-label">
					{t.event_name}
				</li>,
			);
		}
		const card = renderTimeCard(t, false);
		card.match(
			(node) => rendered.push(node),
			(err) => console.warn("Failed to render a time card, skipping render: ", err.toString()),
		);
	}
	return rendered;
}
