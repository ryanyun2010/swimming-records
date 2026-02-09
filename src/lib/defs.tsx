import { z } from "zod";

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
	{ value: "500_free", label: "500 Free", alternates: [] }
];
type Event = "50_free" | "50_back" | "50_breast" | "50_fly" | "100_free" | "100_back" | "100_breast" | "100_fly" | "200_free" | "200_im" | "500_free";

export const meetSchema = z.object({
	id: z.coerce.number().int(),
	name: z.string().min(1, "Name is required"),
	location: z.string().min(1, "Location is required"),
	date: z.coerce.number().int("Date must be an integer")
});

export const meetsSchema = z.array(meetSchema);

const allowedEvents = ["50_free", "50_back", "50_breast", "50_fly", "100_free", "100_back", "100_breast", "100_fly", "200_free", "200_im", "500_free"] as const;
export const recordSchema = z.object({
		id: z.coerce.number().int(),
		meet_id: z.coerce.number().int(),
		swimmer_id: z.coerce.number().int(),
		event: z.enum(allowedEvents),
		type: z.enum(["individual", "relay"]),
		start: z.enum(["flat", "relay"]),
		time: z.coerce.number().positive()
	});

export const recordsSchema = z.array(recordSchema);

export const swimmerSchema = z.object({
	id: z.coerce.number().int(),
	name: z.string().min(1, "Name is required"),
	graduating_year: z.number().int()
});

export const swimmersSchema = z.array(swimmerSchema);

export const relaySchema = z.object({
	id: z.coerce.number().int(),
	time: z.coerce.number().positive(),
	relay_type: z.enum(["200_mr", "200_fr", "400_fr"]),
	record_1_id: z.coerce.number().int(),
	record_2_id: z.coerce.number().int(),
	record_3_id: z.coerce.number().int(),
	record_4_id: z.coerce.number().int()
});

export const relaysSchema = z.array(relaySchema);

export const timeSchema = z.object({ 
	id: z.coerce.number().int(),
	swimmer_id: z.coerce.number().int(),
	meet_id: z.coerce.number().int(),
	event: z.enum(allowedEvents),
	type: z.enum(["individual", "relay"]),
	time: z.coerce.number().positive(),
	start: z.enum(["flat", "relay"]),
	meet_name: z.string().min(1, "Meet name is required"),
	meet_date: z.coerce.number().int(),
	meet_location: z.string().min(1, "Meet location is required"),
	swimmer_name: z.string().min(1, "Swimmer name is required"),
	swimmer_year: z.coerce.number().int()
});

export const timesSchema = z.array(timeSchema);

export const googleAuthResponseSchema = z.object({
	credential: z.string()
});

export const recordsCSVSchemaNonRelay =	z.tuple([
	z.string().trim().min(1, "Swimmer name is required"),
	z.string().trim().min(1, "Meet name is required"),
	z.string().trim().min(1, "Event name is required"),
	z.string().trim().toLowerCase().transform((val) => {
		if (val == "relay split") { return "relay" } 
		return val;})
		.pipe(z.enum(["individual", "relay"], {
		errorMap: () => ({ message: "Type must be 'individual' or 'relay'" })
	})),
	z.string().trim().toLowerCase().transform((val) => {
		if (val == "fs") {
			return "flat";
		}
		else if (val == "rs") {
			return "relay";
		}
		return val;
	}).pipe(z.enum(["flat", "relay"], {
		errorMap: () => ({
			message: "Start must be 'flat' (or 'fs'), or 'relay' (or 'rs')"
		})
	})),
	z.string().trim().min(1, "Time is required")
]);

export const recordsCSVSchemaRelay = z.tuple([
	z.string().trim().min(1, "Swimmer 1 name is required"),
	z.string().trim().min(1, "Swimmer 2 name is required"),
	z.string().trim().min(1, "Swimmer 3 name is required"),
	z.string().trim().min(1, "Swimmer 4 name is required"),
	z.string().trim().min(1, "Meet name is required"),
	z.string().trim().toLowerCase().transform((val) => {
		if (val == "200 medley relay" || val == "200 mr") {
			return "200_mr";
		} else if (val == "200 freestyle relay" || val == "200 fr") {
			return "200_fr";
		} else if (val == "400 freestyle relay" || val == "400 fr") {
			return "400_fr";
		}
		return val;
	}).pipe(z.enum(["200_mr", "200_fr", "400_fr"], {
		errorMap: () => ({ message: "Relay type must be '200 MR', '200 FR', or '400 FR' or equivalents" })
	}))
	,
	z.string().trim().toLowerCase().transform((val) => {
		if (val == "relay split") { return "relay" } 
		return val;})
		.pipe(z.enum(["individual", "relay"], {
		errorMap: () => ({ message: "Type must be 'individual' or 'relay'" })
	})),
	z.string().trim().toLowerCase().transform((val) => {
		if (val == "fs") {
			return "flat";
		}
		else if (val == "rs") {
			return "relay";
		} return val;}).pipe(z.enum(["flat", "relay"], {
		errorMap: () => ({
			message: "Start must be 'flat' (or 'fs'), or 'relay' (or 'rs')"
		})
	})),
	z.string().trim().min(1, "Time is required")
]);
	


export type Time = z.infer<typeof timeSchema>;
export type Swimmer = z.infer<typeof swimmerSchema>;
export type Meet = z.infer<typeof meetSchema>;
export type Record = z.infer<typeof recordSchema>;
export type Relay = z.infer<typeof relaySchema>;


export function formatEventLabel(event: string): String{
	for (const evt of EVENTS) {
		if (evt.value == event) {
			return evt.label;
		}
	}
	return event;
}

export function checkIfValidEvent(event: String): boolean {
	for (const evt of EVENTS) {
		if (evt.value == event) {
			return true;
		}
	}
	return false;
}
export function assertEvent(event: any): asserts event is Event {
	if (typeof event !== "string") {
		throw new Error("Event is not a string");
	}
	if (!checkIfValidEvent(event)) {
		throw new Error("Event is not a valid Event");
	}
}

export function findEventFromLabel(event: any): Event | null {
	for (const evt of EVENTS) {
		if (
			event.includes(evt.label) ||
			evt.alternates.some((alt) => event.includes(alt))
		) {
			return evt.value as Event;
		}
	}
	return null;
}


