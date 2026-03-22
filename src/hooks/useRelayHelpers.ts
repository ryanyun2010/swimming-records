import { ParsedTime } from "./useParsedTimes";
import { RelayLeg } from "../lib/defs";
import { useRelayMappings } from "./useRelayMappings";
import * as Errors from "../lib/errors";
import { Result as Res, ok, err } from "neverthrow";
import { useCallback } from "react";

export function useRelayHelpers(parsedTimes: ParsedTime[], relayLegs: Record<number, RelayLeg>) {
	const mapping = useRelayMappings(parsedTimes, relayLegs);

	const getParsedTimesForRelay = useCallback(
		(relayID: number): Res<ParsedTime[], Errors.NotFound> => {
			const indicesAndIDs = mapping[relayID];
			if (!indicesAndIDs) return err(new Errors.NotFound(`No parsed times found for relay ID ${relayID}`));
			const indices = indicesAndIDs[0];
			return ok(indices.map((i) => parsedTimes[i]));
		},
		[mapping],
	);

	const getRelayLegsForRelay = useCallback(
		(relayID: number): Res<RelayLeg[], Errors.NotFound> => {
			const indicesAndIDs = mapping[relayID];
			if (!indicesAndIDs) return err(new Errors.NotFound(`No relay legs found for relay ID ${relayID}`));
			const relayLegIDs = indicesAndIDs[1];
			return ok(relayLegIDs.map((id) => relayLegs[id]));
		},
		[mapping],
	);

	return { getParsedTimesForRelay, getRelayLegsForRelay };
}
export type RelayHelpers = ReturnType<typeof useRelayHelpers>;
