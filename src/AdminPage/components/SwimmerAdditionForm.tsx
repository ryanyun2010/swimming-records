import { FormEvent, useCallback } from "react";
import { useDatabaseHandler } from "../hooks/useDatabaseHandler";

type SwimmerAdditionFormProps = {
	databaseHandler: ReturnType<typeof useDatabaseHandler>;
};

export function SwimmerAdditionForm({ databaseHandler }: SwimmerAdditionFormProps) {
	const onSubmit = useCallback(
		(e: FormEvent<HTMLFormElement>) => {
			e.preventDefault();
			const form = e.currentTarget;
			const f = new FormData(form);
			const firstName = String(f.get("first_name") ?? "").trim();
			const lastName = String(f.get("last_name") ?? "").trim();
			const gender = String(f.get("gender") ?? "").trim();
			const graduatingRaw = String(f.get("graduating") ?? "").trim();
			const graduating = Number(graduatingRaw);

			if (!firstName || !lastName || !gender || !graduatingRaw || Number.isNaN(graduating)) {
				alert("Please fill out all swimmer fields.");
				return;
			}

			databaseHandler.addSwimmer(firstName, lastName, gender, graduating).match(
				() => {
					alert("Swimmer added");
					form.reset();
				},
				(err) => {
					alert("Failed to add swimmer, see console for details.");
					console.error("Failed to add swimmer:", err);
				},
			);
		},
		[databaseHandler],
	);

	return (
		<section>
			<h2>Add Swimmer</h2>
			<form onSubmit={onSubmit}>
				<input name="first_name" placeholder="First name" required />
				<input name="last_name" placeholder="Last name" required />
				<select name="gender" required>
					<option value="">Gender</option>
					<option value="male">Male</option>
					<option value="female">Female</option>
				</select>
				<input name="graduating" placeholder="Graduating year" type="number" step="1" required />
				<button type="submit">Add Swimmer</button>
			</form>
		</section>
	);
}
