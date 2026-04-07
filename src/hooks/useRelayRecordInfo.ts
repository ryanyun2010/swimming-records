import { useMemo } from "react";
import { SwimData } from "./useSwimData";

export type RelayRecordInfo = {
	current_PR: { change: number | null } | null;
	current_SR: { change: number | null } | null;
	previous_PR: { change: number | null; til: string } | null;
	previous_SR: { change: number | null; til: string } | null;
};

export function useRelayRecordInfo(data: SwimData): Record<number, RelayRecordInfo> {
	const { recordProgs, relays, meets } = data;
	return useMemo(() => {
		const info: Record<number, RelayRecordInfo> = {};
		const lastPR: Record<string, number> = {};
		const lastSR: Record<number, number> = {};

		const ensure = (relayId: number): RelayRecordInfo => {
			if (!info[relayId]) {
				info[relayId] = { current_PR: null, current_SR: null, previous_PR: null, previous_SR: null };
			}
			return info[relayId];
		};

		for (let recordProg of recordProgs) {
			if (recordProg.type !== "relay") continue;
			if (recordProg.relay_id == null || !relays[recordProg.relay_id]) {
				continue;
			}
			const relayId = recordProg.relay_id;
			const relay = relays[relayId];
			const meetDate = meets[relay.meet_id]?.date ?? "";
			const curInfo = ensure(relayId);

			if (!recordProg.school_record) {
				const key = `${recordProg.swimmer_id}-${recordProg.event_id}`;
				const lastId = lastPR[key];
				if (lastId !== undefined && relays[lastId]) {
					const lastInfo = ensure(lastId);
					const lastCur = lastInfo.current_PR ?? { change: null };
					lastInfo.previous_PR = { change: lastCur.change, til: meetDate };
					lastInfo.current_PR = null;
					curInfo.current_PR = { change: relay.time_ms - relays[lastId].time_ms };
				} else {
					curInfo.current_PR = { change: null };
				}
				lastPR[key] = relayId;
			} else {
				const key = recordProg.event_id;
				const lastId = lastSR[key];
				if (lastId !== undefined && relays[lastId]) {
					const lastInfo = ensure(lastId);
					const lastCur = lastInfo.current_SR ?? { change: null };
					lastInfo.previous_SR = { change: lastCur.change, til: meetDate };
					lastInfo.current_SR = null;
					curInfo.current_SR = { change: relay.time_ms - relays[lastId].time_ms };
				} else {
					curInfo.current_SR = { change: null };
				}
				lastSR[key] = relayId;
			}
		}

		return info;
	}, [recordProgs, relays, meets]);
}
