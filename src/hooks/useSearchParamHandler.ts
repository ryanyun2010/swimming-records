import { useMemo } from "react";
import { ok, err } from "neverthrow";
import * as Errors from "../lib/errors";
import { SwimData } from "./useSwimData";
import { Swimmer, RelayLeg } from "../lib/defs";
import { RelayHelpers } from "./useRelayHelpers";
import { useSearchParams } from "react-router-dom";

export function useSearchParamHandler(data: SwimData, relayHelpers: RelayHelpers) {
	const { swimmers, meets, relays, events } = data;
	const [searchParams, setSearchParams] = useSearchParams();
	const { getRelayLegsForRelay } = relayHelpers;
	const { curMeetInfo, curSwimmerInfo, curRelayInfo } = useMemo(() => {
		let curMeetInfo = null;
		let curSwimmerInfo = null;
		let curRelayInfo = null;
		if (searchParams.get("meet_id") !== null && searchParams.get("meet_id")!.length > 0) {
			curMeetInfo = meets[parseInt(searchParams.get("meet_id")!)] ?? null;
		}

		if (searchParams.get("swimmer_id") !== null && searchParams.get("swimmer_id")!.length > 0) {
			curSwimmerInfo = swimmers[parseInt(searchParams.get("swimmer_id")!)] ?? null;
		}

		if (searchParams.get("relay_id") !== null && searchParams.get("relay_id")!.length > 0) {
			let id = parseInt(searchParams.get("relay_id")!);
			const relay = relays[id] ?? null;
			if (relay) {
				curRelayInfo = getRelayLegsForRelay(relay.id)
					.andThen((relayLegs: RelayLeg[]) => {
						if (relayLegs.length !== 4) {
							return err(
								new Errors.NotFound(
									`Expected 4 relay legs for relay ${relay.id}, found ${relayLegs.length}`,
								),
							);
						}
						return ok(relayLegs.map((leg) => swimmers[leg.swimmer_id]));
					})
					.map((swimmers: Swimmer[]) =>
						swimmers.map((swimmer) => `${swimmer.first_name} ${swimmer.last_name}`),
					)
					.andThen((swimmer_names: string[]) => {
						const event = events[relay.event_id];
						if (!event) return err(new Errors.NotFound(`No event found with ID ${relay.event_id} `));
						if (!meets[relay.meet_id])
							return err(new Errors.NotFound(`No meet found with ID ${relay.meet_id}`));
						return ok({
							id,
							swimmer_names,
							date: meets[relay.meet_id].date,
							event: event.name,
						});
					})
					.match(
						(d) => d,
						(err) => {
							console.error(`Failed to load relay info for relay ID ${id}:`, err.toString());
							return null;
						},
					);
			}
		}
		return { curMeetInfo, curSwimmerInfo, curRelayInfo };
	}, [searchParams, swimmers, meets, relays, events, getRelayLegsForRelay]);

	return { curMeetInfo, curSwimmerInfo, curRelayInfo, setSearchParams };
}

export type SearchParamHandler = ReturnType<typeof useSearchParamHandler>;
