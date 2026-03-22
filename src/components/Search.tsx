import { JSX } from "react";
import { SearchParamHandler } from "../hooks/useSearchParamHandler";
import { SwimData } from "../hooks/useSwimData";
import { Relay } from "../lib/defs";
import { ParsedTime } from "../hooks/useParsedTimes";
import { Header } from "./Header";
import { TimeCards } from "./TimeCards";
import { RelayHelpers } from "../hooks/useRelayHelpers";
import { RelayCards } from "./RelayCards";

type SearchProps = {
	data: SwimData,
	searchParamHandler: SearchParamHandler;
	relayHelpers: RelayHelpers;
	curRelays: Relay[];
	curParsedTimes: ParsedTime[];
}

export function Search({data, searchParamHandler, relayHelpers, curRelays, curParsedTimes}: SearchProps): JSX.Element {
	const { setSearchParams } = searchParamHandler;
	return (<div className="app-shell">
				<div className="app-inner">
					<div className="accent-card hero-card">
						<div className="hero-row">
							<div>
								<div className="hero-eyebrow">Records View</div>
								<h1 className="hero-title">Nueva Swimming Records</h1>
								<div className="hero-subtitle">
									<Header searchParamHandler={searchParamHandler} />
								</div>
							</div>
							<button
								type="button"
								onClick={() => setSearchParams({})}
								className="back-button"
							>
								Back to Meets
							</button>
						</div>
					</div>

					<div className="section-block">
						<div className="section-header">
							<div className="section-bar" />
							<h2 className="section-title">Event Results</h2>
						</div>
						<ul className="card-list">
							<TimeCards data={data} curParsedTimes={curParsedTimes} searchParamHandler={searchParamHandler} />
							<RelayCards data={data} curRelays={curRelays} searchParamHandler={searchParamHandler} relayHelpers={relayHelpers} />
						</ul>
					</div>
				</div>
			</div>)

}
