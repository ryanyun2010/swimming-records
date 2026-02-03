export interface Meet {
	id: number;
	name: string;
	location: string;
	date: string;
}

export function assertIsMeet(obj: any): asserts obj is Meet {
	if (obj == null) { throw new Error("Object is null or undefined"); }
	if (typeof obj !== "object") { throw new Error("Object is not of type object"); }
	if (typeof obj.id !== "number") { throw new Error("id is not a number"); }
	if (typeof obj.name !== "string") { throw new Error("name is not a string"); }
	if (typeof obj.location !== "string") { throw new Error("location is not a string"); }
	if (typeof obj.date !== "string") { throw new Error("date is not a string"); }
}

export function assertAreMeets(obj: any): asserts obj is Meet[] {
	if (!Array.isArray(obj)) { throw new Error("Object is not an array"); }
	obj.forEach((item, index) => {
		try {
			assertIsMeet(item);
		} catch (e) {
			throw new Error(`Item at index ${index} is not a valid Meet: ${(e as Error).message}`);
		}
	});
}


export interface Time {
	id: number;
	swimmer_id: number;
	event: string;
	type: SwimType;
	time: number;
	start_type: StartType;
	meet_name: string;
	meet_date: string;
	meet_location: string;
	swimmer_year: number;
}

export type SwimType = "relay"	| "individual";
export type StartType = "relay" | "flat";

export function assertIsTime(obj: any): asserts obj is Time {
	if (obj == null) { throw new Error("Object is null or undefined"); }
	if (typeof obj !== "object") { throw new Error("Object is not of type object"); }
	if (typeof obj.id !== "number") { throw new Error("id is not a number"); }
	if (typeof obj.swimmer_id !== "number") { throw new Error("swimmer_id is not a number"); }
	if (typeof obj.event !== "string") { throw new Error("event is not a string"); }
	if (obj.type !== "relay" && obj.type !== "individual") { throw new Error("type is not a valid SwimType"); }
	if (typeof obj.time !== "number") { throw new Error("time is not a number"); }
	if (obj.start_type !== "relay" && obj.start_type !== "flat") { throw new Error("start_type is not a valid StartType"); }
	if (typeof obj.meet_name !== "string") { throw new Error("meet_name is not a string"); }
	if (typeof obj.meet_date !== "string") { throw new Error("meet_date is not a string"); }
	if (typeof obj.meet_location !== "string") { throw new Error("meet_location is not a string"); }
	if (typeof obj.swimmer_year !== "number") { throw new Error("swimmer_year is not a number"); }
}

export function assertAreTimes(obj: any): asserts obj is Time[] {
	if (!Array.isArray(obj)) { throw new Error("Object is not an array"); }
	obj.forEach((item, index) => {
		try {
			assertIsTime(item);
		} catch (e) {
			throw new Error(`Item at index ${index} is not a valid Time: ${(e as Error).message}`);
		}
	});
}


export interface Swimmer {
	id: number;
	name: string;
	graduating_year: number;
}

export function assertIsSwimmer(obj: any): asserts obj is Swimmer {
	if (obj == null) { throw new Error("Object is null or undefined"); }
	if (typeof obj !== "object") { throw new Error("Object is not of type object"); }
	if (typeof obj.id !== "number") { throw new Error("id is not a number"); }
	if (typeof obj.name !== "string") { throw new Error("name is not a string"); }
	if (typeof obj.graduating_year !== "number") { throw new Error("graduating_year is not a number"); }
}

export function assertAreSwimmers(obj: any): asserts obj is Swimmer[] {
	if (!Array.isArray(obj)) { throw new Error("Object is not an array"); }
	obj.forEach((item, index) => {
		try {
			assertIsSwimmer(item);
		} catch (e) {
			throw new Error(`Item at index ${index} is not a valid Swimmer: ${(e as Error).message}`);
		}
	});
}





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
export type Event = "50_free" | "50_back" | "50_breast" | "50_fly" | "100_free" | "100_back" | "100_breast" | "100_fly" | "200_free" | "200_im" | "500_free"; 

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
