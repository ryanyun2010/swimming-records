import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import "./App.css";
import { BrowserRouter as Router, Routes, Route, useSearchParams } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import AdminPage from "./pages/AdminPage"; // your AdminPage component
import { formatDate, getResponseJSONAndParse, formatTime } from "./lib/utils";
import { timesSchema, meetsSchema, formatEventLabel, swimmersSchema, relaySchema } from "./lib/defs";
import { z } from "zod";
import * as Errors from "./lib/errors";
import { ResultAsync } from "neverthrow";
function Home() {
    const [recentMeets, setRecentMeets] = useState([]);
    const [searchParams, setSearchParams] = useSearchParams();
    const [currentTimes, setCurrentTimes] = useState([]);
    const [currentRelays, setCurrentRelays] = useState([]);
    const [curMeetInfo, setCurMeetInfo] = useState(null);
    const [curSwimmerInfo, setCurSwimmerInfo] = useState(null);
    const [curRelayInfo, setCurRelayInfo] = useState(null);
    const [rawTimes, setRawTimes] = useState([]);
    const [swimmers, setSwimmers] = useState([]);
    const [meets, setMeets] = useState([]);
    const [relays, setRelays] = useState([]);
    const [parsedTimes, setParsedTimes] = useState({});
    useEffect(() => {
        ResultAsync.fromPromise(fetch("https://swimming-api.ryanyun2010.workers.dev/swimmers"), (e) => new Errors.NoResponse(`Failed to fetch swimmers: ${JSON.stringify(e)}`))
            .andThen((res) => getResponseJSONAndParse(res, swimmersSchema, (e) => new Errors.MalformedResponse(`Failed to parse swimmers response: ${JSON.stringify(e)}`)))
            .match((data) => {
            setSwimmers(data.reduce((acc, swimmer) => {
                ;
                acc[swimmer.id] = swimmer;
                return acc;
            }, {}));
        }, (err) => {
            console.error("Failed to load swimmers:", err);
            alert("Failed to load swimmers, see console");
        });
        ResultAsync.fromPromise(fetch("https://swimming-api.ryanyun2010.workers.dev/"), (e) => new Errors.NoResponse(`Failed to fetch records: ${JSON.stringify(e)}`))
            .andThen((res) => getResponseJSONAndParse(res, timesSchema, (e) => new Errors.MalformedResponse(`Failed to parse records response: ${JSON.stringify(e)}`)))
            .match((data) => {
            setRawTimes(data.reduce((acc, time) => {
                acc[time.id] = time;
                return acc;
            }, {}));
        }, (err) => {
            console.error("Failed to load records:", err);
            alert("Failed to load records, see console");
        });
        ResultAsync.fromPromise(fetch("https://swimming-api.ryanyun2010.workers.dev/meets"), (e) => new Errors.NoResponse(`Failed to fetch meets: ${JSON.stringify(e)}`))
            .andThen((res) => getResponseJSONAndParse(res, meetsSchema, (e) => new Errors.MalformedResponse(`Failed to parse meets response: ${JSON.stringify(e)}`)))
            .match((data) => {
            setMeets(data.reduce((acc, meet) => {
                acc[meet.id] = meet;
                return acc;
            }, {}));
            setRecentMeets(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5));
        }, (err) => {
            console.error("Failed to load meet records:", err);
            alert("Failed to load meets, see console");
        });
        ResultAsync.fromPromise(fetch("https://swimming-api.ryanyun2010.workers.dev/relays"), (e) => new Errors.NoResponse(`Failed to fetch relays: ${JSON.stringify(e)}`))
            .andThen((res) => getResponseJSONAndParse(res, z.array(relaySchema), (e) => new Errors.MalformedResponse(`Failed to parse relays response: ${JSON.stringify(e)}`)))
            .match((data) => {
            setRelays(data.reduce((acc, relay) => {
                acc[relay.id] = relay;
                return acc;
            }, {}));
        }, (err) => {
            console.error("Failed to load relays:", err);
            alert("Failed to load relays, see console");
        });
    }, []);
    useEffect(() => {
        let parsedTimes = Object.values(rawTimes).reduce((acc, time) => {
            acc[time.id] = {
                ...time,
                current_PR: null,
                current_SR: null,
                previous_PR: null,
                previous_SR: null
            };
            return acc;
        }, {});
        let byEvent = {};
        let byPersonByEvent = {};
        for (let entry of Object.entries(rawTimes)) {
            const time = entry[1];
            let evt_identifier = time.event + ((time.type == "relay" && time.start == "relay") ? "|relay" : "");
            byEvent[evt_identifier] = [...(byEvent[evt_identifier] ?? []), { date: time.meet_date, record_id: time.id, time: time.time }];
            if (!byPersonByEvent[time.swimmer_name]) {
                byPersonByEvent[time.swimmer_name] = {};
            }
            byPersonByEvent[time.swimmer_name][evt_identifier] = [...(byPersonByEvent[time.swimmer_name][evt_identifier] ?? []), { date: time.meet_date, record_id: time.id, time: time.time }];
        }
        for (let event of Object.entries(byEvent)) {
            const times = [...event[1]].sort((a, b) => a.date - b.date);
            let cur_best = null;
            let potential_SRs = [];
            for (let time of times) {
                if (cur_best == null || time.time < cur_best.time) {
                    cur_best = time;
                    if (potential_SRs.length > 0) {
                        if (potential_SRs[potential_SRs.length - 1].date == time.date) {
                            // if there are multiple times on the same day, only the best one can be a SR, so we pop any previous potentials from that day
                            potential_SRs.pop();
                        }
                    }
                    potential_SRs.push(time);
                }
            }
            if (!cur_best) {
                continue;
            }
            if (cur_best.record_id in parsedTimes) {
                if (potential_SRs.length > 1) {
                    parsedTimes[cur_best.record_id].current_SR = { change: cur_best.time - potential_SRs[potential_SRs.length - 2].time };
                }
                else {
                    parsedTimes[cur_best.record_id].current_SR = { change: null };
                }
            }
            for (let i = 0; i < potential_SRs.length - 1; i++) {
                let time = potential_SRs[i];
                if (time.record_id in parsedTimes) {
                    if (i > 0) {
                        parsedTimes[time.record_id].previous_SR = { change: time.time - potential_SRs[i - 1].time, til: potential_SRs[i + 1].date };
                    }
                    else {
                        parsedTimes[time.record_id].previous_SR = { change: null, til: potential_SRs[i + 1].date };
                    }
                }
            }
        }
        for (let swimmer of Object.entries(byPersonByEvent)) {
            const byEventStore = swimmer[1];
            for (let event of Object.entries(byEventStore)) {
                const times = [...event[1]].sort((a, b) => a.date - b.date);
                let cur_best = null;
                let potential_PRs = [];
                for (let time of times) {
                    if (cur_best == null || time.time < cur_best.time) {
                        cur_best = time;
                        if (potential_PRs.length > 0) {
                            if (potential_PRs[potential_PRs.length - 1].date == time.date) {
                                // if there are multiple times on the same day, only the best one can be a PR, so we pop any previous potentials from that day
                                potential_PRs.pop();
                            }
                        }
                        potential_PRs.push(time);
                    }
                }
                if (!cur_best) {
                    continue;
                }
                if (cur_best.record_id in parsedTimes) {
                    if (potential_PRs.length > 1) {
                        parsedTimes[cur_best.record_id].current_PR = { change: cur_best.time - potential_PRs[potential_PRs.length - 2].time };
                    }
                    else {
                        parsedTimes[cur_best.record_id].current_PR = { change: null };
                    }
                }
                for (let i = 0; i < potential_PRs.length - 1; i++) {
                    let time = potential_PRs[i];
                    if (time.record_id in parsedTimes) {
                        if (i > 0) {
                            parsedTimes[time.record_id].previous_PR = { change: time.time - potential_PRs[i - 1].time, til: potential_PRs[i + 1].date };
                        }
                        else {
                            parsedTimes[time.record_id].previous_PR = { change: null, til: potential_PRs[i + 1].date };
                        }
                    }
                }
            }
        }
        setParsedTimes(parsedTimes);
    }, [rawTimes, swimmers, meets, relays]);
    useEffect(() => {
        setCurMeetInfo(null);
        setCurSwimmerInfo(null);
        setCurRelayInfo(null);
        if (searchParams.get("meet_id") != null && searchParams.get("meet_id").length > 0) {
            setCurMeetInfo(meets[parseInt(searchParams.get("meet_id"))] ?? null);
        }
        if (searchParams.get("swimmer_id") != null && searchParams.get("swimmer_id").length > 0) {
            setCurSwimmerInfo(swimmers[parseInt(searchParams.get("swimmer_id"))] ?? null);
        }
        if (searchParams.get("relay_id") != null && searchParams.get("relay_id").length > 0) {
            let id = parseInt(searchParams.get("relay_id"));
            const relay = relays[id] ?? null;
            if (relay) {
                const record1 = parsedTimes[relay.record_1_id];
                const record2 = parsedTimes[relay.record_2_id];
                const record3 = parsedTimes[relay.record_3_id];
                const record4 = parsedTimes[relay.record_4_id];
                const swimmer_names = [record1, record2, record3, record4].map((rec) => rec?.swimmer_name ?? "Unknown");
                const date = record1?.meet_date ?? Date.now();
                const event = relay.relay_type == "200_mr" ? "200 Medley Relay" : relay.relay_type == "200_fr" ? "200 Freestyle Relay" : "400 Freestyle Relay";
                setCurRelayInfo({ id, swimmer_names, date, event });
            }
        }
    }, [searchParams, swimmers, meets, relays]);
    useEffect(() => {
        if (curRelayInfo != null && curMeetInfo == null && curSwimmerInfo == null) {
            const relay = relays[curRelayInfo.id] ?? null;
            if (relay) {
                const record1 = parsedTimes[relay.record_1_id];
                const record2 = parsedTimes[relay.record_2_id];
                const record3 = parsedTimes[relay.record_3_id];
                const record4 = parsedTimes[relay.record_4_id];
                setCurrentTimes([record1, record2, record3, record4].filter((t) => t !== undefined));
                setCurrentRelays(relays[curRelayInfo.id] ? [relays[curRelayInfo.id]] : []);
            }
            else {
                setCurrentTimes([]);
                setCurrentRelays([]);
            }
        }
        else if (curMeetInfo != null && curSwimmerInfo == null) {
            setCurrentTimes(Object.values(parsedTimes).filter((t) => t.meet_id == curMeetInfo.id));
            setCurrentRelays(Object.values(relays).filter((r) => {
                const record1 = parsedTimes[r.record_1_id];
                const record2 = parsedTimes[r.record_2_id];
                const record3 = parsedTimes[r.record_3_id];
                const record4 = parsedTimes[r.record_4_id];
                return [record1, record2, record3, record4].some((rec) => rec?.meet_id == curMeetInfo.id);
            }));
        }
        else if (curSwimmerInfo != null && curMeetInfo == null) {
            setCurrentTimes(Object.values(parsedTimes).filter((t) => t.swimmer_id == curSwimmerInfo.id));
            setCurrentRelays(Object.values(relays).filter((r) => {
                const record1 = parsedTimes[r.record_1_id];
                const record2 = parsedTimes[r.record_2_id];
                const record3 = parsedTimes[r.record_3_id];
                const record4 = parsedTimes[r.record_4_id];
                return [record1, record2, record3, record4].some((rec) => rec?.swimmer_id == curSwimmerInfo.id);
            }));
        }
        else if (curSwimmerInfo != null && curMeetInfo != null) {
            setCurrentTimes(Object.values(parsedTimes).filter((t) => t.swimmer_id == curSwimmerInfo.id && t.meet_id == curMeetInfo.id));
            setCurrentRelays(Object.values(relays).filter((r) => {
                const record1 = parsedTimes[r.record_1_id];
                const record2 = parsedTimes[r.record_2_id];
                const record3 = parsedTimes[r.record_3_id];
                const record4 = parsedTimes[r.record_4_id];
                return [record1, record2, record3, record4].some((rec) => rec?.swimmer_id == curSwimmerInfo.id && rec?.meet_id == curMeetInfo.id);
            }));
        }
        else {
            setCurrentTimes([]);
            setCurrentRelays([]);
        }
    }, [curMeetInfo, curSwimmerInfo, parsedTimes, relays, curRelayInfo]);
    function renderHeader() {
        if (curRelayInfo != null && curMeetInfo == null && curSwimmerInfo == null) {
            return _jsxs("h2", { children: ["Results for Relay: ", curRelayInfo.event, " | ", curRelayInfo.swimmer_names.join(", "), " | ", formatDate(curRelayInfo.date)] });
        }
        else if (curMeetInfo != null && curSwimmerInfo == null) {
            return _jsxs("h2", { children: ["Results for Meet: ", curMeetInfo.name, " | ", curMeetInfo.location, " | ", formatDate(curMeetInfo.date)] });
        }
        else if (curSwimmerInfo != null && curMeetInfo == null) {
            return _jsxs("h2", { children: ["Results for Swimmer: ", curSwimmerInfo.name, " '", curSwimmerInfo.graduating_year % 100] });
        }
        else if (curSwimmerInfo != null && curMeetInfo != null) {
            return _jsxs("h2", { children: ["Results for Swimmer: ", curSwimmerInfo.name, " '", curSwimmerInfo.graduating_year % 100, " at Meet: ", curMeetInfo.name, " | ", curMeetInfo.location, " | ", formatDate(curMeetInfo.date)] });
        }
        else {
            return _jsx("h2", { children: "Invalid search params" });
        }
    }
    function getRelayID(record_id) {
        const relay = Object.values(relays).find((r) => r.record_1_id == record_id || r.record_2_id == record_id || r.record_3_id == record_id || r.record_4_id == record_id);
        return relay ? relay.id : null;
    }
    function formatChange(change) {
        if (change === null || change === undefined)
            return "";
        const sign = change < 0 ? "-" : "+";
        const seconds = Math.abs(change).toFixed(2);
        return `${sign}${seconds}s`;
    }
    if (searchParams.get("meet_id") == null && searchParams.get("swimmer_id") == null && searchParams.get("relay_id") == null) {
        return (_jsx("div", { className: "app-shell", children: _jsxs("div", { className: "app-inner", children: [_jsx("div", { className: "accent-card hero-card", children: _jsx("div", { className: "hero-row", children: _jsxs("div", { children: [_jsx("div", { className: "hero-eyebrow", children: "Nueva Swim & Dive Team" }), _jsx("h1", { className: "hero-title", children: "Swimming Records" }), _jsx("p", { className: "hero-subtitle", children: "Select a meet to see results." })] }) }) }), _jsxs("div", { className: "section-block", children: [_jsxs("div", { className: "section-header", children: [_jsx("div", { className: "section-bar" }), _jsx("h2", { className: "section-title", children: "Recent Meets" })] }), _jsx("ul", { className: "card-list", children: recentMeets.map((r) => (_jsx("li", { className: "accent-card meet-card", onClick: () => setSearchParams({ meet_id: r.id.toString() }), children: _jsxs("div", { className: "meet-row", children: [_jsx("div", { className: "meet-title", children: r.name }), _jsxs("div", { className: "meet-meta", children: [r.location, " \u00B7 ", formatDate(r.date)] })] }) }, r.id))) })] })] }) }));
    }
    else {
        return (_jsx("div", { className: "app-shell", children: _jsxs("div", { className: "app-inner", children: [_jsx("div", { className: "accent-card hero-card", children: _jsxs("div", { className: "hero-row", children: [_jsxs("div", { children: [_jsx("div", { className: "hero-eyebrow", children: "Records View" }), _jsx("h1", { className: "hero-title", children: "Nueva Swimming Records" }), _jsx("div", { className: "hero-subtitle", children: renderHeader() })] }), _jsx("button", { type: "button", onClick: () => setSearchParams({}), className: "back-button", children: "Back to Meets" })] }) }), _jsxs("div", { className: "section-block", children: [_jsxs("div", { className: "section-header", children: [_jsx("div", { className: "section-bar" }), _jsx("h2", { className: "section-title", children: "Event Results" })] }), _jsxs("ul", { className: "card-list", children: [currentTimes.map((r) => {
                                        const isSchoolRecord = r.current_SR != null;
                                        const isSchoolRecordFirst = r.current_SR?.change === null;
                                        const isPersonalRecord = r.current_PR != null && r.current_PR.change !== null;
                                        const isFirstTimeSwim = r.current_PR?.change === null;
                                        const srDelta = formatChange(r.current_SR?.change);
                                        const prDelta = formatChange(r.current_PR?.change);
                                        const previousPR = r.previous_PR ?? null;
                                        const previousSR = r.previous_SR ?? null;
                                        return (_jsxs("li", { className: "accent-card result-card", children: [_jsxs("div", { className: "result-row", children: [_jsxs("div", { className: "name-line", children: [_jsxs("span", { onClick: () => setSearchParams({ swimmer_id: r.swimmer_id.toString() }), className: "name-link", children: [r.swimmer_name, " '", r.swimmer_year % 100] }), _jsx("span", { className: "divider-dot", children: "\u2022" }), _jsx("span", { className: "tag tag-event", children: formatEventLabel(r.event) }), _jsxs("div", { className: "tag-row", children: [(r.type == "relay") ? (_jsx("span", { style: { cursor: "pointer" }, className: "tag tag-meta", onClick: () => setSearchParams({ relay_id: (getRelayID(r.id) ?? "").toString() }), children: (r.start) == "flat" ? "Relay Split · Flat Start" : "Relay Split · Relay Start" })) : (_jsx("span", { className: "tag tag-meta", children: "Individual" })), isSchoolRecord ? (isSchoolRecordFirst ? _jsx("span", { className: "tag tag-sr-first", children: "SCHOOL RECORD: FIRST TIME" }) : _jsxs("span", { className: "tag tag-sr", children: ["SCHOOL RECORD ", srDelta] })) : null, isPersonalRecord ? _jsxs("span", { className: "tag tag-pr", children: ["PR ", prDelta] }) : null, isFirstTimeSwim ? _jsx("span", { className: "tag tag-fts", children: "FTS" }) : null, previousPR != null ?
                                                                            (previousPR.change === null
                                                                                ? _jsx("span", { className: "tag tag-fts", children: "FTS" }, `prev-pr}`)
                                                                                : _jsxs("span", { className: "tag tag-pr-prev", children: ["PREVIOUS PR ", formatChange(previousPR.change)] }, `prev-pr`)) : null, previousSR != null ?
                                                                            (previousSR.change === null
                                                                                ? _jsx("span", { className: "tag tag-sr-first", children: "PREVIOUS SCHOOL RECORD: FIRST TIME" }, `prev-sr`)
                                                                                : _jsxs("span", { className: "tag tag-sr-prev", children: ["PREVIOUS SCHOOL RECORD ", formatChange(previousSR.change)] }, `prev-sr`)) : null] })] }), _jsx("div", { className: "time", children: formatTime(r.time) })] }), _jsxs("div", { className: "meta-line", children: [r.meet_name, " \u00B7 ", formatDate(r.meet_date), " \u00B7 ", r.meet_location] })] }, r.id));
                                    }), currentRelays.map((r) => {
                                        const record1 = parsedTimes[r.record_1_id];
                                        const record2 = parsedTimes[r.record_2_id];
                                        const record3 = parsedTimes[r.record_3_id];
                                        const record4 = parsedTimes[r.record_4_id];
                                        return (_jsxs("li", { className: "accent-card result-card", children: [_jsxs("div", { className: "result-row", children: [_jsxs("div", { className: "name-line", children: [_jsxs("span", { onClick: () => {
                                                                        if (record1)
                                                                            setSearchParams({ swimmer_id: record1.swimmer_id.toString() });
                                                                    }, className: "name-link", children: [record1?.swimmer_name, " '", (record1?.swimmer_year ?? 0) % 100] }), _jsx("span", { className: "divider-dot", children: "\u2022" }), _jsxs("span", { onClick: () => {
                                                                        if (record2)
                                                                            setSearchParams({ swimmer_id: record2.swimmer_id.toString() });
                                                                    }, className: "name-link", children: [record2?.swimmer_name, " '", (record2?.swimmer_year ?? 0) % 100] }), _jsx("span", { className: "divider-dot", children: "\u2022" }), _jsxs("span", { onClick: () => {
                                                                        if (record3)
                                                                            setSearchParams({ swimmer_id: record3.swimmer_id.toString() });
                                                                    }, className: "name-link", children: [record3?.swimmer_name, " '", (record3?.swimmer_year ?? 0) % 100] }), _jsx("span", { className: "divider-dot", children: "\u2022" }), _jsxs("span", { onClick: () => {
                                                                        if (record4)
                                                                            setSearchParams({ swimmer_id: record4.swimmer_id.toString() });
                                                                    }, className: "name-link", children: [record4?.swimmer_name, " '", (record4?.swimmer_year ?? 0) % 100] }), _jsx("span", { className: "divider-dot", children: "\u2022" }), _jsx("span", { className: "tag tag-event", children: (r.relay_type == "200_mr") ? "200 Medley Relay" : (r.relay_type == "200_fr") ? "200 Freestyle Relay" : "400 Freestyle Relay" }), _jsx("div", { className: "tag-row", children: _jsx("span", { className: "tag tag-meta", style: { cursor: "pointer" }, onClick: () => setSearchParams({ relay_id: r.id.toString() }), children: "Relay" }) })] }), _jsx("div", { className: "time", children: formatTime(r.time) })] }), _jsxs("div", { className: "meta-line", children: [record1?.meet_name ?? "", record1?.meet_date ? ` · ${formatDate(record1.meet_date)}` : "", record1?.meet_location ? ` · ${record1.meet_location}` : ""] })] }, r.id));
                                    })] })] })] }) }));
    }
}
// --- Main App with routing ---
function App() {
    return (_jsx(GoogleOAuthProvider, { clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID, children: _jsx(Router, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(Home, {}) }), _jsx(Route, { path: "/admin", element: _jsx(AdminPage, {}) })] }) }) }));
}
export default App;
