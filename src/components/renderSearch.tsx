import { JSX } from "react";
import { SearchParamHandler } from "../hooks/useSearchParamHandler";

export function renderSearch(searchParamHandler: SearchParamHandler, header: JSX.Element, timeCards: JSX.Element[], relayCards: JSX.Element[]): JSX.Element {
	const { setSearchParams } = searchParamHandler;
	return (<div className="app-shell">
				<div className="app-inner">
					<div className="accent-card hero-card">
						<div className="hero-row">
							<div>
								<div className="hero-eyebrow">Records View</div>
								<h1 className="hero-title">Nueva Swimming Records</h1>
								<div className="hero-subtitle">{header}</div>
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
								{timeCards}
								{relayCards}
						</ul>
					</div>
				</div>
			</div>)

}
