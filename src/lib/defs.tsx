import { z } from "zod";

export const eventSchema = z.object({
	id: z.coerce.number().int(),
	name: z.string(),
	distance: z.coerce.number().int(),
	stroke: z.string().toLowerCase(),
	gender: z.enum(["male", "female"]),
});
export const eventsSchema = z.array(eventSchema);
export type SEvent = z.infer<typeof eventSchema>;

export const meetSchema = z.object({
	id: z.coerce.number().int(),
	name: z.string(),
	location: z.string(),
	date: z.string(),
});
export const meetsSchema = z.array(meetSchema);
export type Meet = z.infer<typeof meetSchema>;

export const recordProgSchema = z.object({
	id: z.coerce.number().int(),
	school_record: z.coerce.boolean(),
	type: z.enum(["individual", "relay", "relay_leg"]),
	swimmer_id: z.coerce.number().int(),
	event_id: z.coerce.number().int(),
	relay_id: z.coerce.number().int().nullable(),
	result_id: z.coerce.number().int().nullable(),
	meet_id: z.coerce.number().int(),
	leg_id: z.coerce.number().int().nullable(),
});
export const recordProgsSchema = z.array(recordProgSchema);
export type RecordProg = z.infer<typeof recordProgSchema>;

export const relayLegSchema = z.object({
	id: z.coerce.number().int(),
	relay_id: z.coerce.number().int(),
	swimmer_id: z.coerce.number().int(),
	event_id: z.coerce.number().int(),
	leg_order: z.coerce.number().int(),
	split_time: z.coerce.number(),
	is_valid: z.coerce.boolean(),
	invalid_reason: z.string().nullable(),
});
export const relayLegsSchema = z.array(relayLegSchema);
export type RelayLeg = z.infer<typeof relayLegSchema>;

export const relaySchema = z.object({
	id: z.coerce.number().int(),
	event_id: z.coerce.number().int(),
	meet_id: z.coerce.number().int(),
	time_ms: z.coerce.number(),
	is_valid: z.coerce.boolean(),
	invalid_reason: z.string().nullable(),
});
export const relaysSchema = z.array(relaySchema);
export type Relay = z.infer<typeof relaySchema>;

export const resultSchema = z.object({
	id: z.coerce.number().int(),
	swimmer_id: z.coerce.number().int(),
	event_id: z.coerce.number().int(),
	meet_id: z.coerce.number().int(),
	time_ms: z.coerce.number(),
	is_valid: z.coerce.boolean(),
	invalid_reason: z.string().nullable(),
});
export const resultsSchema = z.array(resultSchema);
export type Result = z.infer<typeof resultSchema>;

export const swimmerSchema = z.object({
	id: z.coerce.number().int(),
	first_name: z.string(),
	last_name: z.string(),
	gender: z.enum(["male", "female"]),
	graduating: z.coerce.number().int(),
});
export const swimmersSchema = z.array(swimmerSchema);
export type Swimmer = z.infer<typeof swimmerSchema>;

export interface IDedObject {
	id: number;
}
