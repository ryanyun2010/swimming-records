import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import AdminPage from "./pages/AdminPage"; // your AdminPage component
import { formatDate } from "./lib/utils";
import { timesSchema, meetsSchema , Time, Meet} from "./lib/defs";
import { z, ZodError } from "zod";
import * as Errors from "./lib/errors";
import { ResultAsync, okAsync, errAsync } from "neverthrow";
import { ErrorRes } from "./lib/errors";


function zodErrorToHumanReadable(err: ZodError): string {
	return err.issues
		.map(i => `${i.path.join(".")}: ${i.message}`)
		.join("; ");
}

function zodParseWith<T>(
	schema: z.ZodSchema<T>, 
	errFunc: (errMsg: string) => ErrorRes
): (json: unknown) => ResultAsync<T, ErrorRes> {
	return (json: unknown) => {
		const parseResult = schema.safeParse(json);
		if (!parseResult.success) {
			return errAsync(errFunc(zodErrorToHumanReadable(parseResult.error)));
		}
		return okAsync(parseResult.data);
	};
}

function safeFetchAndParse<T>(
	url: string,
	schema: z.ZodSchema<T>,
	fetchFailErrFunc: (errMsg: string) => ErrorRes,
	zodParseFailErrFunc: (errMsg: string) => ErrorRes
): ResultAsync<T, ErrorRes> {
	return ResultAsync.fromPromise(fetch(url), (e) => fetchFailErrFunc(JSON.stringify(e)))
				.andThen(zodParseWith(schema, zodParseFailErrFunc));
}
function Home() {
	const [recentMeets, setRecentMeets] = useState<Meet[]>([]);
	const [times, setTimes] = useState<Time[]>([]);

	useEffect(() => {
		safeFetchAndParse("https://swimming-api.ryanyun2010.workers.dev", timesSchema, 
						  (errMsg) => new Errors.NoResponse(`Failed to recieve a valid response from the records API: ${errMsg}`), 
						  (errMsg) => new Errors.MalformedResponse(`Recievied reponse from records API was invalid: ${errMsg}`)) 
		.match(
			(data) => {
				setTimes(data);
			},
			(err) => {
				console.error("Failed to load records:", err);
				alert("Failed to load records, see console");
			}
		);

		safeFetchAndParse("https://swimming-api.ryanyun2010.workers.dev/recent_meets", meetsSchema, 
						  (errMsg) => new Errors.NoResponse(`Failed to recieve a valid response from the recent meets API: ${errMsg}`), 
						  (errMsg) => new Errors.MalformedResponse(`Recievied reponse from recent meets API was invalid: ${errMsg}`)) 
		.match(
			(data) => {
				setRecentMeets(data);
			},
			(err) => {
				console.error("Failed to load meet records:", err);
				alert("Failed to load records, see console");
			}
		);
	}, []);

	return (
		<div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
			<h1>Nueva Swimming Records</h1>
			<h2>Recent Meets</h2>
			<ul style={{ listStyle: "none", padding: 0 }}>
				{recentMeets.map((r) => (
					<li
						key={r.id}
						style={{
							padding: "0.5rem 0",
							borderBottom: "1px solid #ddd"
						}}
					>
						<strong>
							{r.name} | {r.location} | {formatDate(r.date)}

						</strong>
					</li>
				))}
			</ul>
		</div>
	);
}

// --- Main App with routing ---
function App() {
	return (
		<GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
			<Router>
				<Routes>
					<Route path="/" element={<Home />} />
					<Route path="/admin" element={<AdminPage />} />
				</Routes>
			</Router>
		</GoogleOAuthProvider>
	);
}

export default App;
