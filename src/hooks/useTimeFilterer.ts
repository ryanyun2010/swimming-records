import { useState, useEffect, useMemo } from 'react';
import { SwimData } from "./useSwimData";
import { Relay } from "../lib/defs";
import { ParsedTime } from "./useParsedTimes";
import { RelayHelpers } from "./useRelayHelpers";
import { SearchParamParser } from "./useSearchParamParser";

export function useTimeFilterer(parsedTimes: ParsedTime[], data: SwimData, relayHelpers: RelayHelpers, searchParamParser: SearchParamParser) {
	const [currentTimes, setCurrentTimes] = useState<ParsedTime[]>([]);
	const [currentRelays, setCurrentRelays] = useState<Relay[]>([]);
	const { curRelayInfo, curMeetInfo, curSwimmerInfo } = searchParamParser;
	const { relays } = data;
	const { getParsedTimesForRelay, getRelayLegsForRelay} = relayHelpers;

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
			relaysToShow = relaysToShow.filter((r) => getRelayLegsForRelay(r.id).match(
				(legs) =>  legs.some(leg => leg.swimmer_id == curSwimmerInfo.id),
				(err) => {console.warn(`Failed to get relay legs for relay ID ${r.id}:`, err); return false;}
			));
		}
		setCurrentTimes(timesToShow);
		setCurrentRelays(relaysToShow);
	}, [curMeetInfo, curSwimmerInfo, parsedTimes, relays, curRelayInfo, getRelayLegsForRelay, getParsedTimesForRelay]);

	return useMemo(() => ({currentTimes, currentRelays }), [currentTimes, currentRelays])
}

export type TimeFilterer = ReturnType<typeof useTimeFilterer>;
