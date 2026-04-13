import { useMemo } from "react";
import { SwimData } from "./useSwimData";
import { Relay } from "../lib/defs";
import { ParsedTime } from "./useParsedTimes";
import { RelayHelpers } from "./useRelayHelpers";
import { SearchParamHandler } from "./useSearchParamHandler";
import { RelayRecordInfo } from "./useRelayRecordInfo";

export function useTimeFilterer(
	parsedTimes: ParsedTime[],
	data: SwimData,
	relayHelpers: RelayHelpers,
	searchParamHandler: SearchParamHandler,
	relayRecordInfo: Record<number, RelayRecordInfo>,
) {
	const { filters } = searchParamHandler;
	const { relays } = data;
	const { getParsedTimesForRelay, getRelayLegsForRelay } = relayHelpers;

	const [currentTimes, currentRelays] = useMemo(() => {
		let timesToShow: ParsedTime[] = parsedTimes;
		let relaysToShow: Relay[] = Object.values(relays);

		if (filters.relay_id != null) {
			const relay = relays[filters.relay_id] ?? null;
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
				console.warn(`When filtering by relay, no relay found with ID ${filters.relay_id}`);
				timesToShow = [];
			}
		}

		if (filters.meet_id != null) {
			timesToShow = timesToShow.filter((t) => t.meet_id === filters.meet_id);
			relaysToShow = relaysToShow.filter((r) => r.meet_id === filters.meet_id);
		}
		
		if (filters.swimmer_id != null) {
			timesToShow = timesToShow.filter((t) => t.swimmer_id === filters.swimmer_id);
			relaysToShow = relaysToShow.filter((r) =>
				getRelayLegsForRelay(r.id).match(
					(legs) => legs.some((leg) => leg.swimmer_id === filters.swimmer_id),
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

		if (filters.event_id != null) {
			const event_name = data.events[filters.event_id].name;
			timesToShow = timesToShow.filter((t) => t.event_name === event_name);
			relaysToShow = relaysToShow.filter((r) => r.event_id === filters.event_id);
		}

		if (filters.cur_prs_only) {
			timesToShow = timesToShow.filter((t) => t.current_PR != null);
			relaysToShow = relaysToShow.filter((r) => {
				const info = relayRecordInfo[r.id];
				return info?.current_PR != null;
			});
		}
		if (filters.prs_only) {
			timesToShow = timesToShow.filter((t) => t.current_PR != null || t.previous_PR != null);
			relaysToShow = relaysToShow.filter((r) => {
				const info = relayRecordInfo[r.id];
				return info?.current_PR != null || info?.previous_PR != null;
			});
		}
		if (filters.cur_srs_only) {
			timesToShow = timesToShow.filter((t) => t.current_SR != null);
			relaysToShow = relaysToShow.filter((r) => {
				const info = relayRecordInfo[r.id];
				return info?.current_SR != null;
			});
		}
		if (filters.srs_only) {
			timesToShow = timesToShow.filter((t) => t.current_SR != null || t.previous_SR != null);
			relaysToShow = relaysToShow.filter((r) => {
				const info = relayRecordInfo[r.id];
				return info?.current_SR != null || info?.previous_SR != null;
			});
		}
		if (filters.fts_only) {
			timesToShow = timesToShow.filter((t) => t.current_PR?.change === null || t.previous_PR?.change === null);
			relaysToShow = relaysToShow.filter((r) => {
				const info = relayRecordInfo[r.id];
				return info && (info.current_PR?.change === null || info.previous_PR?.change === null);
			});
		}
		return [timesToShow, relaysToShow];
	}, [filters, parsedTimes, relays, getRelayLegsForRelay, getParsedTimesForRelay, relayRecordInfo]);

	return { currentTimes, currentRelays };
}

export type TimeFilterer = ReturnType<typeof useTimeFilterer>;
