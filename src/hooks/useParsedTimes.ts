import { useMemo } from 'react';
import { SwimData } from "./useSwimData";
import { ok , err} from "neverthrow";
import * as Errors from "../lib/errors";
import { Result as Res } from "neverthrow";

export interface ParsedTime {
	swimmer_id: number,
	meet_id: number,
	event_name: string,
	result_id: number | null,
	relay_leg_id: number | null,
	type: string, // "individual" or "relay_leg"
	time: number,
	start: string, // "flat" or "relay"
	meet_name: string,
	meet_date: string,
	meet_location: string,
	swimmer_first_name: string,
	swimmer_last_name: string,
	swimmer_gender: string,
	swimmer_year: number,
	current_PR: {change: number | null} | null,
	current_SR: {change: number | null} | null,
	previous_PR: {change: number | null, til: string} | null,
	previous_SR: {change: number | null, til: string} | null
}

export function useParsedTimes(data: SwimData): Res<ParsedTime[], Errors.NotFound> {
	const { results, swimmers, meets, relays, relayLegs, events, recordProgs } = data;
	return useMemo(() => {
		let times: ParsedTime[] = [];
		for (let result of Object.values(results)) {
			if (!(result.id in swimmers) || !(result.meet_id in meets)) {
				return err(new Errors.NotFound(`Missing swimmer or meet info for result ${result.id}`));
			}
			if (!(result.event_id in events)){
				return err(new Errors.NotFound(`Missing event info for result ${result.id}`));
			}
			const swimmer = swimmers[result.swimmer_id];
			const meet = meets[result.meet_id];
			const event = events[result.event_id];
			if (swimmer == null || meet == null || event == null) return err(new Errors.NotFound(`Missing swimmer, meet, or event info for result ${result.id}`));

			const parsedTime: ParsedTime = {
				swimmer_id: result.swimmer_id,
				meet_id: result.meet_id,
				event_name: event.name,
				result_id: result.id,
				relay_leg_id: null,
				type: "individual",
				time: result.time_ms,
				start: "flat",
				meet_name: meet.name,
				meet_date: meet.date,
				meet_location: meet.location,
				swimmer_first_name: swimmer.first_name,
				swimmer_last_name: swimmer.last_name,
				swimmer_gender: swimmer.gender,
				swimmer_year: swimmer.graduating,
				current_PR: null,
				current_SR: null,
				previous_PR: null,
				previous_SR: null
			};
			times.push(parsedTime);
		}
		for (let relayLeg of Object.values(relayLegs)) {
			if (!(relayLeg.swimmer_id in swimmers) || !(relays[relayLeg.relay_id]) || !(relays[relayLeg.relay_id].meet_id in meets)) {
				return err(new Errors.NotFound(`Missing swimmer, relay, or meet info for relay leg ${relayLeg.id}`));
			}
			const swimmer = swimmers[relayLeg.swimmer_id];
			const relay = relays[relayLeg.relay_id];
			const meet = meets[relay.meet_id];
			const event = events[relay.event_id];
			if (swimmer == null || relay == null || meet == null || event == null) return err(new Errors.NotFound(`Missing swimmer, relay, meet, or event info for relay leg ${relayLeg.id}`));

			let leg_name = events[relayLeg.event_id].name;
			const parsedTime: ParsedTime = {
				swimmer_id: relayLeg.swimmer_id,
				meet_id: relay.meet_id,
				event_name: leg_name,
				result_id: null,	
				relay_leg_id: relayLeg.id,
				type: "relay",
				time: relayLeg.split_time,
				start: relayLeg.leg_order == 1 ? "flat" : "relay",
				meet_name: meet.name,
				meet_date: meet.date,
				meet_location: meet.location,
				swimmer_first_name: swimmer.first_name,
				swimmer_last_name: swimmer.last_name,
				swimmer_gender: swimmer.gender,
				swimmer_year: swimmer.graduating,
				current_PR: null,
				current_SR: null,
				previous_PR: null,
				previous_SR: null
			}
			times.push(parsedTime);
		}
		let last_bests: Record<string, number> = {};
		let last_SR_bests: Record<number, number> = {};
		for (let recordProg of recordProgs) { // note record progs are sorted in chronological order by meet date asc server side, so we can just keep track of the last best time as we iterate
			if (recordProg.type == "relay") {
				continue;
			}
			if (!(recordProg.swimmer_id in swimmers) || !(recordProg.meet_id in meets) || !(recordProg.event_id in events)) {
				return err(new Errors.NotFound(`Missing swimmer, meet, or event info for record prog ${recordProg.id}`));
			}
			let timepid = null;
			for (let i = 0; i < times.length; i++ ) {
				const time = times[i];
				if (time.meet_id == recordProg.meet_id && time.swimmer_id == recordProg.swimmer_id) {
					if (recordProg.leg_id && recordProg.leg_id == time.relay_leg_id) {
						timepid = i;	
					} 
					else if (recordProg.result_id && recordProg.result_id == time.result_id) {
						timepid = i;
					}
				}
			}
			if (timepid == null) {
				return err(new Errors.NotFound(`Could not find time for record prog ${recordProg.id} with swimmer_id ${recordProg.swimmer_id}, meet_id ${recordProg.meet_id}, event_id ${recordProg.event_id}`));
			}
			let timep = times[timepid];

			if (!recordProg.school_record){
				let last_best = last_bests[`${recordProg.swimmer_id}-${recordProg.event_id}-${recordProg.leg_id ?? 'indiv'}`];
				if (last_best !== undefined) {
					let last_best_cur = times[last_best].current_PR ?? {change: null};
					times[last_best].previous_PR = {change: last_best_cur.change, til: timep.meet_date};
					times[last_best].current_PR = null;
					timep.current_PR = {change: timep.time - times[last_best].time};
				} else {
					timep.current_PR = {change: null};
				}
				last_bests[`${recordProg.swimmer_id}-${recordProg.event_id}-${recordProg.leg_id} ?? 'indiv'`] = timepid;
			} else {
				let last_SR_best = last_SR_bests[recordProg.event_id];
				if (last_SR_best !== undefined) {
					let last_SR_best_cur = times[last_SR_best].current_SR ?? {change: null};
					times[last_SR_best].previous_SR = {change: last_SR_best_cur.change, til: timep.meet_date};
					times[last_SR_best].current_SR = null;
					timep.current_SR = {change: timep.time - times[last_SR_best].time};
				} else {
					timep.current_SR = {change: null};
				}
				last_SR_bests[recordProg.event_id] = timepid;
			}
		}
		return ok(times);
	}, [results,swimmers,meets,relays,relayLegs,events,recordProgs])
}
