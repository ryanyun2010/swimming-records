import "./App.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
// import AdminPage from "./pages/AdminPage";
import { useSwimData } from "./hooks/useSwimData";
import { useParsedTimes } from "./hooks/useParsedTimes";
import { useRelayHelpers } from "./hooks/useRelayHelpers";
import { useSearchParamHandler } from "./hooks/useSearchParamHandler";
import { useTimeFilterer } from "./hooks/useTimeFilterer";
import { RecentMeets } from "./components/RecentMeets";
import { Search } from "./components/Search";

function Home() {
	const data = useSwimData();
	const parsedTimes = useParsedTimes(data).match(
		(times) => times,
		(err) => {
			console.error("Failed to parse times:", err.toString());
			return [];
		},
	);

	const relayHelpers = useRelayHelpers(parsedTimes, data.relayLegs);
	const searchParamHandler = useSearchParamHandler(data, relayHelpers);
	const timeFilterer = useTimeFilterer(parsedTimes, data, relayHelpers, searchParamHandler);

	const { curMeetInfo, curSwimmerInfo, curRelayInfo } = searchParamHandler;
	if (curMeetInfo == null && curSwimmerInfo == null && curRelayInfo == null) {
		return <RecentMeets data={data} searchParamHandler={searchParamHandler} />;
	}
	return (
		<Search
			data={data}
			searchParamHandler={searchParamHandler}
			relayHelpers={relayHelpers}
			curRelays={timeFilterer.currentRelays}
			curParsedTimes={timeFilterer.currentTimes}
		/>
	);
}

// --- Main App with routing ---
function App() {
	return (
		<GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
			<Router>
				<Routes>
					<Route path="/" element={<Home />} />
					{/* <Route path="/admin" element={<AdminPage />} /> */}
				</Routes>
			</Router>
		</GoogleOAuthProvider>
	);
}

export default App;
