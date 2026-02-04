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
const allowedEvents = ["50_free", "50_back", "50_breast", "50_fly", "100_free", "100_back", "100_breast", "100_fly", "200_free", "200_im", "500_free"]
type Event = "50_free" | "50_back" | "50_breast" | "50_fly" | "100_free" | "100_back" | "100_breast" | "100_fly" | "200_free" | "200_im" | "500_free";

export const meetSchema = z.object({
	id: z.coerce.number().int(),
	name: z.string().min(1, "Name is required"),
	location: z.string().min(1, "Location is required"),
	date: z.coerce.number().int("Date must be an integer")
});

export const meetsSchema = z.array(meetSchema);

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
	event: z.enum(allowedEvents),
	type: z.enum(["individual", "relay"]),
	time: z.coerce.number().positive(),
	start_type: z.enum(["flat", "relay"]),
	meet_name: z.string().min(1, "Meet name is required"),
	meet_date: z.coerce.number().int(),
	meet_location: z.string().min(1, "Meet location is required"),
	swimmer_year: z.coerce.number().int()
});

export const timesSchema = z.array(timeSchema);




export function formatEventLabel(event: Event): String{
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


export interface GoogleAuthObject {
	credential: string;	
}
export function assertIsGoogleAuthObject(obj: any): asserts obj is GoogleAuthObject {
	if (obj == null) { throw new Error("Object is null or undefined"); }
	if (typeof obj !== "object") { throw new Error("Object is not of type object"); }
	if (typeof obj.credential !== "string") { throw new Error("credential is not a string"); }
}
