export function formatEventLabel(event) {
	const MAP = {
		"50_free": "50 Free",
		"50_back": "50 Back",
		"50_breast": "50 Breast",
		"50_fly": "50 Fly",
		"100_free": "100 Free",
		"100_back": "100 Back",
		"100_breast": "100 Breast",
		"100_fly": "100 Fly",
		"200_free": "200 Free",
		"200_im": "200 IM",
		"500_free": "500 Free"
	};
	return MAP[event] ?? event;
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
