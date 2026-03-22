import { SwimData } from "../../hooks/useSwimData";
import { useCallback, useMemo } from "react";
import { okAsync, ResultAsync } from "neverthrow";
import * as Errors from "../../lib/errors";
import { GoogleLoginHandler } from "./useGoogleLoginHandler";

export function useDatabaseHandler(data: SwimData, googleLoginHandler: GoogleLoginHandler) {
	const { token } = googleLoginHandler;
	const { refresher } = data;

	const addSwimmer = useCallback(
		(
			first_name: string,
			last_name: string,
			gender: string,
			graduating: number,
		): ResultAsync<null, Errors.ErrorRes> => {
			return ResultAsync.fromPromise(
				fetch("https://swimming-api.ryanyun2010.workers.dev/swimmers", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify({
						first_name,
						last_name,
						gender,
						graduating,
					}),
				}),
				(error) =>
					new Errors.NoResponse("Failed to add swimmer, no response from server: " + JSON.stringify(error)),
			).map((_) => {
				refresher();
				return null;
			});
		},
		[refresher, token],
	);

	const addMeet = useCallback(
		(name: string, date: string): ResultAsync<null, Errors.ErrorRes> => {
			return ResultAsync.fromPromise(
				fetch("https://swimming-api.ryanyun2010.workers.dev/meets", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify({
						name,
						date,
					}),
				}),
				(error) =>
					new Errors.NoResponse("Failed to add meet, no response from server: " + JSON.stringify(error)),
			).map((_) => {
				refresher();
				return null;
			});
		},
		[refresher, token],
	);

	// const addResult = useCallback((swimmer_id: number, event_id: number, meet_id: number, time_ms: number, is_valid: boolean, invalid_reason: string | null): ResultAsync<null, Errors.ErrorRes> => {
	// }, [refresher, token]);

	return useMemo(() => ({ addSwimmer, addMeet }), [addSwimmer, addMeet]);
}
