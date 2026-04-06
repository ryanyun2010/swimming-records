export function parseTimeToSeconds(raw: string): number | null {
	const trimmed = raw.trim();
	if (!trimmed) return null;
	if (/^\d+(\.\d+)?$/.test(trimmed)) {
		const asNum = Number(trimmed);
		return Number.isFinite(asNum) ? asNum : null;
	}
	const parts = trimmed.split(":");
	if (parts.length < 2 || parts.length > 3) return null;
	const nums = parts.map((p) => Number(p));
	if (nums.some((n) => !Number.isFinite(n))) return null;
	if (parts.length === 2) {
		const [minutes, seconds] = nums;
		return minutes * 60 + seconds;
	}
	const [hours, minutes, seconds] = nums;
	return hours * 3600 + minutes * 60 + seconds;
}

function normalizeName(value: string): string {
	return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function normalizeStroke(stroke: string): string {
	const s = stroke.toLowerCase();
	if (s === "free" || s === "freestyle") return "freestyle";
	if (s === "fly" || s === "butterfly") return "fly";
	if (s === "back" || s === "backstroke") return "back";
	if (s === "breast" || s === "breaststroke") return "breast";
	return s;
}

export function findSwimmerIdByName(
	swimmers: { id: number; first_name: string; last_name: string }[],
	name: string,
): number | null {
	const target = normalizeName(name);
	const matches = swimmers.filter((s) => {
		const full = normalizeName(`${s.first_name} ${s.last_name}`);
		return full.includes(target) || target.includes(full);
	});
	return matches.length === 1 ? matches[0].id : null;
}

export function findSwimmerIdByCsvName(
	swimmers: { id: number; first_name: string; last_name: string; graduating: number }[],
	nameWithGrad: string,
): number | null {
	const match = nameWithGrad.match(/(.+?)\s+'(\d{2})$/);
	if (!match) return null;
	const namePart = match[1].trim();
	const gradSuffix = Number(match[2]);
	if (!Number.isFinite(gradSuffix)) return null;

	const pieces = namePart.split(/\s+/);
	if (pieces.length < 2) return null;
	const firstNameRaw = pieces[0];
	const lastNameRaw = pieces.slice(1).join(" ");
	const firstNameNorm = normalizeName(firstNameRaw);
	const lastNameNorm = normalizeName(lastNameRaw);
	const candidates = swimmers.filter((s) => {
		const grad = s.graduating % 100;
		return (
			grad === gradSuffix &&
			normalizeName(s.first_name) === firstNameNorm &&
			normalizeName(s.last_name) === lastNameNorm
		);
	});
	return candidates.length === 1 ? candidates[0].id : null;
}

export function findMeetIdByName(meets: { id: number; name: string }[], name: string): number | null {
	const target = normalizeName(name);
	const matches = meets.filter((m) => {
		const full = normalizeName(m.name);
		return full.includes(target) || target.includes(full);
	});
	return matches.length === 1 ? matches[0].id : null;
}

export function findEventIdByLabel(
	events: { id: number; name: string }[],
	label: string,
): number | null {
	const target = normalizeName(label.replace(/\(.*\)/g, "").trim());
	const matches = events.filter((e) => {
		const full = normalizeName(e.name);
		return full.includes(target) || target.includes(full);
	});
	return matches.length === 1 ? matches[0].id : null;
}

export function parseLegacyEventLabel(label: string): {
	distance: number | null;
	stroke: string | null;
	relayTag: "200_mr" | "200_fr" | "400_fr" | null;
} {
	const relayTagMatch = label.match(/\(([^)]+)\)/);
	const relayTagRaw = relayTagMatch ? relayTagMatch[1].toLowerCase() : "";
	let relayTag: "200_mr" | "200_fr" | "400_fr" | null = null;
	if (relayTagRaw.includes("200") && relayTagRaw.includes("mr")) relayTag = "200_mr";
	if (relayTagRaw.includes("200") && relayTagRaw.includes("fr")) relayTag = "200_fr";
	if (relayTagRaw.includes("400") && relayTagRaw.includes("fr")) relayTag = "400_fr";

	const cleaned = label.replace(/\(.*\)/g, "").trim();
	const parts = cleaned.split(/\s+/);
	if (parts.length < 2) return { distance: null, stroke: null, relayTag };
	const distance = Number(parts[0]);
	if (!Number.isFinite(distance)) return { distance: null, stroke: null, relayTag };
	const stroke = normalizeStroke(parts.slice(1).join(" "));
	return { distance, stroke, relayTag };
}

export function findEventIdBySpec(
	events: { id: number; distance: number; stroke: string; gender: string }[],
	distance: number,
	stroke: string,
	gender: string,
): number | null {
	const targetStroke = normalizeStroke(stroke);
	const targetGender = gender.toLowerCase();
	const matches = events.filter(
		(e) =>
			e.distance === distance &&
			normalizeStroke(e.stroke) === targetStroke &&
			e.gender.toLowerCase() === targetGender,
	);
	return matches.length === 1 ? matches[0].id : null;
}
