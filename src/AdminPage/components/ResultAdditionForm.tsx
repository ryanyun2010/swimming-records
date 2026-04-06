import { FormEvent, useCallback, useMemo, useState } from "react";
import { SwimData } from "../../hooks/useSwimData";
import { useDatabaseHandler } from "../hooks/useDatabaseHandler";
import { parseTimeToSeconds } from "../utils";

type ResultAdditionFormProps = {
	data: SwimData;
	databaseHandler: ReturnType<typeof useDatabaseHandler>;
};

export function ResultAdditionForm({ data, databaseHandler }: ResultAdditionFormProps) {
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
	const [isValid, setIsValid] = useState(true);

	const onSubmit = useCallback(
		(e: FormEvent<HTMLFormElement>) => {
			e.preventDefault();
			const form = e.currentTarget;
			const f = new FormData(form);
			const swimmerId = Number(f.get("swimmer_id"));
			const meetId = Number(f.get("meet_id"));
			const eventId = Number(f.get("event_id"));
			const timeRaw = String(f.get("time") ?? "");
			const timeSeconds = parseTimeToSeconds(timeRaw);
			const isValid = f.get("is_valid") === "on";
			const invalidReason = String(f.get("invalid_reason") ?? "").trim() || null;

			if (!swimmerId || !meetId || !eventId || timeSeconds == null) {
				alert("Please select swimmer, meet, event, and enter a valid time.");
				return;
			}

			databaseHandler.addResult(swimmerId, eventId, meetId, timeSeconds, isValid, invalidReason).match(
				() => {
					alert("Result added");
					form.reset();
				},
				(err) => {
					alert("Failed to add result, see console for details.");
					console.error("Failed to add result:", err);
				},
			);
		},
		[databaseHandler],
	);

	return (
		<section className="accent-card admin-card">
			<h3 className="admin-card-title">Add Result</h3>
			<form onSubmit={onSubmit} className="admin-form">
				<div className="admin-form-grid">
					<select name="swimmer_id" required>
						<option value="">Select swimmer</option>
						{swimmers.map((s) => (
							<option key={s.id} value={s.id}>
								{s.first_name} {s.last_name} '{s.graduating % 100}
							</option>
						))}
					</select>

					<select name="meet_id" required>
						<option value="">Select meet</option>
						{meets.map((m) => (
							<option key={m.id} value={m.id}>
								{m.name} ({m.date})
							</option>
						))}
					</select>

					<select name="event_id" required>
						<option value="">Select event</option>
						{events.map((e) => (
							<option key={e.id} value={e.id}>
								{e.name}
							</option>
						))}
					</select>

					<input name="time" type="text" placeholder="Time (seconds or m:ss.xx)" required />
					<label className="admin-checkbox">
						<input
							name="is_valid"
							type="checkbox"
							checked={isValid}
							onChange={(e) => setIsValid(e.target.checked)}
						/>
						Valid
					</label>
					{!isValid ? <input name="invalid_reason" placeholder="Invalid reason" required /> : null}
				</div>
				<button type="submit" className="admin-button">
					Add Result
				</button>
			</form>
		</section>
	);
}
