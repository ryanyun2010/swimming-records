import { useState, useEffect, useMemo } from 'react';
import { ok , err } from "neverthrow";
import * as Errors from "../lib/errors";
import { SwimData } from "./useSwimData";
import { Meet, Swimmer, RelayLeg } from "../lib/defs";
import { RelayHelpers } from "./useRelayHelpers";

export function useSearchParamParser(data: SwimData, searchParams: URLSearchParams, relayHelpers: RelayHelpers) {
	const { swimmers, meets, relays, relayLegs, events } = data;
	const [curMeetInfo, setCurMeetInfo] = useState<Meet | null>(null);
	const [curSwimmerInfo, setCurSwimmerInfo] = useState<Swimmer | null>(null);
	const [curRelayInfo, setCurRelayInfo] = useState<{id: number, swimmer_names: string[], date: string, event: string} | null>(null);
	const { getRelayLegsForRelay } = relayHelpers;
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
	}, [searchParams, swimmers, meets, relays, relayLegs, events, getRelayLegsForRelay]);

	return useMemo(() => ({curMeetInfo, curSwimmerInfo, curRelayInfo}),[curMeetInfo,curSwimmerInfo,curRelayInfo]); 
}

export type SearchParamParser = ReturnType<typeof useSearchParamParser>;
