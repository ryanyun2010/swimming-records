import { JSX } from "react";
import { SearchParamHandler } from "../hooks/useSearchParamHandler";
import { formatDate } from "../lib/utils";
import { SwimData } from "../hooks/useSwimData";
import { RelayHelpers } from "../hooks/useRelayHelpers";

type HeaderProps = {
	searchParamHandler: SearchParamHandler;
	data: SwimData;
	relayHelpers: RelayHelpers;
};
export function Header({ searchParamHandler, data, relayHelpers }: HeaderProps): JSX.Element {
	const { filters, setSearchParams } = searchParamHandler;
	let elements: JSX.Element[] = [];
	if (filters.relay_id != null) {
		if (data.relays[filters.relay_id] != null) {
			const event_name = data.events[data.relays[filters.relay_id].event_id]?.name || "Unknown Event";
			const swimmer_names = relayHelpers
			.getRelayLegsForRelay(filters.relay_id)
			.unwrapOr([])
			.map((leg) => {
				const swimmer_id = leg.swimmer_id;
				const swimmer = data.swimmers[swimmer_id];
				return swimmer ? `${swimmer.first_name} ${swimmer.last_name}` : "Unknown Swimmer";
			});
			const relay_date = data.meets[data.relays[filters.relay_id].meet_id]?.date || "Unknown Date";
			elements.push(
				<li>
				Relay {event_name} | {swimmer_names.join(", ")} | {formatDate(relay_date)} Only{" "}
				<span
				className="remove_filter"
				onClick={() =>
					setSearchParams((prev) => {
						prev.delete("relay_id");
						return prev;
					})
				}
				>
				X
				</span>
				</li>,
			);
		}
	}
	if (filters.meet_id != null) {
		const meet = data.meets[filters.meet_id];
		if (meet) {
			elements.push(
				<li>
					{" "}
					Meet {meet.name} | {formatDate(meet.date)} Only{" "}
					<span
						className="remove_filter"
						onClick={() =>
							setSearchParams((prev) => {
								prev.delete("meet_id");
								return prev;
							})
						}
					>
						X
					</span>
				</li>,
			);
		}
	}
	if (filters.event_id != null) {
		const event = data.events[filters.event_id];
		if (event) {
			elements.push(
				<li>
					Event {event.name} Only{" "}
					<span
						className="remove_filter"
						onClick={() =>
							setSearchParams((prev) => {
								prev.delete("event_id");
								return prev;
							})
						}
					>
						X
					</span>
				</li>,
			);
		}
	}
	if (filters.swimmer_id != null) {
		const swimmer = data.swimmers[filters.swimmer_id];
		if (swimmer) {
			elements.push(
				<li>
					Including Swimmer {swimmer.first_name} {swimmer.last_name} Only{" "}
					<span
						className="remove_filter"
						onClick={() =>
							setSearchParams((prev) => {
								prev.delete("swimmer_id");
								return prev;
							})
						}
					>
						X
					</span>
				</li>,
			);
		}
	}
	if (filters.cur_prs_only)
		elements.push(
			<li>
				Current Personal Recordss Only{" "}
				<span
					className="remove_filter"
					onClick={() =>
						setSearchParams((prev) => {
							prev.delete("cur_prs_only");
							return prev;
						})
					}
				>
					X
				</span>
			</li>,
		);
	if (filters.prs_only)
		elements.push(
			<li>
				Personal Records Only{" "}
				<span
					className="remove_filter"
					onClick={() =>
						setSearchParams((prev) => {
							prev.delete("prs_only");
							return prev;
						})
					}
				>
					X
				</span>{" "}
			</li>,
		);
	if (filters.cur_srs_only)
		elements.push(
			<li>
				Current School Records Only{" "}
				<span
					className="remove_filter"
					onClick={() =>
						setSearchParams((prev) => {
							prev.delete("cur_srs_only");
							return prev;
						})
					}
				>
					X
				</span>
			</li>,
		);
	if (filters.srs_only)
		elements.push(
			<li>
				School Records Only{" "}
				<span
					className="remove_filter"
					onClick={() =>
						setSearchParams((prev) => {
							prev.delete("srs_only");
							return prev;
						})
					}
				>
					X
				</span>
			</li>,
		);
	if (filters.fts_only)
		elements.push(
			<li>
				First Time Swims Only{" "}
				<span
					className="remove_filter"
					onClick={() =>
						setSearchParams((prev) => {
							prev.delete("fts_only");
							return prev;
						})
					}
				>
					X
				</span>
			</li>,
		);

	if (filters.no_fts)
		elements.push(
			<li>
				No first time swims{" "}
				<span
					className="remove_filter"
					onClick={() =>
						setSearchParams((prev) => {
							prev.delete("no_fts");
							return prev;
						})
					}
				>
					X
				</span>
			</li>,
		);

	return (
		<>
			<h2>Results Limited to: </h2>
			{elements.length > 0 && <ol>{elements}</ol>}
			{filters.note_legs ?
				<span onClick={() =>
					setSearchParams((prev) => {
						prev.delete("note_legs");
						return prev;
					})
				}
				style={{ display: "block", marginTop: "1rem", cursor: "pointer", color: "var(--accent)" }}
				>Currently filtered by flat start and relay start, click to switch to filtering by individual and relay leg.</span>
				: <span onClick={() =>
					setSearchParams((prev) => {
						prev.set("note_legs", "true");
						return prev;
					})
				}
				style={{ display: "block", marginTop: "1rem", cursor: "pointer", color: "var(--accent)" }}
				>Currently filtered by individual and relay leg, click to switch to filtering by flat start and relay start.</span>}
		</>
	);
}
