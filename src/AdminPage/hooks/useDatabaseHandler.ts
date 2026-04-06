import { SwimData } from "../../hooks/useSwimData";
import { useCallback } from "react";
import { ResultAsync } from "neverthrow";
import * as Errors from "../../lib/errors";
import { GoogleLoginHandler } from "./useGoogleLoginHandler";

export function useDatabaseHandler(data: SwimData, googleLoginHandler: GoogleLoginHandler) {
	const { token } = googleLoginHandler;
	const { refresher } = data;
	const sendRequest = useCallback(
		(endpoint: string, body: object): ResultAsync<Response, Errors.ErrorRes> => {
			const url = endpoint.startsWith("http")
				? endpoint
				: `https://swimming-api.ryanyun2010.workers.dev/${endpoint}`;
			return ResultAsync.fromPromise(
				fetch(url, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify(body),
				}),
				(error) =>
					new Errors.NoResponse("Failed to send request, no response from server: " + JSON.stringify(error)),
			);
		},
		[token],
	);
	const addSwimmer = useCallback(
		(
			first_name: string,
			last_name: string,
			gender: string,
			graduating: number,
			refresh: boolean = true,
		): ResultAsync<null, Errors.ErrorRes> => {
			return sendRequest("swimmers", {
				first_name,
				last_name,
				gender,
				graduating,
			})
				.map((_) => {
					if (refresh) refresher();
					return null;
				})
				.mapErr(
					(error) =>
						new Errors.NoResponse("Failed to add swimmer, server query failed: " + JSON.stringify(error)),
				);
		},
		[refresher, sendRequest],
	);

	const addMeet = useCallback(
		(name: string, location: string, date: string, refresh: boolean = true): ResultAsync<null, Errors.ErrorRes> => {
			return sendRequest("meets", { name, location, date })
				.map((_) => {
					if (refresh) refresher();
					return null;
				})
				.mapErr(
					(error) =>
						new Errors.NoResponse("Failed to add meet, server query failed: " + JSON.stringify(error)),
				);
		},
		[refresher, sendRequest],
	);

	const addResult = useCallback(
		(
			swimmer_id: number,
			event_id: number,
			meet_id: number,
			time_ms: number,
			is_valid: boolean,
			invalid_reason: string | null,
			refresh: boolean = true,
		): ResultAsync<null, Errors.ErrorRes> => {
			return sendRequest("results", {
				swimmer_id,
				event_id,
				meet_id,
				time_ms,
				is_valid,
				invalid_reason,
			})
				.map((_) => {
					if (refresh) refresher();
					return null;
				})
				.mapErr(
					(error) =>
						new Errors.NoResponse("Failed to add result, server query failed: " + JSON.stringify(error)),
				);
		},
		[refresher, sendRequest],
	);

	const addRelay = useCallback(
		(
			event_id: number,
			meet_id: number,
			time_ms: number,
			is_valid: boolean,
			invalid_reason: string | null,
			refresh: boolean = true,
		): ResultAsync<number, Errors.ErrorRes> => {
			return sendRequest("relays", { event_id, meet_id, time_ms, is_valid, invalid_reason })
				.andThen((response) =>
					ResultAsync.fromPromise(
						response.json(),
						(error) =>
							new Errors.NoResponse(
								"Failed to parse response when adding relay: " + JSON.stringify(error),
							),
					),
				)
				.map((data) => data.last_row_id as number)
				.map((relay_id) => {
					if (refresh) refresher();
					return relay_id;
				})
				.mapErr(
					(error) =>
						new Errors.NoResponse("Failed to add relay, server query failed: " + error.toString()),
				);
		},
		[refresher, sendRequest],
	);

	const addRelayLeg = useCallback(
		(
			relay_id: number,
			swimmer_id: number,
			event_id: number,
			time_ms: number,
			is_valid: boolean,
			invalid_reason: string | null,
			leg_order: number,
			refresh: boolean = true,
		): ResultAsync<null, Errors.ErrorRes> => {
			return sendRequest("relay_legs", {
				relay_id,
				swimmer_id,
				event_id,
				split_time: time_ms,
				is_valid,
				invalid_reason,
				leg_order,
			})
				.map((_) => {
					if (refresh) refresher();
					return null;
				})
				.mapErr(
					(error) =>
						new Errors.NoResponse("Failed to add relay leg, server query failed: " + JSON.stringify(error)),
				);
		},
		[refresher, sendRequest],
	);

	return { addSwimmer, addMeet, addResult, addRelay, addRelayLeg };
}
