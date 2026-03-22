import { useState, useEffect, useMemo, useCallback } from 'react';
import { recordProgsSchema, RecordProg, meetsSchema, Meet, relaysSchema, Relay, relayLegsSchema, RelayLeg, swimmersSchema, Swimmer, resultsSchema, Result, eventsSchema, SEvent} from "../lib/defs";
import { fetchAndParse, reducerByID} from "../lib/utils";

export function useSwimData() {
	const [results, setResults] = useState<Record<number, Result>>({});
	const [swimmers, setSwimmers] = useState<Record<number, Swimmer>>({});
	const [meets, setMeets] = useState<Record<number, Meet>>({});
	const [relays, setRelays] = useState<Record<number, Relay>>({});
	const [relayLegs, setRelayLegs] = useState<Record<number, RelayLeg>>({});
	const [events, setEvents] = useState<Record<number, SEvent>>({});
	const [recordProgs, setRecordProgs] = useState<RecordProg[]>([]);

	const fetchData = useCallback(() => {
		fetchAndParse("https://swimming-api.ryanyun2010.workers.dev/records", recordProgsSchema)
		.match(
			(data) => setRecordProgs(data),
			(err) => console.error("Failed to load record progressions:", err)
		)

		fetchAndParse("https://swimming-api.ryanyun2010.workers.dev/swimmers", swimmersSchema)
		.match(
			(data) => setSwimmers(reducerByID(data)),
			(err) => console.error("Failed to load swimmers:", err)
		)

		fetchAndParse("https://swimming-api.ryanyun2010.workers.dev/meets", meetsSchema)
		.match(
			(data) => setMeets(reducerByID(data)),
			(err) => console.error("Failed to load meets:", err)
		)

		fetchAndParse("https://swimming-api.ryanyun2010.workers.dev/relays", relaysSchema)
		.match(
			(data) => setRelays(reducerByID(data)),
			(err) => console.error("Failed to load relay:", err)
		)

		fetchAndParse("https://swimming-api.ryanyun2010.workers.dev/relay_legs", relayLegsSchema)
		.match(
			(data) => setRelayLegs(reducerByID(data)),
			(err) => console.error("Failed to load relay legs:", err)
		)

		fetchAndParse("https://swimming-api.ryanyun2010.workers.dev/events", eventsSchema)
		.match(
			(data) => setEvents(reducerByID(data)),
			(err) => console.error("Failed to load events:", err)
		)

		fetchAndParse("https://swimming-api.ryanyun2010.workers.dev/results", resultsSchema)
		.match(
			(data) => setResults(reducerByID(data)),
			(err) => console.error("Failed to load results:", err)
		)
	},[]);

	useEffect(fetchData, []);	



	return useMemo(() => ({ results, swimmers, meets, relays, relayLegs, events, recordProgs, refresher: fetchData}), [results, swimmers, meets, relays, relayLegs, events, recordProgs, fetchData]);
}
export type SwimData = ReturnType<typeof useSwimData>;

