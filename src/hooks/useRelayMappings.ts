import { useMemo } from "react";
import { ParsedTime } from "./useParsedTimes";
import { RelayLeg } from "../lib/defs";

export function useRelayMappings(parsedTimes: ParsedTime[], relayLegs: Record<number, RelayLeg>) {
	return useMemo<Record<number, number[][]>>(() => {
		const mapping: Record<number, number[][]> = {};
		for (let i = 0; i < parsedTimes.length; i++) {
			if (parsedTimes[i].type !== "relay_leg") continue;
			const time = parsedTimes[i];
			const relayLeg = relayLegs[time.relay_leg_id!];
			const relayID = relayLeg.relay_id;
			if (!mapping[relayID]) {
				mapping[relayID] = [[], []];
			}
			mapping[relayID][0].push(i);
			mapping[relayID][1].push(time.relay_leg_id!);
		}
		return mapping;
	}, [parsedTimes, relayLegs]);
}
