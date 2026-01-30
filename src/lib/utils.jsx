export const EVENTS = [
	{ value: "50_free", label: "50 Free", alternates: [] },
	{ value: "50_back", label: "50 Back", alternates: [] },
	{ value: "50_breast", label: "50 Breast", alternates: [] },
	{ value: "50_fly", label: "50 Fly", alternates: ["50 Butterfly"] },
	{ value: "100_free", label: "100 Free", alternates: [] },
	{ value: "100_back", label: "100 Back", alternates: [] },
	{ value: "100_breast", label: "100 Breast", alternates: [] },
	{ value: "100_fly", label: "100 Fly", alternates: ["100 Butterfly"] },
	{ value: "200_free", label: "200 Free", alternates: [] },
	{ value: "200_im", label: "200 IM", alternates: ["200 Individual Medley"] },
	{ value: "500_free", label: "500 Free", alternates: [] },
];
export function formatEventLabel(event) {
	for (const evt of EVENTS) {
		if (evt.value == event) {
			return evt.label;
		}
	}
	return event;
}

export function checkIfValidEvent(event) {
	for (const evt of EVENTS) {
		if (evt.value == event) {
			return true;
		}
	}
	return false;
}

export function findEventLabel(event) {
	for (const evt of EVENTS) {
		if (event.includes(evt.label) || evt.alternates.some(alt => event.includes(alt))) {
			return evt.value;
		}
	}
	return null;
}

export function formatDate(seconds) {
	if (!seconds) return "";
	const d = new Date(seconds * 1000);
	return Intl.DateTimeFormat("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
		timeZone: "UTC"
	}).format(d);
}

export function readCSV(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const rows = reader.result
        .trim()
        .split(/\r?\n/)
        .map(r => r.split(","));
      resolve(rows);
    };

    reader.onerror = reject;
    reader.readAsText(file);
  });
}

export function formatTime(seconds_t) {
	if (seconds_t == null || isNaN(seconds_t)) return "";
	let seconds = Number(seconds_t);
	const mins = Math.floor(seconds / 60);
	const secs = (seconds % 60).toFixed(2).padStart(5, "0");
	return mins > 0 ? `${mins}:${secs}` : secs+"s";
}
