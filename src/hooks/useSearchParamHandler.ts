import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";

// meet id, swimmer id, relay id, cur_prs_only, prs_only, cur_srs_only, srs_only, event_id
export interface Filters {
	cur_prs_only: boolean;
	prs_only: boolean;
	cur_srs_only: boolean;
	srs_only: boolean;
	event_id: number | null;
	meet_id: number | null;
	swimmer_id: number | null;
	relay_id: number | null;
	fts_only: boolean;
}

export function is_filtered(filters: Filters) {
	return (
		filters.cur_prs_only ||
		filters.prs_only ||
		filters.cur_srs_only ||
		filters.srs_only ||
		filters.event_id !== null ||
		filters.meet_id !== null ||
		filters.swimmer_id !== null ||
		filters.relay_id !== null
	);
}

export function useSearchParamHandler() {
	const [searchParams, setSearchParams] = useSearchParams();

	const filters = useMemo(() => {
		return {
			cur_prs_only: searchParams.get("cur_prs_only") === "true",
			prs_only: searchParams.get("prs_only") === "true",
			cur_srs_only: searchParams.get("cur_srs_only") === "true",
			srs_only: searchParams.get("srs_only") === "true",
			event_id: searchParams.get("event_id") ? Number(searchParams.get("event_id")) : null,
			meet_id: searchParams.get("meet_id") ? Number(searchParams.get("meet_id")) : null,
			swimmer_id: searchParams.get("swimmer_id") ? Number(searchParams.get("swimmer_id")) : null,
			relay_id: searchParams.get("relay_id") ? Number(searchParams.get("relay_id")) : null,
			fts_only: searchParams.get("fts_only") === "true",
		};
	}, [searchParams]);

	return { filters, setSearchParams };
}

export type SearchParamHandler = ReturnType<typeof useSearchParamHandler>;
