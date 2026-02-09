import { useEffect, useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { readCSV, getResponseJSONAndParse, zodParseWith } from "../lib/utils";
import { swimmerSchema, swimmersSchema, meetSchema, meetsSchema, Meet, Swimmer,findEventFromLabel, EVENTS, googleAuthResponseSchema, recordsCSVSchemaNonRelay, recordsCSVSchemaRelay, recordsSchema} from "../lib/defs";
import { z} from "zod";
import * as Errors from "../lib/errors";
import { ErrorRes } from "../lib/errors";
import { ResultAsync, errAsync, okAsync} from "neverthrow";

//type Meet = 
export default function AdminPage() {
	const [token, setToken] = useState<String | null>(null);
	const [userEmail, setUserEmail] = useState<String | null>(null);
	const [loggedIn, setLoggedIn] = useState(false);
	const [meets, setMeets] = useState<Meet[]>([]);
	const [swimmers, setSwimmers] = useState<Swimmer[]>([]);

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

	// load meets & swimmers
	useEffect(() => {
		if (!loggedIn) return;

		ResultAsync.fromPromise(fetch("https://swimming-api.ryanyun2010.workers.dev/meets"), (e) => new Errors.NoResponse("When attempting to load meets data, no response from server: " + JSON.stringify(e)))
			.andThen((r) => getResponseJSONAndParse(r, meetsSchema, (errMsg) => new Errors.MalformedResponse("Failed to parse meets data returned from API: " + errMsg)))
			.match(
				(r) => {
					setMeets(r);
				},
				(e) => {
					alert("Failed to load meets, see console for details.");
					console.error("Failed to load meets: " + JSON.stringify(e));
				}
			);
		ResultAsync.fromPromise(fetch("https://swimming-api.ryanyun2010.workers.dev/swimmers"), (e) => new Errors.NoResponse("When attempting to load swimmer data, no response from server: " + JSON.stringify(e)))
			.andThen((r) => getResponseJSONAndParse(r, swimmersSchema, (errMsg) => new Errors.MalformedResponse("Failed to parse swimmers data returned from API: " + errMsg)))
			.match(
				(r) => {
					setSwimmers(r);
				},
				(e) => {
					alert("Failed to load swimmers, see console for details.");
					console.error("Failed to load swimmers: " + JSON.stringify(e));
				}
			);
			
			
	}, [loggedIn]);


	const addMeet = (e: React.SubmitEvent<HTMLFormElement>) => {
		e.preventDefault();
		const f = new FormData(e.target);

		if (f.get("date") == null) {
			alert("attempted to add Meet, but it has no Date?");
			return;
		}

		const [year, month, day] = (f.get("date") as String).split("-").map(Number);

		const dateInSeconds = Date.UTC(year, month - 1, day) / 1000;

		ResultAsync.fromPromise(fetch("https://swimming-api.ryanyun2010.workers.dev/meets", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`
			},
			body: JSON.stringify({
				name: f.get("name"),
				location: f.get("location"),
				date: dateInSeconds
			})
		}), (error) => new Errors.NoResponse("Failed to add meet, no response from server: " + JSON.stringify(error)))
		.match(
			(_) => e.target.reset(),
			(err) => {
				alert("Failed to add meet, see console for details.");
				console.error("Failed to add meet: " + JSON.stringify(err));
			}
		);

		ResultAsync.fromPromise(fetch("https://swimming-api.ryanyun2010.workers.dev/meets"), (e) => new Errors.NoResponse("Tried to fetch meets, no response from server: " + JSON.stringify(e)))
			.andThen((r) => getResponseJSONAndParse(r, meetsSchema, (errMsg) => new Errors.MalformedResponse("Failed to parse meets data returned from API: " + errMsg)))
			.match(
				(r) => {
					setMeets(r);
					alert("Meet added");
				},
				(e) => {
					alert("Failed to update meets list, see console for details.");
					console.error("Failed to update meets list: " + JSON.stringify(e));
				}
			);
	};

	const addRecord = (e: React.SubmitEvent<HTMLFormElement>) => {
		e.preventDefault();
		const f = new FormData(e.target);
		ResultAsync.fromPromise(fetch("https://swimming-api.ryanyun2010.workers.dev/records", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`
			},
			body: JSON.stringify([
				{
					swimmer_id: Number(f.get("swimmer_id")),
					meet_id: Number(f.get("meet_id")),
					event: f.get("event"),
					type: f.get("type"),
					start: f.get("start"),
					time: Number(f.get("time"))
				}
			])
		}), (error) => new Errors.NoResponse("Failed to add record, no response from server: " + JSON.stringify(error)))
		.match(
			(_) => {
				e.target.reset();
				alert("Record added");
			},
			(err) => {
				alert("Failed to add record, see console for details.");
				console.error("Failed to add record: " + JSON.stringify(err));
			}
		);
	};

	const find_swimmer_id = (swimmer_name: String): number | null => {
		for (let s of swimmers) {
			if (swimmer_name.includes(s.name)) {
				return Number(s.id);
			}
		}
		return null;
	};

	const find_meet_id = (meet_name: String): number | null => {
		for (let m of meets) {
			if (meet_name.includes(m.name)) {
				return Number(m.id);
			}
		}
		return null;
	};

	const parseCSVRowAsRelay = (row: string[]): ResultAsync<{
					swimmer_ids: number[],
					meet_id: number,
					relay_type: string,
					time: number
				},ErrorRes> => {
		return zodParseWith(recordsCSVSchemaRelay, (errMsg) => new Errors.MalformedResponse(`Wrong format: ${errMsg}`))(row)
				.andThen((parsedRow) => {
					let swimmer_names = [parsedRow[0], parsedRow[1], parsedRow[2], parsedRow[3]];
					let swimmer_ids = [];
					for (let swimmer_name of swimmer_names) {
						let swimmer_id = find_swimmer_id(swimmer_name.trim());
						if (swimmer_id == null) {
							return errAsync(new Errors.MalformedResponse(`Failed to parse CSV, Swimmer not found: ${swimmer_name}`));
						}
						swimmer_ids.push(swimmer_id);
					}
					let meet_name = parsedRow[4];
					let meet_id = find_meet_id(meet_name);
					if (meet_id == null) {
						return errAsync(new Errors.MalformedResponse(`Failed to parse CSV, Meet not found: ${meet_name}`));
					}
					let raw_time = parsedRow[8];
					let time = null;
					let split = raw_time.split(":");
					if (split.length > 2) {
						return errAsync(new Errors.MalformedResponse(`Failed to parse CSV, Invalid time (or time is more than an hour? expected format minutes:seconds): ${raw_time}`));
					}
					if (split.length == 2) {
						let minutes = parseInt(split[0]);
						let seconds = parseFloat(split[1]);
						time = minutes * 60 + seconds;
					} else {
						time = parseFloat(split[0]);
					}
					if (time == null || isNaN(time)) {
						return errAsync(new Errors.MalformedResponse(`Failed to parse CSV, Invalid time: ${raw_time}`));
					}
					return okAsync({
						swimmer_ids: swimmer_ids,
						meet_id: meet_id,
						relay_type: parsedRow[5],
						time: time
					});
				});
	}

	const parseCSVRowAsNonRelay = (row: string[]): ResultAsync<{
		swimmer_id: number,
		meet_id: number,
		event: string,
		type: string,
		start: string,
		time: number}, ErrorRes> => {

		return zodParseWith(recordsCSVSchemaNonRelay, (errMsg) => new Errors.MalformedResponse(`Wrong format: ${errMsg}`))(row)
			.andThen((parsedRow) => {
				let swimmer_name = parsedRow[0];
				let swimmer_id = find_swimmer_id(swimmer_name);
				if (swimmer_id == null) {
					return errAsync(new Errors.MalformedResponse(`Failed to parse CSV, Swimmer not found: ${swimmer_name}`));
				}

				let meet_name = parsedRow[1];
				let meet_id = find_meet_id(meet_name);
				if (meet_id == null) {
					return errAsync(new Errors.MalformedResponse(`Failed to parse CSV, Meet not found: ${meet_name}`));
				}
				let event_name = parsedRow[2];
				let event_identifier = findEventFromLabel(event_name);
				if (event_identifier == null) {
					return errAsync(new Errors.MalformedResponse(`Failed to parse CSV, Event not found: ${event_name}`));
				}

				let raw_time = parsedRow[5];
				let time = null;
				let split = raw_time.split(":");
				if (split.length > 2) {
					return errAsync(new Errors.MalformedResponse(`Failed to parse CSV, Invalid time (or time is more than an hour? expected format minutes:seconds): ${raw_time}`));
				}
				if (split.length == 2) {
					let minutes = parseInt(split[0]);
					let seconds = parseFloat(split[1]);
					time = minutes * 60 + seconds;
				} else {
					time = parseFloat(split[0]);
				}
				if (time == null || isNaN(time)) {
					return errAsync(new Errors.MalformedResponse(`Failed to parse CSV, Invalid time: ${raw_time}`));
				}

				return okAsync({
					swimmer_id: swimmer_id,
					meet_id: meet_id,
					event: event_identifier,
					type: parsedRow[3],
					start: parsedRow[4],
					time: time
				});
			});
	}



	const addRecordsBulk = (e: React.SubmitEvent<HTMLFormElement>) => {
		e.preventDefault();
		const f = new FormData(e.target);
		let file = f.get("file");
		if (!file) return;


		let final_rows: { swimmer_id: number, meet_id: number, event: string, type: string, start: string, time: number}[] = [];
		let relays: { swimmer_ids: number[], meet_id: number, relay_type: string, time: number }[] = [];
		let row_results: ResultAsync<any, ErrorRes>[] = [];
		let relay_row_results: ResultAsync<any, ErrorRes>[] = [];
		readCSV(file as File)
		.andThen(
			(read) => {
				console.log("Raw CSV data: " + JSON.stringify(read));
				for (let i = 1; i < read.length; i++) {
					const row = read[i];
					if (row.length < 6) { 
						return errAsync(new Errors.MalformedResponse(`Failed to parse CSV, Row has insufficient columns: ${row}`));
					}
					else if (row.length == 7 || row.length == 8 || row.length > 9) {
						return errAsync(new Errors.MalformedResponse(`Failed to parse CSV, Row has invalid number of columns: ${row}`));
					}
					else if (row.length == 9) {
						relay_row_results.push(parseCSVRowAsRelay(row));
					} else {
						row_results.push(parseCSVRowAsNonRelay(row));
					}
				}
				console.log("Parsed CSV data: " + JSON.stringify({final_rows, relays}));
				return okAsync(final_rows);
			}
		).andThen(() => ResultAsync.combine(row_results))
		.andThen((rows) => {
			final_rows = rows;
			return ResultAsync.combine(relay_row_results);
		})
		.andThen((relaysParsed) => {
			relays = relaysParsed;
			return okAsync({});
		}).andThen(() => 
		ResultAsync.fromPromise(fetch("https://swimming-api.ryanyun2010.workers.dev/records", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`
			},
			body: JSON.stringify(final_rows)
		}), (error) => new Errors.NoResponse("No response from server: " + JSON.stringify(error)))

			)
		.andThen((res) => {
			if (!res.ok) {
				return errAsync(new Errors.Unauthorized("Could not upload record: " + JSON.stringify(res)));
			}
			return okAsync(res);
		})
		.match(
			(_) => {},
			(err) => {
				alert(`Failed to upload new records, see console for details.`);
				console.error("Failed to upload new records: " + JSON.stringify(err));
			}
		);

		getResponseJSONAndParse(fetch("https://swimming-api.ryanyun2010.workers.dev/records"), recordsSchema, (errMsg) => new Errors.MalformedResponse("Failed to parse records data returned from API: " + errMsg)).andThen(
			(records) => {
				for (let relay of relays) {
					let record_ids = [];
					for (let record of records) {
						if (
							relay.swimmer_ids.includes(record.swimmer_id) &&
							relay.meet_id == record.meet_id &&
							record.type == "relay"
						) {
							let swimmer_num =
								relay.swimmer_ids.indexOf(record.swimmer_id) + 1;
							let expected_event = "";
							if (relay.relay_type == "200_mr") {
								if (swimmer_num == 1) {
									expected_event = "50_back";
								} else if (swimmer_num == 2) {
									expected_event = "50_breast";
								} else if (swimmer_num == 3) {
									expected_event = "50_fly";
								} else if (swimmer_num == 4) {
									expected_event = "50_free";
								}
							} else if (relay.relay_type == "200_fr") {
								expected_event = `50_free`;
							} else if (relay.relay_type == "400_fr") {
								expected_event = `100_free`;
							}

							if (record.event == expected_event) {
								record_ids[relay.swimmer_ids.indexOf(record.swimmer_id)] = record.id;
							}
						}
					}
					if (record_ids.length != 4 || record_ids.includes(undefined)) {
						return errAsync(new Errors.MalformedResponse(`Failed to find record IDs for relay, did you not provide a relay split for one or more of the swimmers?: ${JSON.stringify(relay)}`));
					}
					return ResultAsync.fromPromise(fetch("https://swimming-api.ryanyun2010.workers.dev/relays", {
						method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`
					},
					body: JSON.stringify({
						record_1_id: record_ids[0],
						record_2_id: record_ids[1],
						record_3_id: record_ids[2],
						record_4_id: record_ids[3],
						relay_type: relay.relay_type,
						time: relay.time
					})
					}), (error) => new Errors.NoResponse("Failed to add relay, no response from server: " + JSON.stringify(error)))
				}
				return okAsync({});

		}).match(
			(_) => {
				alert("Records succesfully added");
			},
			(err) => {
				alert(`Failed to add relay records, see console for details.`);
				console.error("Failed to add relay records: " + JSON.stringify(err));
			}
		);
		
		e.target.reset();
	};

	const addSwimmer = (e: React.SubmitEvent<HTMLFormElement>) => {
		e.preventDefault();
		const f = new FormData(e.target);

		ResultAsync.fromPromise(fetch("https://swimming-api.ryanyun2010.workers.dev/swimmers", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`
			},
			body: JSON.stringify({
				name: f.get("name"),
				graduating_year: Number(f.get("graduating_year"))
			})
		}), (error) => new Errors.NoResponse("Failed to add swimmer, no response from server: " + JSON.stringify(error))).match(
			(_) => {
				alert("Swimmer sucessfully added");
			},
			(err) => {
				alert("Failed to add swimmer, see console for details.");
				console.error("Failed to add swimmer: " + JSON.stringify(err));
			}
		);

		e.target.reset();

		ResultAsync.fromPromise(fetch("https://swimming-api.ryanyun2010.workers.dev/swimmers"), (e) => new Errors.NoResponse("Nno response from server: " + JSON.stringify(e)))
			.andThen((r) => getResponseJSONAndParse(r, swimmersSchema, (errMsg) => new Errors.MalformedResponse("Failed to parse swimmers data returned from API: " + errMsg)))
			.match(
				(r) => {
					setSwimmers(r);
				},
				(e) => {
					alert("While attempting to update swimmer list, failed to load swimmers, see console for details.");
					console.error("Failed to load swimmers: " + JSON.stringify(e));
				}
			);
	};

	return (
		<div style={{ padding: 32 }}>
			{!loggedIn ? (
				<GoogleLogin onSuccess={onLogin} />
			) : (
				<>
					<p>
						Logged in as <b>{userEmail}</b>
					</p>

					<h2>Add Swimmer</h2>

					<form onSubmit={addSwimmer}>
						<input
							name="name"
							placeholder="Swimmer Name"
							required
						/>
						<input
							name="graduating_year"
							placeholder="Graduating year"
							type="number"
							step="1"
							required
						/>
						<button>Add Swimmer</button>
					</form>
					<h2>Add Meet</h2>
					<form onSubmit={addMeet}>
						<input name="name" placeholder="Meet name" required />
						<input
							name="location"
							placeholder="Location"
							required
						/>
						<input name="date" type="date" required />
						<button>Add Meet</button>
					</form>

					<h2>Add Record</h2>

					<form onSubmit={addRecord}>
						<select name="swimmer_id" required>
							<option value="">Select swimmer</option>
							{swimmers.map((s) => (
								<option key={s.id} value={s.id}>
									{s.name} '{s.graduating_year % 100}
								</option>
							))}
						</select>

						<select name="meet_id" required>
							<option value="">Select meet</option>
							{meets.map((m) => (
								<option key={m.id} value={m.id}>
									{m.name}
								</option>
							))}
						</select>

						<select name="event" required>
							<option value="">Select event</option>
							{EVENTS.map((e) => (
								<option key={e.value} value={e.value}>
									{e.label}
								</option>
							))}
						</select>

						<select name="type">
							<option value="individual">Individual</option>
							<option value="relay">Relay</option>
						</select>

						<select name="start">
							<option value="flat">Flat start</option>
							<option value="relay">Relay start</option>
						</select>

						<input
							name="time"
							type="number"
							step="0.01"
							placeholder="Time (seconds)"
							required
						/>

						<button>Add Record</button>
					</form>
					<h2>Add Records</h2>
					<form onSubmit={addRecordsBulk}>
						<input
							name="file"
							id="csvInput"
							accept=".csv"
							type="file"
						/>

						<button>Add Records</button>
					</form>
				</>
			)}
		</div>
	);
}
