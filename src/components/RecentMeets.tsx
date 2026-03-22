import { SearchParamHandler } from "../hooks/useSearchParamHandler";
import { JSX } from "react";
import { SwimData } from "../hooks/useSwimData";
import { formatDate } from "../lib/utils";

type RecentMeetsProps = {
	data: SwimData;
	searchParamHandler: SearchParamHandler;
};
export function RecentMeets({
	data,
	searchParamHandler
}: RecentMeetsProps): JSX.Element {
	const { meets } = data;
	const { setSearchParams } = searchParamHandler;
	const meetCards = Object.values(meets).map((m) => (
		<li
			key={m.id}
			className="accent-card meet-card"
			onClick={() => setSearchParams({ meet_id: m.id.toString() })}
		>
			<div className="meet-row">
				<div className="meet-title">{m.name}</div>
				<div className="meet-meta">
					{m.location} · {formatDate(m.date)}
				</div>
			</div>
		</li>
	));
	return (
		<div className="app-shell">
			<div className="app-inner">
				<div className="accent-card hero-card">
					<div className="hero-row">
						<div>
							<div className="hero-eyebrow">
								Nueva Swim & Dive Team
							</div>
							<h1 className="hero-title">Swimming Records</h1>
							<p className="hero-subtitle">
								Select a meet to see results.
							</p>
						</div>
					</div>
				</div>
				<div className="section-block">
					<div className="section-header">
						<div className="section-bar" />
						<h2 className="section-title">Recent Meets</h2>
					</div>
					<ul className="card-list">{meetCards}</ul>
				</div>
			</div>
		</div>
	);
}
