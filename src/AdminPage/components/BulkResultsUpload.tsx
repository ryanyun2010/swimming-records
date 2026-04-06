import { FormEvent, useCallback } from "react";
import { ResultAsync, errAsync } from "neverthrow";
import { readCSV } from "../../lib/utils";
import * as Errors from "../../lib/errors";
import { useDatabaseHandler } from "../hooks/useDatabaseHandler";
import {
	parseTimeToSeconds,
	findSwimmerIdByCsvName,
	findMeetIdByName,
	findEventIdByLabel,
	findEventIdBySpec,
	parseLegacyEventLabel,
} from "../utils";
import { SwimData } from "../../hooks/useSwimData";

type BulkResultsUploadProps = {
	data: SwimData;
	databaseHandler: ReturnType<typeof useDatabaseHandler>;
};

type ParsedResultRow = {
	swimmer_id: number;
	meet_id: number;
	event_id: number;
	type: string;
	time: number;
	is_valid: boolean;
	invalid_reason: string | null;
};

type ParsedRelayRow = {
	swimmer_ids: number[];
	meet_id: number;
	relay_type: string;
	time: number;
	is_valid: boolean;
	invalid_reason: string | null;
};

type RelayLegSplit = {
	swimmer_id: number;
	meet_id: number;
	event_id: number;
	time: number;
	is_valid: boolean;
	invalid_reason: string | null;
};

function normalizeRelayType(value: string): string {
	const v = value.toLowerCase().replace(/\s+/g, "");
	if (v === "200mr" || v === "200medleyrelay" || v === "200medley") return "200_mr";
	if (v === "200fr" || v === "200freerelay" || v === "200freestyle") return "200_fr";
	if (v === "400fr" || v === "400freerelay" || v === "400freestyle") return "400_fr";
	return value;
}

export function BulkResultsUpload({ data, databaseHandler }: BulkResultsUploadProps) {
	const onSubmit = useCallback(
		(e: FormEvent<HTMLFormElement>) => {
			e.preventDefault();
			const form = e.currentTarget;
			const f = new FormData(form);
			const file = f.get("file");
			if (!(file instanceof File)) {
				alert("Please select a CSV file.");
				return;
			}

			readCSV(file)
				.andThen((rows) => {
					if (rows.length < 2) {
						return errAsync(new Errors.MalformedResponse("CSV must include a header and at least one row."));
					}

					const swimmers = Object.values(data.swimmers);
					const meets = Object.values(data.meets);
					const events = Object.values(data.events);

					const resultRows: ParsedResultRow[] = [];
					const relayRows: ParsedRelayRow[] = [];

					for (let i = 1; i < rows.length; i++) {
						const row = rows[i].map((cell) => cell.trim());
						console.log("currentRow: ", row);
						const line = i + 1;

						if (row.length < 7) {
							return errAsync(
								new Errors.MalformedResponse(`Row ${line} has insufficient columns: ${row.join(",")}`),
							);
						}
						if (row.length === 8 || row.length > 9) {
							return errAsync(
								new Errors.MalformedResponse(`Row ${line} has invalid number of columns: ${row.join(",")}`),
							);
						}

						if (row.length === 7 || row.length === 9) {
							const swimmerNames = row.slice(0, 4);
							const meetName = row[4];
							const relayType = normalizeRelayType(row[5]);
							const timeRaw = row[6];
							const relaySeconds = parseTimeToSeconds(timeRaw);
							if (relaySeconds == null) {
								return errAsync(
									new Errors.MalformedResponse(`Row ${line} has invalid relay time: ${timeRaw}`),
								);
							}
							const swimmerIds = swimmerNames.map((name) => findSwimmerIdByCsvName(swimmers, name));
							if (swimmerIds.some((id) => id == null)) {
								return errAsync(
									new Errors.MalformedResponse(
										`Row ${line} relay swimmer not found: ${swimmerNames.join(", ")}`,
									),
								);
							}
							const meetId = findMeetIdByName(meets, meetName);
							if (meetId == null) {
								return errAsync(
									new Errors.MalformedResponse(`Row ${line} meet not found: ${meetName}`),
								);
							}
							const relayValidRaw = row.length === 9 ? row[7] : "";
							const relayValid =
								row.length === 9 ? relayValidRaw.trim().toLowerCase() !== "invalid" : true;
							const relayInvalidReason = row.length === 9 ? row[8].trim() || null : null;
							relayRows.push({
								swimmer_ids: swimmerIds as number[],
								meet_id: meetId,
								relay_type: relayType,
								time: relaySeconds,
								is_valid: relayValid,
								invalid_reason: relayInvalidReason,
							});
							continue;
						}

						const swimmerName = row[0];
						const meetName = row[1];
						const eventLabel = row[2];
						const type = row[3].toLowerCase();
						const timeRaw = row[4];
						const validRaw = row[5] ?? "";
						const invalidReason = (row[6] ?? "").trim() || null;
						const timeSeconds = parseTimeToSeconds(timeRaw);
						if (timeSeconds == null) {
							return errAsync(
								new Errors.MalformedResponse(`Row ${line} has invalid time: ${timeRaw}`),
							);
						}
						const swimmerId = findSwimmerIdByCsvName(swimmers, swimmerName);
						if (swimmerId == null) {
							return errAsync(
								new Errors.MalformedResponse(
									`Row ${line} swimmer not found or graduating year mismatch: ${swimmerName}`,
								),
							);
						}
						const meetId = findMeetIdByName(meets, meetName);
						if (meetId == null) {
							return errAsync(
								new Errors.MalformedResponse(`Row ${line} meet not found: ${meetName}`),
							);
						}
						let eventId = findEventIdByLabel(events, eventLabel);
						if (eventId == null) {
							const parsed = parseLegacyEventLabel(eventLabel);
							if (parsed.distance != null && parsed.stroke != null) {
								eventId = findEventIdBySpec(events, parsed.distance, parsed.stroke);
							}
						}
						if (eventId == null) {
							return errAsync(
								new Errors.MalformedResponse(`Row ${line} event not found: ${eventLabel}`),
							);
						}

						resultRows.push({
							swimmer_id: swimmerId,
							meet_id: meetId,
							event_id: eventId,
							type,
							time: timeSeconds,
							is_valid: validRaw.trim().toLowerCase() !== "invalid",
							invalid_reason: invalidReason,
						});
					}

					const relaySplits: RelayLegSplit[] = resultRows
						.filter((r) => r.type === "relay")
						.map((r) => ({
							swimmer_id: r.swimmer_id,
							meet_id: r.meet_id,
							event_id: r.event_id,
							time: r.time,
							is_valid: r.is_valid,
							invalid_reason: r.invalid_reason,
						}));
					const individualRows = resultRows.filter((r) => r.type !== "relay");

					const addIndividuals = ResultAsync.combine(
						individualRows.map((row) =>
							databaseHandler.addResult(
								row.swimmer_id,
								row.event_id,
								row.meet_id,
								row.time,
								row.is_valid,
								row.invalid_reason,
							),
						),
					).map(() => null);

					return addIndividuals.andThen(() => {
						const relayTasks = relayRows.map((relay) => {
							const swimmersForRelay = relay.swimmer_ids
								.map((id) => data.swimmers[id])
								.filter(Boolean);
							if (swimmersForRelay.length !== 4) {
								return errAsync(
									new Errors.MalformedResponse(
										`Relay swimmer mismatch for meet ${relay.meet_id} (${relay.relay_type})`,
									),
								);
							}
							let relayEventId: number | null = null;
							let legSpecs: { distance: number; stroke: string }[] = [];
							if (relay.relay_type === "200_mr") {
								relayEventId =
									findEventIdByLabel(events, "200 medley relay") ??
									findEventIdBySpec(events, 200, "medley");
								legSpecs = [
									{ distance: 50, stroke: "back" },
									{ distance: 50, stroke: "breast" },
									{ distance: 50, stroke: "fly" },
									{ distance: 50, stroke: "free" },
								];
							} else if (relay.relay_type === "200_fr") {
								relayEventId =
									findEventIdByLabel(events, "200 freestyle relay") ??
									findEventIdBySpec(events, 200, "freestyle");
								legSpecs = [
									{ distance: 50, stroke: "free" },
									{ distance: 50, stroke: "free" },
									{ distance: 50, stroke: "free" },
									{ distance: 50, stroke: "free" },
								];
							} else if (relay.relay_type === "400_fr") {
								relayEventId =
									findEventIdByLabel(events, "400 freestyle relay") ??
									findEventIdBySpec(events, 400, "freestyle");
								legSpecs = [
									{ distance: 100, stroke: "free" },
									{ distance: 100, stroke: "free" },
									{ distance: 100, stroke: "free" },
									{ distance: 100, stroke: "free" },
								];
							} else {
								return errAsync(
									new Errors.MalformedResponse(`Unknown relay type: ${relay.relay_type}`),
								);
							}

							if (relayEventId == null) {
								return errAsync(
									new Errors.MalformedResponse(
										`Relay event not found for type ${relay.relay_type}`,
									),
								);
							}

							const legEventIds = legSpecs.map((spec) =>
								findEventIdBySpec(events, spec.distance, spec.stroke),
							);
							if (legEventIds.some((id) => id == null)) {
								return errAsync(
									new Errors.MalformedResponse(
										`Relay leg events missing for type ${relay.relay_type}`,
									),
								);
							}

							return databaseHandler
								.addRelay(relayEventId, relay.meet_id, relay.time, relay.is_valid, relay.invalid_reason)
								.andThen((relayId) => {
									const legRequests = relay.swimmer_ids.map((swimmerId, idx) => {
										const legEventId = legEventIds[idx] as number;
										const splitIndex = relaySplits.findIndex(
											(s) =>
												s.swimmer_id === swimmerId &&
												s.meet_id === relay.meet_id &&
												s.event_id === legEventId,
										);
										if (splitIndex === -1) {
											return errAsync(
												new Errors.MalformedResponse(
													`Missing relay split for swimmer ${swimmerId} in relay ${relay.relay_type}`,
												),
											);
										}
										const split = relaySplits.splice(splitIndex, 1)[0];
										return databaseHandler.addRelayLeg(
											relayId,
											split.swimmer_id,
											split.event_id,
											split.time,
											split.is_valid,
											split.invalid_reason,
											idx + 1,
										);
									});
									return ResultAsync.combine(legRequests).map(() => null);
								});
						});
						return ResultAsync.combine(relayTasks).map(() => null);
					});
				})
				.match(
					() => {
						alert("Bulk results upload complete.");
						form.reset();
					},
					(err) => {
						alert("Bulk upload failed, see console for details.");
						console.error("Bulk upload failed:", err);
					},
				);
		},
		[databaseHandler, data.events, data.meets, data.swimmers],
	);

	return (
		<section className="accent-card admin-card">
			<h3 className="admin-card-title">Add Results (CSV)</h3>
			<p className="admin-help">
				Legacy CSV format (header + rows). Non-relay rows use columns 5-7 for time, validity, and
				invalid reason. Relay rows use columns 7-9 for time, validity, and invalid reason.
			</p>
			<form onSubmit={onSubmit} className="admin-form">
				<div className="admin-form-grid">
					<input name="file" accept=".csv" type="file" />
				</div>
				<button type="submit" className="admin-button">
					Upload CSV
				</button>
			</form>
		</section>
	);
}
