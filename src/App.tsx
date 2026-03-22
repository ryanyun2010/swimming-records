import "./App.css";
import { BrowserRouter as Router, Routes, Route} from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
// import AdminPage from "./pages/AdminPage"; 
import { useSwimData } from "./hooks/useSwimData";
import { useParsedTimes } from "./hooks/useParsedTimes";
import { useRelayHelpers } from "./hooks/useRelayHelpers";
import { useSearchParamHandler } from "./hooks/useSearchParamHandler";
import { useTimeFilterer } from "./hooks/useTimeFilterer";
import { renderRelayCards } from "./components/renderRelayCards";
import { renderTimeCards } from "./components/renderTimeCards";
import { renderRecentMeets } from "./components/renderRecentMeets";
import { renderSearch } from "./components/renderSearch";
import { renderHeader } from "./components/renderHeader";

function Home() {

	const data = useSwimData();
	const parsedTimes = useParsedTimes(data).match(
		(times) => times,
		(err) => {
			console.error("Failed to parse times:", err);
			return [];
		}
	);

	const relayHelpers = useRelayHelpers(parsedTimes, data.relayLegs);
	const searchParamHandler = useSearchParamHandler(data,relayHelpers);
	const timeFilterer = useTimeFilterer(parsedTimes,data,relayHelpers,searchParamHandler);

	const recentMeetsToRender = renderRecentMeets(data, searchParamHandler); 

	const {curMeetInfo, curSwimmerInfo, curRelayInfo} = searchParamHandler;
	if (curMeetInfo == null && curSwimmerInfo == null && curRelayInfo == null) {
		return recentMeetsToRender;
	}
	const headerToRender = renderHeader(searchParamHandler); 
	const relayCardsToRender = renderRelayCards(data, timeFilterer.currentRelays, searchParamHandler, relayHelpers);	
	const timeCardsToRender = renderTimeCards(data, timeFilterer.currentTimes, searchParamHandler); 
	return renderSearch(searchParamHandler, headerToRender, relayCardsToRender, timeCardsToRender);
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
