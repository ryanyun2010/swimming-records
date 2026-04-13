import { JSX, useMemo, useState } from "react";
import { SearchParamHandler } from "../hooks/useSearchParamHandler";
import { SwimData } from "../hooks/useSwimData";
import { formatDate } from "../lib/utils";
import Fuse from 'fuse.js'

interface SearchableElement {
	searchParams: Record<string, string>;
	name: string;
}


export function FuzzySearch({searchParamHandler, data}: {searchParamHandler: SearchParamHandler, data: SwimData}): JSX.Element {
	const { setSearchParams } = searchParamHandler;
	const [searchQuery, setSearchQuery] = useState("");
	const elementsSearchable = useMemo(() => {
		let searchables: SearchableElement[] = [];
		searchables.push({
			name: "School Record Progressions",
			searchParams: { srs_only: "true", note_legs: "true" },
		});
		searchables.push({
			name: "Current School Records",
			searchParams: { cur_srs_only: "true", note_legs: "true" },
		});
		for (const swimmer of Object.values(data.swimmers)) {
			searchables.push({
				name: `All swims for ${swimmer.gender == 'male' ? 'Boys' : 'Girls'} Swimmer: ${swimmer.first_name} ${swimmer.last_name} '${swimmer.graduating}`,
				searchParams: { swimmer_id: swimmer.id.toString() },
			});
			searchables.push({
				name: `Personal record progressions for ${swimmer.gender == 'male' ? 'Boys' : 'Girls'} Swimmer: ${swimmer.first_name} ${swimmer.last_name} '${swimmer.graduating}`,
				searchParams: { swimmer_id: swimmer.id.toString(), prs_only: "true" },
			});
			searchables.push({
				name: `Current personal records for ${swimmer.gender == 'male' ? 'Boys' : 'Girls'} Swimmer: ${swimmer.first_name} ${swimmer.last_name} '${swimmer.graduating}`,
				searchParams: { swimmer_id: swimmer.id.toString(), cur_prs_only: "true" },
			});
			searchables.push({
				name: `School records held at some point by ${swimmer.gender == 'male' ? 'Boys' : 'Girls'} Swimmer: ${swimmer.first_name} ${swimmer.last_name} '${swimmer.graduating}`,
				searchParams: { swimmer_id: swimmer.id.toString(), srs_only: "true" },
			});
			searchables.push({
				name: `School records currently held by ${swimmer.gender == 'male' ? 'Boys' : 'Girls'} Swimmer: ${swimmer.first_name} ${swimmer.last_name} '${swimmer.graduating}`,
				searchParams: { swimmer_id: swimmer.id.toString(), srs_only: "true" },
			});
		}
		for (const meet of Object.values(data.meets)) {
			searchables.push({
				name: `All swims for Meet: ${meet.name} (${meet.location} ${formatDate(meet.date)})`,
				searchParams: { meet_id: meet.id.toString() },
			});
			searchables.push({
				name: `Personal records achieved at Meet: ${meet.name} (${meet.location} ${formatDate(meet.date)})`,
				searchParams: { meet_id: meet.id.toString(), prs_only: "true" },
			});
			searchables.push({
				name: `School records achieved at Meet: ${meet.name} (${meet.location} ${formatDate(meet.date)})`,
				searchParams: { meet_id: meet.id.toString(), srs_only: "true", note_legs: "true" },
			});
			searchables.push({
				name: `First time swims at Meet: ${meet.name} (${meet.location} ${formatDate(meet.date)})`,
				searchParams: { meet_id: meet.id.toString(), fts_only: "true" },
			});
		}
		for (const event of Object.values(data.events)) {
			searchables.push({
				name: `All swims for Event: ${event.name}`,
				searchParams: { event_id: event.id.toString() },
			});
			searchables.push({
				name: `School record progression for Event: ${event.name}`,
				searchParams: { event_id: event.id.toString(), srs_only: "true", note_legs: "true" },
			});
		}
		return searchables;
	}, [data]);

	const fuse = useMemo(() => new Fuse(elementsSearchable, { keys: ["name"], threshold: 0.3, includeScore: true, useTokenSearch: true,findAllMatches: true, ignoreLocation: true,includeMatches: true}), [elementsSearchable]);
	const renderNameWithHighlight = (name: string, indices: number[][]): JSX.Element => {
		if (indices.length === 0) {
			return <span>{name}</span>;
		}
		const parts: JSX.Element[] = [];
		let lastIndex = 0;
		indices.forEach(([start, end], index) => {
			if (lastIndex < start) {
				parts.push(<span key={`${index}-before`}>{name.slice(lastIndex, start)}</span>);
			}
			parts.push(<span key={`${index}-match`} className="highlight">{name.slice(start, end + 1)}</span>);
			lastIndex = end + 1;
		});
		return <span>{parts}</span>;
	}
	const resultCards: JSX.Element[] = useMemo(() => {
		if (searchQuery.length == 0) {
			return [];
		}
		const results = fuse.search(searchQuery).sort((a, b) => a.score! - b.score!);
		console.log(results[0].matches);
		if (results.length == 0) {
			return [<li key="no-results" className="accent-card result-card no-results">
				No results found for "{searchQuery}"
			</li>];
		}
		return results.map((result, index) => (
			<li key={index} className="accent-card result-card" onClick={() => setSearchParams(result.item.searchParams)} style = {{cursor: "pointer"}}>
			{renderNameWithHighlight(result.item.name, Array.from(result.matches?.[index].indices ?? []))}
			</li>
		));
	}, [searchQuery, data, setSearchParams]);

	return(
			<div className="app-shell">
				<div className="app-inner">
					<div className="accent-card hero-card">
						<div className="hero-row">
							<div style = {{width: "100%"}}>
								<div className="hero-eyebrow">Search</div>
								<input type="text" placeholder="Search for a swimmer, event, or meet..." 
									style={{width: "100%", padding: "0.5rem", fontSize: "1.5rem", borderRadius: "0.5rem", border: "1px solid #ccc", marginTop: "1rem", textAlign:"center"}}
									onChange={(e) => setSearchQuery(e.target.value)} />
							</div>
							<button type="button" onClick={() => setSearchParams({})} className="back-button">
								Back to Meets
							</button>
						</div>
					</div>
					<div className="section-block">
						<div className="section-header section-header-sticky">
							<div className="section-bar" />
							<div className="section-title-row">
								<h2 className="section-title">Results</h2>
							</div>
						</div>
						<ul className="card-list">
							{...resultCards}
						</ul>
					</div>
					</div>
			</div>

	)
}
