import { FormEvent, useCallback, useMemo, useState } from "react";
import { ResultAsync } from "neverthrow";
import { SwimData } from "../../hooks/useSwimData";
import { useDatabaseHandler } from "../hooks/useDatabaseHandler";
import { normalizeStroke, parseTimeToSeconds } from "../utils";

type RelayAdditionFormProps = {
	data: SwimData;
	databaseHandler: ReturnType<typeof useDatabaseHandler>;
};

type LegData = {
	swimmer_id: number;
	event_id: number;
	time_ms: number;
	is_valid: boolean;
	invalid_reason: string | null;
	leg_order: number;
};

export function RelayAdditionForm({ data, databaseHandler }: RelayAdditionFormProps) {
	const swimmers = useMemo(
		() => Object.values(data.swimmers).sort((a, b) => a.last_name.localeCompare(b.last_name)),
		[data.swimmers],
	);
	const meets = useMemo(
		() => Object.values(data.meets).sort((a, b) => a.date.localeCompare(b.date)),
		[data.meets],
	);
	const events = useMemo(
		() => Object.values(data.events).sort((a, b) => a.name.localeCompare(b.name)),
		[data.events],
	);
	const relayEvents = useMemo(() => events.filter((e) => e.is_relay), [events]);
	const [selectedRelayEventId, setSelectedRelayEventId] = useState<number | null>(null);
	const selectedRelayEvent = relayEvents.find((e) => e.id === selectedRelayEventId) ?? null;
	const [relayIsValid, setRelayIsValid] = useState(true);
	const [legValidity, setLegValidity] = useState<Record<number, boolean>>({
		1: true,
		2: true,
		3: true,
		4: true,
	});

	const legEventOptions = useMemo(() => {
		const nonRelayEvents = events.filter((e) => !e.is_relay);
		if (!selectedRelayEvent) return nonRelayEvents;
		const stroke = normalizeStroke(selectedRelayEvent.stroke);
		if (stroke.includes("medley")) {
			return nonRelayEvents.filter(
				(e) =>
					e.distance === 50 &&
					["back", "breast", "fly", "freestyle"].includes(normalizeStroke(e.stroke)),
			);
		}
		if (stroke.includes("freestyle")) {
			const legDistance = selectedRelayEvent.distance === 400 ? 100 : 50;
			return nonRelayEvents.filter(
				(e) => e.distance === legDistance && normalizeStroke(e.stroke) === "freestyle",
			);
		}
		return nonRelayEvents;
	}, [events, selectedRelayEvent]);

	const fixedLegEventIds = useMemo(() => {
		if (!selectedRelayEvent) return [null, null, null, null];
		const stroke = normalizeStroke(selectedRelayEvent.stroke);
		if (stroke.includes("medley")) {
			return [
				legEventOptions.find((e) => normalizeStroke(e.stroke) === "back" && e.distance === 50)?.id ?? null,
				legEventOptions.find((e) => normalizeStroke(e.stroke) === "breast" && e.distance === 50)?.id ?? null,
				legEventOptions.find((e) => normalizeStroke(e.stroke) === "fly" && e.distance === 50)?.id ?? null,
				legEventOptions.find((e) => normalizeStroke(e.stroke) === "freestyle" && e.distance === 50)?.id ?? null,
			];
		}
		if (stroke.includes("freestyle")) {
			const legDistance = selectedRelayEvent.distance === 400 ? 100 : 50;
			const freeId =
				legEventOptions.find(
					(e) => normalizeStroke(e.stroke) === "freestyle" && e.distance === legDistance,
				)?.id ?? null;
			return [freeId, freeId, freeId, freeId];
		}
		return [null, null, null, null];
	}, [legEventOptions, selectedRelayEvent]);

	const onSubmit = useCallback(
		(e: FormEvent<HTMLFormElement>) => {
			e.preventDefault();
			const form = e.currentTarget;
			const f = new FormData(form);
			const meetId = Number(f.get("meet_id"));
			const eventId = Number(f.get("event_id"));
			const timeRaw = String(f.get("time") ?? "");
			const relaySeconds = parseTimeToSeconds(timeRaw);
			const isValid = f.get("is_valid") === "on";
			const invalidReason = String(f.get("invalid_reason") ?? "").trim() || null;

			if (!meetId || !eventId || relaySeconds == null) {
				alert("Please select meet, relay event, and enter a valid time.");
				return;
			}

			const legs: LegData[] = [];
			for (let i = 1; i <= 4; i++) {
				const swimmerId = Number(f.get(`leg_${i}_swimmer_id`));
				const legEventId = Number(f.get(`leg_${i}_event_id`));
				const legTimeRaw = String(f.get(`leg_${i}_time`) ?? "");
				const legSeconds = parseTimeToSeconds(legTimeRaw);
				const legValid = f.get(`leg_${i}_is_valid`) === "on";
				const legInvalidReason = String(f.get(`leg_${i}_invalid_reason`) ?? "").trim() || null;

				if (!swimmerId || !legEventId || legSeconds == null) {
					alert(`Please fill out all fields for leg ${i}.`);
					return;
				}

				legs.push({
					swimmer_id: swimmerId,
					event_id: legEventId,
					time_ms: legSeconds,
					is_valid: legValid,
					invalid_reason: legInvalidReason,
					leg_order: i,
				});
			}

			databaseHandler
				.addRelay(eventId, meetId, relaySeconds, isValid, invalidReason)
				.andThen((relayId) => {
					const legRequests = legs.map((leg) =>
						databaseHandler.addRelayLeg(
							relayId,
							leg.swimmer_id,
							leg.event_id,
							leg.time_ms,
							leg.is_valid,
							leg.invalid_reason,
							leg.leg_order,
						),
					);
					return ResultAsync.combine(legRequests).map(() => relayId);
				})
				.match(
					() => {
						alert("Relay added");
						form.reset();
					},
					(err) => {
						alert("Failed to add relay, see console for details.");
						console.error("Failed to add relay:", err);
					},
				);
		},
		[databaseHandler],
	);

	return (
		<section className="accent-card admin-card admin-card-wide">
			<h3 className="admin-card-title">Add Relay</h3>
			<form onSubmit={onSubmit} className="admin-form">
				<div className="admin-form-grid">
					<select name="meet_id" required>
						<option value="">Select meet</option>
						{meets.map((m) => (
							<option key={m.id} value={m.id}>
								{m.name} ({m.date})
							</option>
						))}
					</select>

					<select
						name="event_id"
						required
						value={selectedRelayEventId ?? ""}
						onChange={(e) => setSelectedRelayEventId(Number(e.target.value))}
					>
						<option value="">Select relay event</option>
						{relayEvents.map((e) => (
							<option key={e.id} value={e.id}>
								{e.name}
							</option>
						))}
					</select>

					<input name="time" type="text" placeholder="Relay time (seconds or m:ss.xx)" required />
					<label className="admin-checkbox">
						<input
							name="is_valid"
							type="checkbox"
							checked={relayIsValid}
							onChange={(e) => setRelayIsValid(e.target.checked)}
						/>
						Valid
					</label>
					{!relayIsValid ? <input name="invalid_reason" placeholder="Invalid reason" required /> : null}
				</div>

				<div className="admin-subsection">
					<h4>Relay Legs</h4>
					<div className="admin-legs">
						{[1, 2, 3, 4].map((leg) => (
							<div key={leg} className="admin-leg">
								<h5>Leg {leg}</h5>
								<select name={`leg_${leg}_swimmer_id`} required>
									<option value="">Select swimmer</option>
									{swimmers.map((s) => (
										<option key={s.id} value={s.id}>
											{s.first_name} {s.last_name} '{s.graduating % 100}
										</option>
									))}
								</select>
								<select
									name={`leg_${leg}_event_id`}
									required
									disabled
									value={fixedLegEventIds[leg - 1] ?? ""}
								>
									<option value="">
										{selectedRelayEvent ? "Auto-selected from relay" : "Select relay first"}
									</option>
									{legEventOptions.map((e) => (
										<option key={e.id} value={e.id}>
											{e.name}
										</option>
									))}
								</select>
								<input
									type="hidden"
									name={`leg_${leg}_event_id`}
									value={fixedLegEventIds[leg - 1] ?? ""}
								/>
								<input
									name={`leg_${leg}_time`}
									type="text"
									placeholder="Split time (seconds or m:ss.xx)"
									required
								/>
								<label className="admin-checkbox">
									<input
										name={`leg_${leg}_is_valid`}
										type="checkbox"
										checked={legValidity[leg]}
										onChange={(e) =>
											setLegValidity((prev) => ({ ...prev, [leg]: e.target.checked }))
										}
									/>
									Valid
								</label>
								{!legValidity[leg] ? (
									<input name={`leg_${leg}_invalid_reason`} placeholder="Invalid reason" required />
								) : null}
							</div>
						))}
					</div>
				</div>

				<button type="submit" className="admin-button">
					Add Relay
				</button>
			</form>
		</section>
	);
}
