import { SEvent } from "../lib/defs";
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
	if (s === "im" || s === "individualmedley" || s === "medley") return "medley";
	if (s === "medleyrelay") return "medley";
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
	const match = nameWithGrad.replace('"', "").match(/(.+?)\s+'(\d{2})$/);
	if (!match) return null;
	const namePart = match[1].trim();
	const gradSuffix = Number(match[2]);
	if (!Number.isFinite(gradSuffix)) return null;

	const pieces = namePart.split(/\s+/);
	if (pieces.length < 2) return null;
	const firstNameRaw = pieces[0];
	const lastNameRaw = pieces.slice(1).join(" ");
	console.log("Parsed name:", { firstNameRaw, lastNameRaw, gradSuffix });
	const firstNameNorm = normalizeName(firstNameRaw);
	const lastNameNorm = normalizeName(lastNameRaw);
	console.log("Normalized name:", { firstNameNorm, lastNameNorm });
	const candidates = swimmers.filter((s) => {
		console.log("Checking swimmer, " + s.first_name + " " + s.last_name + ", grad " + s.graduating);
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

export function findEventIdByLabel(events: SEvent[], label: string, male: boolean): number | null {
	let target = normalizeName(label.replace(/\(.*\)/g, "").trim());
	if (target == "50free" || target == "100free" || target == "200free" || target == "500free") {
		target = target.replace("free", "freestyle");
	}
	if (target == "50fly" || target == "100fly") {
		target = target.replace("fly", "butterfly");
	}
	if (target == "50breast" || target == "100breast") {
		target = target.replace("breast", "breaststroke");
	}
	if (target == "50back" || target == "100back") {
		target = target.replace("back", "backstroke");
	}
	if (target == "100im" || target == "200im") {
		target = target.replace("im", "individualmedley");
	}
	if (male) {
		target = "boys" + target;
	} else {
		target = "girls" + target;
	}
	const matches = events.filter((e) => {
		const full = normalizeName(e.name);
		return full == target;
	});
	return matches.length === 1 ? matches[0].id : null;
}

export function findEventIdBySpec(events: SEvent[], distance: number, stroke: string, male: boolean): number | null {
	const targetStroke = normalizeStroke(stroke);
	const matches = events.filter(
		(e) => e.distance === distance && normalizeStroke(e.stroke) === targetStroke && e.is_male == male,
	);
	return matches.length === 1 ? matches[0].id : null;
}
