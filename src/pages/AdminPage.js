import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { readCSV } from "../lib/utils";
import { assertIsGoogleAuthObject, assertAreSwimmers, assertAreMeets, findEventFromLabel, EVENTS } from "../lib/defs";
export default function AdminPage() {
    const [token, setToken] = useState(null);
    const [userEmail, setUserEmail] = useState(null);
    const [loggedIn, setLoggedIn] = useState(false);
    const [meets, setMeets] = useState([]);
    const [swimmers, setSwimmers] = useState([]);
    const onLogin = async (res) => {
        try {
            assertIsGoogleAuthObject(res);
        }
        catch (e) {
            return alert("Login failed: Google gave an invalid response: " + e.message);
        }
        const idToken = res.credential;
        setToken(idToken);
        const verify = await fetch("https://swimming-api.ryanyun2010.workers.dev/verify", {
            method: "POST",
            headers: { Authorization: `Bearer ${idToken}` }
        });
        if (!verify.ok)
            return alert("Login failed: " + (await verify.text()));
        const data = await verify.json();
        setUserEmail(data.email);
        setLoggedIn(true);
    };
    // load meets & swimmers
    useEffect(() => {
        if (!loggedIn)
            return;
        try {
            fetch("https://swimming-api.ryanyun2010.workers.dev/meets")
                .then((r) => r.json())
                .then((r) => {
                assertAreMeets(r);
                setMeets(r);
            });
            fetch("https://swimming-api.ryanyun2010.workers.dev/swimmers")
                .then((r) => r.json())
                .then((r) => {
                assertAreSwimmers(r);
                setSwimmers(r);
            });
        }
        catch (e) {
            alert("Failed to load data: " + e.message);
        }
    }, [loggedIn]);
    const addMeet = async (e) => {
        e.preventDefault();
        const f = new FormData(e.target);
        const [year, month, day] = f.get("date").split("-").map(Number);
        const dateInSeconds = Date.UTC(year, month - 1, day) / 1000;
        try {
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
        }
        catch (error) {
            alert(`Failed to add meet: ${error}`);
            return;
        }
        const meetsRes = await fetch("https://swimming-api.ryanyun2010.workers.dev/meets");
        if (!meetsRes.ok) {
            alert(`Failed to fetch meets: ${await meetsRes.text()}`);
            return;
        }
        const meetsData = await meetsRes.json();
        setMeets(meetsData);
    };
    const addRecord = async (e) => {
        e.preventDefault();
        const f = new FormData(e.target);
        try {
            await fetch("https://swimming-api.ryanyun2010.workers.dev/records", {
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
            });
        }
        catch (error) {
            alert(`Failed to add record: ${error}`);
            return;
        }
        e.target.reset();
        alert("Record added");
    };
    const find_swimmer_id = (swimmer_name) => {
        for (let s of swimmers) {
            if (swimmer_name.includes(s.name)) {
                return Number(s.id);
            }
        }
        return null;
    };
    const find_meet_id = (meet_name) => {
        for (let m of meets) {
            if (meet_name.includes(m.name)) {
                return Number(m.id);
            }
        }
        return null;
    };
    const addRecordsBulk = async (e) => {
        e.preventDefault();
        const f = new FormData(e.target);
        let file = f.get("file");
        if (!file)
            return;
        let read = await readCSV(file);
        let final_rows = [];
        let relays = [];
        for (let i = 1; i < read.length; i++) {
            let row = read[i];
            /* check if relay */
            console.log("row", row);
            if (row.length < 6) {
                alert(`Failed to parse CSV, Row has insufficient columns: ${row}`);
                return;
            }
            if (row.length == 7 || row.length == 8 || row.length > 9) {
                alert(`Failed to parse CSV, Row has invalid number of columns: ${row}`);
                return;
            }
            if (row.length == 9) {
                let swimmer_names = [row[0], row[1], row[2], row[3]];
                let swimmer_ids = [];
                for (let swimmer_name of swimmer_names) {
                    let swimmer_id = find_swimmer_id(swimmer_name.trim());
                    if (swimmer_id == null) {
                        alert(`Failed to parse CSV, Swimmer not found: ${swimmer_name}`);
                        return;
                    }
                    swimmer_ids.push(swimmer_id);
                }
                let meet_name = row[4];
                let meet_id = find_meet_id(meet_name);
                if (meet_id == null) {
                    alert(`Failed to parse CSV, Meet not found: ${meet_name}`);
                    return;
                }
                let raw_time = row[8];
                let time = null;
                let split = raw_time.split(":");
                if (split.length > 2) {
                    alert(`Failed to parse CSV, Invalid time (or time is more than an hour? expected format minutes:seconds): ${raw_time}`);
                    return;
                }
                if (split.length == 2) {
                    let minutes = parseInt(split[0]);
                    let seconds = parseFloat(split[1]);
                    time = minutes * 60 + seconds;
                }
                else {
                    time = parseFloat(split[0]);
                }
                if (time == null || isNaN(time)) {
                    alert(`Failed to parse CSV, Invalid time: ${raw_time}`);
                    return;
                }
                let relay_type_raw = row[5].toLowerCase();
                let relay_type = null;
                if (relay_type_raw.includes("200 mr") ||
                    relay_type_raw.includes("200 medley relay")) {
                    relay_type = "200_mr";
                }
                else if (relay_type_raw.includes("200 fr") ||
                    relay_type_raw.includes("200 free relay")) {
                    relay_type = "200_fr";
                }
                else if (relay_type_raw.includes("400 fr") ||
                    relay_type_raw.includes("400 free relay")) {
                    relay_type = "400_fr";
                }
                else {
                    alert(`Failed to parse CSV, Invalid relay type: ${relay_type_raw}`);
                    return;
                }
                relays.push({
                    swimmer_ids: swimmer_ids,
                    meet_id: meet_id,
                    relay_type: relay_type,
                    time: time
                });
                continue;
            }
            /* non-relays */
            let swimmer_name = row[0];
            let swimmer_id = find_swimmer_id(swimmer_name);
            if (swimmer_id == null) {
                alert(`Failed to parse CSV, Swimmer not found: ${swimmer_name}`);
                return;
            }
            let meet_name = row[1];
            let meet_id = find_meet_id(meet_name);
            if (meet_id == null) {
                alert(`Failed to parse CSV, Meet not found: ${meet_name}`);
                return;
            }
            let event_name = row[2];
            let event_identifier = findEventFromLabel(event_name);
            if (event_identifier == null) {
                alert(`Failed to parse CSV, Event not found: ${event_name}`);
                return;
            }
            let type_raw = row[3].toLowerCase();
            if (!type_raw.includes("individual") &&
                !type_raw.includes("relay")) {
                console.log(type_raw);
                alert(`Failed to parse CSV, Invalid type: ${type_raw}`);
                return;
            }
            let type = type_raw.includes("individual") ? "individual" : "relay";
            let start_raw = row[4].toLowerCase();
            if (!start_raw.includes("flat") &&
                !start_raw.includes("relay") &&
                !start_raw.includes("fs") &&
                !start_raw.includes("rs")) {
                alert(`Failed to parse CSV, Invalid start: ${start_raw}`);
                return;
            }
            let start = null;
            if (start_raw.includes("fs") || start_raw.includes("rs")) {
                start = start_raw.includes("fs") ? "flat" : "relay";
            }
            else {
                start = start_raw.includes("flat") ? "flat" : "relay";
            }
            if (start == null) {
                alert(`Failed to parse CSV, Invalid start: ${start_raw}`);
                return;
            }
            let raw_time = row[5];
            let time = null;
            let split = raw_time.split(":");
            if (split.length > 2) {
                alert(`Failed to parse CSV, Invalid time (or time is more than an hour? expected format minutes:seconds): ${raw_time}`);
                return;
            }
            if (split.length == 2) {
                let minutes = parseInt(split[0]);
                let seconds = parseFloat(split[1]);
                time = minutes * 60 + seconds;
            }
            else {
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
        try {
            let res = await fetch("https://swimming-api.ryanyun2010.workers.dev/records", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(final_rows)
            });
            if (!res.ok) {
                let text = await res.text();
                alert(`Failed to upload records: ${text}`);
                return;
            }
        }
        catch (error) {
            alert(`Failed to upload records: ${error}`);
            return;
        }
        let records = [];
        try {
            let res = await fetch("https://swimming-api.ryanyun2010.workers.dev/records", { method: "GET" });
            if (!res.ok) {
                let text = await res.text();
                alert(`Failed to refresh records: ${text}`);
                return;
            }
            records = await res.json();
        }
        catch (error) {
            alert(`Failed to fetch records: ${error}`);
        }
        for (let relay of relays) {
            let record_ids = [];
            for (let record of records) {
                if (relay.swimmer_ids.includes(record.swimmer_id) &&
                    relay.meet_id == record.meet_id &&
                    record.type == "relay") {
                    let swimmer_num = relay.swimmer_ids.indexOf(record.swimmer_id) + 1;
                    let expected_event = "";
                    if (relay.relay_type == "200_mr") {
                        if (swimmer_num == 1) {
                            expected_event = "50_back";
                        }
                        else if (swimmer_num == 2) {
                            expected_event = "50_breast";
                        }
                        else if (swimmer_num == 3) {
                            expected_event = "50_fly";
                        }
                        else if (swimmer_num == 4) {
                            expected_event = "50_free";
                        }
                    }
                    else if (relay.relay_type == "200_fr") {
                        expected_event = `50_free`;
                    }
                    else if (relay.relay_type == "400_fr") {
                        expected_event = `100_free`;
                    }
                    if (record.event == expected_event) {
                        record_ids.push(record.id);
                    }
                }
            }
            if (record_ids.length < 4) {
                let swimmer_names = relay.swimmer_ids.map((id) => {
                    for (let s of swimmers) {
                        if (s.id == id)
                            return s.name;
                    }
                    return "Unknown";
                });
                alert(`Failed to parse CSV, Could not find all relay split records for ${relay.relay_type} relay with swimmers: ${swimmer_names.join(", ")}`);
                return;
            }
            if (record_ids.length > 4) {
                let swimmer_names = relay.swimmer_ids.map((id) => {
                    for (let s of swimmers) {
                        if (s.id == id)
                            return s.name;
                    }
                    return "Unknown";
                });
                alert(`Failed to parse CSV, Found too many relay split records for ${relay.relay_type} relay with swimmers: ${swimmer_names.join(", ")}, expected 4 but found ${record_ids.length}, did a swimmer swim multiple legs?`);
                return;
            }
            await fetch("https://swimming-api.ryanyun2010.workers.dev/relays", {
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
            });
        }
        e.target.reset();
        alert("Records added");
    };
    const addSwimmer = async (e) => {
        e.preventDefault();
        const f = new FormData(e.target);
        try {
            await fetch("https://swimming-api.ryanyun2010.workers.dev/swimmers", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: f.get("name"),
                    graduating_year: Number(f.get("graduating_year"))
                })
            });
        }
        catch (e) {
            alert(`Failed to add swimmer: ${e}`);
            return;
        }
        e.target.reset();
        alert("Swimmer added");
        const swimmerRes = await fetch("https://swimming-api.ryanyun2010.workers.dev/swimmers");
        try {
            const swimmerData = await swimmerRes.json();
            setSwimmers(swimmerData);
        }
        catch (error) {
            console.error("Failed to parse swimmer data:", error);
            return;
        }
    };
    return (_jsx("div", { style: { padding: 32 }, children: !loggedIn ? (_jsx(GoogleLogin, { onSuccess: onLogin })) : (_jsxs(_Fragment, { children: [_jsxs("p", { children: ["Logged in as ", _jsx("b", { children: userEmail })] }), _jsx("h2", { children: "Add Swimmer" }), _jsxs("form", { onSubmit: addSwimmer, children: [_jsx("input", { name: "name", placeholder: "Swimmer Name", required: true }), _jsx("input", { name: "graduating_year", placeholder: "Graduating year", type: "number", step: "1", required: true }), _jsx("button", { children: "Add Swimmer" })] }), _jsx("h2", { children: "Add Meet" }), _jsxs("form", { onSubmit: addMeet, children: [_jsx("input", { name: "name", placeholder: "Meet name", required: true }), _jsx("input", { name: "location", placeholder: "Location", required: true }), _jsx("input", { name: "date", type: "date", required: true }), _jsx("button", { children: "Add Meet" })] }), _jsx("h2", { children: "Add Record" }), _jsxs("form", { onSubmit: addRecord, children: [_jsxs("select", { name: "swimmer_id", required: true, children: [_jsx("option", { value: "", children: "Select swimmer" }), swimmers.map((s) => (_jsxs("option", { value: s.id, children: [s.name, " '", s.graduating_year % 100] }, s.id)))] }), _jsxs("select", { name: "meet_id", required: true, children: [_jsx("option", { value: "", children: "Select meet" }), meets.map((m) => (_jsx("option", { value: m.id, children: m.name }, m.id)))] }), _jsxs("select", { name: "event", required: true, children: [_jsx("option", { value: "", children: "Select event" }), EVENTS.map((e) => (_jsx("option", { value: e.value, children: e.label }, e.value)))] }), _jsxs("select", { name: "type", children: [_jsx("option", { value: "individual", children: "Individual" }), _jsx("option", { value: "relay", children: "Relay" })] }), _jsxs("select", { name: "start", children: [_jsx("option", { value: "flat", children: "Flat start" }), _jsx("option", { value: "relay", children: "Relay start" })] }), _jsx("input", { name: "time", type: "number", step: "0.01", placeholder: "Time (seconds)", required: true }), _jsx("button", { children: "Add Record" })] }), _jsx("h2", { children: "Add Records" }), _jsxs("form", { onSubmit: addRecordsBulk, children: [_jsx("input", { name: "file", id: "csvInput", accept: ".csv", type: "file" }), _jsx("button", { children: "Add Records" })] })] })) }));
}
