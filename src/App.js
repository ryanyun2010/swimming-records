import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import AdminPage from "./pages/AdminPage"; // your AdminPage component
import { formatDate } from "./lib/utils";
import { assertAreTimes, assertAreMeets } from "./lib/defs";
function Home() {
    const [times, setTimes] = useState([]);
    const [recentMeets, setRecentMeets] = useState([]);
    useEffect(() => {
        fetch("https://swimming-api.ryanyun2010.workers.dev")
            .then((res) => {
            if (!res.ok)
                throw new Error(`HTTP ${res.status}`);
            return res.json();
        })
            .then((data) => {
            assertAreTimes(data.times);
            setTimes(data);
        })
            .catch((err) => {
            console.error("Failed to load records:", err);
            alert("Failed to load records, see console");
        });
        fetch("https://swimming-api.ryanyun2010.workers.dev/recent_meets")
            .then((res) => {
            if (!res.ok)
                throw new Error(`HTTP ${res.status}`);
            return res.json();
        })
            .then((data) => {
            assertAreMeets(data.meets);
            setRecentMeets(data);
        })
            .catch((err) => {
            console.error("Failed to load records:", err);
            alert("Failed to load records, see console");
        });
    }, []);
    return (_jsxs("div", { style: { padding: "2rem", fontFamily: "sans-serif" }, children: [_jsx("h1", { children: "Nueva Swimming Records" }), _jsx("h2", { children: "Recent Meets" }), _jsx("ul", { style: { listStyle: "none", padding: 0 }, children: recentMeets.map((r) => (_jsx("li", { style: {
                        padding: "0.5rem 0",
                        borderBottom: "1px solid #ddd"
                    }, children: _jsxs("strong", { children: [r.name, " | ", r.location, " | ", formatDate(parseInt(r.date))] }) }, r.id))) })] }));
}
// --- Main App with routing ---
function App() {
    return (_jsx(GoogleOAuthProvider, { clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID, children: _jsx(Router, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(Home, {}) }), _jsx(Route, { path: "/admin", element: _jsx(AdminPage, {}) })] }) }) }));
}
export default App;
