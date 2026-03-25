import { SwimData } from "../../hooks/useSwimData";
import { useCallback, useMemo } from "react";
import { errAsync, okAsync, ResultAsync } from "neverthrow";
import * as Errors from "../../lib/errors";
import { GoogleLoginHandler } from "./useGoogleLoginHandler";

export function useDatabaseHandler(data: SwimData, googleLoginHandler: GoogleLoginHandler) {
	const { token } = googleLoginHandler;
	const { refresher } = data;
	const sendRequest = useCallback((endpoint: string, body: object): ResultAsync<Response, Errors.ErrorRes> => {
		return ResultAsync.fromPromise(
			fetch(`https://swimming-api.ryanyun2010.workers.dev/${endpoint}`, {
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
	}, [token]);
	const addSwimmer = useCallback(
		(
			first_name: string,
			last_name: string,
			gender: string,
			graduating: number,
		): ResultAsync<null, Errors.ErrorRes> => {
			return sendRequest("https://swimming-api.ryanyun2010.workers.dev/swimmers", {
				first_name,
				last_name,
				gender,
				graduating,
			})
				.map((_) => {
					refresher();
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
		(name: string, date: string): ResultAsync<null, Errors.ErrorRes> => {
			return sendRequest("meets", { name, date })
				.map((_) => {
					refresher();
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
		): ResultAsync<null, Errors.ErrorRes> => {
			return sendRequest("results", {
				swimmer_id,
				event_id,
				meet_id,
				time_ms,
				is_valid,
				invalid_reason,
			})
				.map((_) => null)
				.mapErr(
					(error) =>
						new Errors.NoResponse("Failed to add result, server query failed: " + JSON.stringify(error)),
				);
		},
		[refresher, sendRequest],
	);

	return { addSwimmer, addMeet, addResult };
}
