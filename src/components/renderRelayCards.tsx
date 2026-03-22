import { RelayHelpers } from "../hooks/useRelayHelpers";
import { SearchParamHandler } from "../hooks/useSearchParamHandler";
import { SwimData } from "../hooks/useSwimData";
import { Relay } from "../lib/defs";
import { Result as Res, ok, err } from "neverthrow";
import * as Errors from "../lib/errors";
import { formatDate, formatTime } from "../lib/utils";
import { JSX } from "react";

export function renderRelayCards(data: SwimData, curRelays: Relay[], searchParamHandler: SearchParamHandler, relayHelpers: RelayHelpers): Res<JSX.Element[], Errors.ErrorRes> {
	const { swimmers, meets, events } = data;
	const { setSearchParams } = searchParamHandler;
	const { getRelayLegsForRelay } = relayHelpers;

	function renderRelayCard(r: Relay): Res<JSX.Element, Error> {
		const legsFailable = getRelayLegsForRelay(r.id);
		if (legsFailable.isErr()) return err(new Errors.NotFound(`Failed to get relay legs for relay ID ${r.id}: ${legsFailable.error.message}`));

		const legs = legsFailable.unwrapOr([]);
		if (legs.length != 4) return err(new Errors.NotFound(`Expected 4 relay legs for relay ID ${r.id}, found ${legs.length}`));

		const swimmersForLegs = legs.map(leg => swimmers[leg.swimmer_id]);
		if (swimmersForLegs.some(swimmer => swimmer == null)) return err(new Errors.NotFound(`Missing swimmer info for at least one swimmer in relay ID ${r.id}`));

		const event = events[r.event_id];
		if (!event) return err(new Errors.NotFound(`No event found with ID ${r.event_id} for relay ID ${r.id}`));

		const meet = meets[r.meet_id];
		if (!meet) return err(new Errors.NotFound(`No meet found with ID ${r.meet_id} for relay ID ${r.id}`));

		const swimmerSpans = swimmersForLegs.map((swimmer, i) => (
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
		
		return ok(
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
		</li>)
	}

	return Res.combine(curRelays.map((r) => renderRelayCard(r).match(
						c => ok(c),
						e => err(new Errors.GeneralError(`Failed to render relay card for relay ID ${r.id}: ${e.toString()}`))
					)
	));
}
