import { useEffect, useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import {readCSV} from "../lib/utils";
const EVENTS = [
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
	{ value: "500_free", label: "500 Free", alternates: [] },
];

export default function AdminPage() {
	const [token, setToken] = useState(null);
	const [userEmail, setUserEmail] = useState(null);
	const [loggedIn, setLoggedIn] = useState(false);
	const [meets, setMeets] = useState([]);
	const [swimmers, setSwimmers] = useState([]);

	/* ---------- LOGIN ---------- */
	const onLogin = async (res) => {
		const idToken = res.credential;
		setToken(idToken);

		const verify = await fetch(
			"https://swimming-api.ryanyun2010.workers.dev/verify",
			{
				method: "POST",
				headers: { Authorization: `Bearer ${idToken}` }
			}
		);

		if (!verify.ok) return alert("Login failed: " + (await verify.text()));

		const data = await verify.json();
		setUserEmail(data.email);
		setLoggedIn(true);
	};

	/* ---------- LOAD MEETS ---------- */
	useEffect(() => {
		if (!loggedIn) return;
		fetch("https://swimming-api.ryanyun2010.workers.dev/meets")
			.then((r) => r.json())
			.then(setMeets);
	}, [loggedIn]);

	/* ---------- LOAD SWIMMERS ---------- */
	useEffect(() => {
		if (!loggedIn) return;
		fetch("https://swimming-api.ryanyun2010.workers.dev/swimmers")
			.then((r) => r.json())
			.then(setSwimmers);
	}, [loggedIn]);

	/* ---------- ADD MEET ---------- */
	const addMeet = async (e) => {
		e.preventDefault();
		const f = new FormData(e.target);

		// Parse the date string from the date picker
		const [year, month, day] = f.get("date").split("-").map(Number);

		// Create UTC midnight
		const dateInSeconds = Date.UTC(year, month - 1, day) / 1000;

		// POST to your Worker
		await fetch("https://swimming-api.ryanyun2010.workers.dev/meets", {
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
		});

		e.target.reset();

		// Reload meets for dropdown
		const meetsRes = await fetch(
			"https://swimming-api.ryanyun2010.workers.dev/meets"
		);
		const meetsData = await meetsRes.json();
		setMeets(meetsData);
	};

	/* ---------- ADD RECORD ---------- */
	const addRecord = async (e) => {
		e.preventDefault();
		const f = new FormData(e.target);

		await fetch("https://swimming-api.ryanyun2010.workers.dev/records", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`
			},
			body: JSON.stringify([{
				swimmer_id: Number(f.get("swimmer_id")),
				meet_id: Number(f.get("meet_id")),
				event: f.get("event"),
				type: f.get("type"),
				start: f.get("start"),
				time: Number(f.get("time"))
			}])
		});

		e.target.reset();
		alert("Record added");
	};
	
	const addRecordsBulk = async (e) => {
		e.preventDefault();
		const f = new FormData(e.target);
		let file = f.get("file");

		if (!file) return;
		let read = await readCSV(file);
		let final_rows = [];
		for (let i = 1; i < read.length; i++) {
			let row = read[i];
			let swimmer_name = row[0];
			let swimmer_id = null;
			for (let s of swimmers) {
				if (swimmer_name.includes(s.name)) {
					swimmer_id = s.id;
					break;
				}
			}
			if (swimmer_id == null) {
				alert(`Failed to parse CSV, Swimmer not found: ${swimmer_name}`);
				return;
			}

			let meet_name = row[1];
			let meet_id = null;
			for (let m of meets) {
				if (meet_name.includes(m.name)) {
					meet_id = m.id;
					break;
				}
			}
			if (meet_id == null) {
				alert(`Failed to parse CSV, Meet not found: ${meet_name}`);
				return;
			}
			let event_name = row[2];
			let event_identifier = null;
			for (let ev of EVENTS) {
				if (event_name.includes(ev.label) || ev.alternates.some(alt => event_name.includes(alt))) {
					event_identifier = ev.value;
					break;
				}
			}
			
			let type_raw = row[3].toLowerCase();
			if (!type_raw.includes("individual") && !type_raw.includes("relay")) {
				console.log(type_raw);
				alert(`Failed to parse CSV, Invalid type: ${type_raw}`);
				return;
			}
			let type = type_raw.includes("individual") ? "individual" : "relay";
			let start_raw = row[4].toLowerCase();
			if (!start_raw.includes("flat") && !start_raw.includes("relay") && !start_raw.includes("fs") && !start_raw.includes("rs")) {
				alert(`Failed to parse CSV, Invalid start: ${start_raw}`);
				return;
			}
			let start = null;
			if (start_raw.includes("fs") || start_raw.includes("rs")) {
				start = start_raw.includes("fs") ? "flat" : "relay";
			} else {
				start = start_raw.includes("flat") ? "flat" : "relay";
			}
			if (start == null) {
				alert(`Failed to parse CSV, Invalid start: ${start_raw}`);
				return;
			}
			let raw_time = row[5];
			let time = null
			let split = raw_time.split(":");
			if (split.length > 2) {
				alert(`Failed to parse CSV, Invalid time (or time is more than an hour? expected format minutes:seconds): ${raw_time}`);
				return;
			}
			if (split.length == 2) {
				let minutes = parseInt(split[0]);
				let seconds = parseFloat(split[1]);
				time = minutes * 60 + seconds;
			} else {
				time = parseFloat(split[0]);
			}

			if (time == null || isNaN(time)) {
				alert(`Failed to parse CSV, Invalid time: ${raw_time}`);
				return;
			}


			final_rows.push({
				swimmer_id: swimmer_id,
				meet_id: meet_id,
				event: event_identifier,
				type: type,
				start: start,
				time: time
			});


		}

		await fetch("https://swimming-api.ryanyun2010.workers.dev/records", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`
			},
			body: JSON.stringify(final_rows)
		});
		e.target.reset();
		alert("Records added");
	};
	
	
	const addSwimmer = async (e) => {
		e.preventDefault();
		const f = new FormData(e.target);

		await fetch("https://swimming-api.ryanyun2010.workers.dev/swimmers", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`
			},
			body: JSON.stringify({
				name: f.get("name"),
				graduating_year: Number(f.get("graduating_year")),
			})
		});

		e.target.reset();
		alert("Swimmer added");
		const swimmerRes = await fetch(
			"https://swimming-api.ryanyun2010.workers.dev/swimmers"
		);
		try {
			const swimmerData = await swimmerRes.json();
			setSwimmers(swimmerData);
		}	 catch (error) {
			console.error("Failed to parse swimmer data:", error);
			return;
		}
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
						<input name="name" placeholder="Swimmer Name" required />
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
				<input name="file" id="csvInput" accept=".csv" type="file"/>

						<button>Add Records</button>
				</form>
				</>
			)}
		</div>
	);
}
