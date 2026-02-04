import { Result } from "neverthrow";

export function formatDate(seconds: number): Result<number, Error> {
	if (!seconds) return "";
	const d = new Date(seconds * 1000);
	return Intl.DateTimeFormat("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
		timeZone: "UTC"
	}).format(d);
}

export function readCSV(file: File): Promise<string[][]> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();

		reader.onload = () => {
			const result = reader.result;
			if (result == null || typeof result !== "string") {
				reject(new Error("Failed to read file"));
				return;
			}
			const rows = result
				.trim()
				.split(/\r?\n/)
				.map((r) => r.split(","));
			resolve(rows);
		};

		reader.onerror = reject;
		reader.readAsText(file);
	});
}

export function formatTime(seconds_t: number | null): string {
	if (seconds_t == null || isNaN(seconds_t)) return "";
	let seconds = Number(seconds_t);
	const mins = Math.floor(seconds / 60);
	const secs = (seconds % 60).toFixed(2).padStart(5, "0");
	return mins > 0 ? `${mins}:${secs}` : secs + "s";
}
