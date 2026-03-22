import { errAsync, okAsync, ResultAsync } from "neverthrow";
import { useMemo, useState } from "react";
import * as Errors from "../../lib/errors";
import { z } from "zod";
import { getResponseJSONAndParse } from "../../lib/utils";

export function useGoogleLoginHandler() {
	const [loggedIn, setLoggedIn] = useState(false);
	const [token, setToken] = useState<string | null>(null);
	const [userEmail, setUserEmail] = useState<string | null>(null);
	const onLogin = (res: any) => {
		return okAsync(res)
		.andThen((res) => res.credential ? okAsync(res.credential) : errAsync(new Errors.MalformedResponse("Google login response did not contain credential: " + JSON.stringify(res))))
		.andThen((idToken) => {
			setToken(idToken);
			return ResultAsync.fromPromise(fetch(
				"https://swimming-api.ryanyun2010.workers.dev/verify",
				{
					method: "POST",
					headers: { Authorization: `Bearer ${idToken}` }
				}
			), (e) => new Errors.NoResponse("Login failed: Could not reach authentication server: " + JSON.stringify(e)))
		})
		.andThen((verify) => {
			if (!verify.ok) {
				return errAsync(new Errors.Unauthorized("Login failed: " + verify.statusText));
			}
			return okAsync(verify);
		}).andThen((verify) => getResponseJSONAndParse(verify, z.object({email: z.string()}), (errMsg) => new Errors.MalformedResponse("Authentication server returned invalid JSON: " + errMsg))	
		).match(
			(data) => {
				setUserEmail(data.email);
				setLoggedIn(true);
			},
			(err) => {
				alert("Error logging in, see console for details.");
				console.error("Failed to log in: " + JSON.stringify(err));
			}
		)
	};
	return useMemo(() => ({ onLogin, loggedIn, token, userEmail }), [loggedIn, token, userEmail]);
}
export type GoogleLoginHandler = ReturnType<typeof useGoogleLoginHandler>;
