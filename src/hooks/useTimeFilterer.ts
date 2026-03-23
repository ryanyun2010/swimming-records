import { useMemo } from "react";
import { SwimData } from "./useSwimData";
import { Relay } from "../lib/defs";
import { ParsedTime } from "./useParsedTimes";
import { RelayHelpers } from "./useRelayHelpers";
import { SearchParamHandler } from "./useSearchParamHandler";

export function useTimeFilterer(
	parsedTimes: ParsedTime[],
	data: SwimData,
	relayHelpers: RelayHelpers,
	searchParamHandler: SearchParamHandler,
) {
	const { curRelayInfo, curMeetInfo, curSwimmerInfo } = searchParamHandler;
	const { relays } = data;
	const { getParsedTimesForRelay, getRelayLegsForRelay } = relayHelpers;

	const [currentTimes, currentRelays] = useMemo(() => {
		let timesToShow: ParsedTime[] = parsedTimes;
		let relaysToShow: Relay[] = Object.values(relays);

		if (curRelayInfo != null) {
			const relay = relays[curRelayInfo.id] ?? null;
			if (relay) {
				getParsedTimesForRelay(relay.id).match(
					(data) => {
						timesToShow = data;
					},
					(err) => {
						console.warn(
							`Failed to get parsed times for relay ID ${relay.id} while filtering by that relay:`,
							err.toString(),
						);
						timesToShow = [];
					},
				);
				relaysToShow = [relay];
			} else {
				console.warn(`When filtering by relay, no relay found with ID ${curRelayInfo.id}`);
				timesToShow = [];
			}
		}

		if (curMeetInfo != null) {
			timesToShow = timesToShow.filter((t) => t.meet_id === curMeetInfo.id);
			relaysToShow = relaysToShow.filter((r) => r.meet_id === curMeetInfo.id);
		}

		if (curSwimmerInfo != null) {
			timesToShow = timesToShow.filter((t) => t.swimmer_id === curSwimmerInfo.id);
			relaysToShow = relaysToShow.filter((r) =>
				getRelayLegsForRelay(r.id).match(
					(legs) => legs.some((leg) => leg.swimmer_id === curSwimmerInfo.id),
					(err) => {
						console.warn(
							`While filtering by swimmer, failed to get relay legs for relay ID to determine swimmer ${r.id}:`,
							err.toString(),
						);
						return false;
					},
				),
			);
		}
		return [timesToShow, relaysToShow];
	}, [curMeetInfo, curSwimmerInfo, parsedTimes, relays, curRelayInfo, getRelayLegsForRelay, getParsedTimesForRelay]);

	return { currentTimes, currentRelays };
}

export type TimeFilterer = ReturnType<typeof useTimeFilterer>;
