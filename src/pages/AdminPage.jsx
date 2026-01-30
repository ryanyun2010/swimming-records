import { useEffect, useState } from "react";
import { GoogleLogin } from "@react-oauth/google";

const EVENTS = [
	{ value: "50_free", label: "50 Free" },
	{ value: "50_back", label: "50 Back" },
	{ value: "50_breast", label: "50 Breast" },
	{ value: "50_fly", label: "50 Fly" },
	{ value: "100_free", label: "100 Free" },
	{ value: "100_back", label: "100 Back" },
	{ value: "100_breast", label: "100 Breast" },
	{ value: "100_fly", label: "100 Fly" },
	{ value: "200_free", label: "200 Free" },
	{ value: "200_im", label: "200 IM" },
	{ value: "500_free", label: "500 Free" }
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
			body: JSON.stringify({
				swimmer_id: Number(f.get("swimmer_id")),
				meet_id: Number(f.get("meet_id")),
				event: f.get("event"),
				type: f.get("type"),
				start: f.get("start"),
				time: Number(f.get("time"))
			})
		});

		e.target.reset();
		alert("Record added");
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
				</>
			)}
		</div>
	);
}
