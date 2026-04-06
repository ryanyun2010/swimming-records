import { FormEvent, useCallback } from "react";
import { useDatabaseHandler } from "../hooks/useDatabaseHandler";

type MeetAdditionFormProps = {
	databaseHandler: ReturnType<typeof useDatabaseHandler>;
};

export function MeetAdditionForm({ databaseHandler }: MeetAdditionFormProps) {
	const onSubmit = useCallback(
		(e: FormEvent<HTMLFormElement>) => {
			e.preventDefault();
			const form = e.currentTarget;
			const f = new FormData(form);
			const name = String(f.get("name") ?? "").trim();
			const location = String(f.get("location") ?? "").trim();
			const date = String(f.get("date") ?? "").trim();

			if (!name || !location || !date) {
				alert("Please fill out all meet fields.");
				return;
			}

			databaseHandler.addMeet(name, location, date).match(
				() => {
					alert("Meet added");
					form.reset();
				},
				(err) => {
					alert("Failed to add meet, see console for details.");
					console.error("Failed to add meet:", err);
				},
			);
		},
		[databaseHandler],
	);

	return (
		<section className="accent-card admin-card">
			<h3 className="admin-card-title">Add Meet</h3>
			<form onSubmit={onSubmit} className="admin-form">
				<div className="admin-form-grid">
					<input name="name" placeholder="Meet name" required />
					<input name="location" placeholder="Location" required />
					<input name="date" type="date" required />
				</div>
				<button type="submit" className="admin-button">
					Add Meet
				</button>
			</form>
		</section>
	);
}
