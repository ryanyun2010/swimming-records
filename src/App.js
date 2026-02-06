import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import AdminPage from "./pages/AdminPage"; // your AdminPage component
import { formatDate } from "./lib/utils";
import { timesSchema, meetsSchema } from "./lib/defs";
import * as Errors from "./lib/errors";
import { ResultAsync, okAsync, errAsync } from "neverthrow";
function zodErrorToHumanReadable(err) {
    return err.issues
        .map(i => `${i.path.join(".")}: ${i.message}`)
        .join("; ");
}
function zodParseWith(schema, errFunc) {
    return (json) => {
        const parseResult = schema.safeParse(json);
        if (!parseResult.success) {
            return errAsync(errFunc(zodErrorToHumanReadable(parseResult.error)));
        }
        return okAsync(parseResult.data);
    };
}
function safeFetchAndParse(url, schema, fetchFailErrFunc, zodParseFailErrFunc) {
    return ResultAsync.fromPromise(fetch(url), (e) => fetchFailErrFunc(JSON.stringify(e)))
        .andThen(zodParseWith(schema, zodParseFailErrFunc));
}
function Home() {
    const [recentMeets, setRecentMeets] = useState([]);
    const [times, setTimes] = useState([]);
    useEffect(() => {
        safeFetchAndParse("https://swimming-api.ryanyun2010.workers.dev", timesSchema, (errMsg) => new Errors.NoResponse(`Failed to recieve a valid response from the records API: ${errMsg}`), (errMsg) => new Errors.MalformedResponse(`Recievied reponse from records API was invalid: ${errMsg}`))
            .match((data) => {
            setTimes(data);
        }, (err) => {
            console.error("Failed to load records:", err);
            alert("Failed to load records, see console");
        });
        safeFetchAndParse("https://swimming-api.ryanyun2010.workers.dev/recent_meets", meetsSchema, (errMsg) => new Errors.NoResponse(`Failed to recieve a valid response from the recent meets API: ${errMsg}`), (errMsg) => new Errors.MalformedResponse(`Recievied reponse from recent meets API was invalid: ${errMsg}`))
            .match((data) => {
            setRecentMeets(data);
        }, (err) => {
            console.error("Failed to load meet records:", err);
            alert("Failed to load records, see console");
        });
    }, []);
    return (_jsxs("div", { style: { padding: "2rem", fontFamily: "sans-serif" }, children: [_jsx("h1", { children: "Nueva Swimming Records" }), _jsx("h2", { children: "Recent Meets" }), _jsx("ul", { style: { listStyle: "none", padding: 0 }, children: recentMeets.map((r) => (_jsx("li", { style: {
                        padding: "0.5rem 0",
                        borderBottom: "1px solid #ddd"
                    }, children: _jsxs("strong", { children: [r.name, " | ", r.location, " | ", formatDate(r.date)] }) }, r.id))) })] }));
}
// --- Main App with routing ---
function App() {
    return (_jsx(GoogleOAuthProvider, { clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID, children: _jsx(Router, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(Home, {}) }), _jsx(Route, { path: "/admin", element: _jsx(AdminPage, {}) })] }) }) }));
}
export default App;
