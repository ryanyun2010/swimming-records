import { JSX } from "react";
import { SearchParamHandler } from "../hooks/useSearchParamHandler";
import { formatDate } from "../lib/utils";

type HeaderProps = {
	searchParamHandler: SearchParamHandler;
};
export function Header({ searchParamHandler }: HeaderProps): JSX.Element {
	const { curMeetInfo, curSwimmerInfo, curRelayInfo } = searchParamHandler;
	if (curRelayInfo != null && curMeetInfo == null && curSwimmerInfo == null) {
		return (
			<h2>
				Results for Relay: {curRelayInfo.event} | {curRelayInfo.swimmer_names.join(", ")} |{" "}
				{formatDate(curRelayInfo.date)}
			</h2>
		);
	} else if (curMeetInfo != null && curSwimmerInfo == null) {
		return (
			<h2>
				Results for Meet: {curMeetInfo.name} | {curMeetInfo.location} | {formatDate(curMeetInfo.date)}
			</h2>
		);
	} else if (curSwimmerInfo != null && curMeetInfo == null) {
		return (
			<h2>
				Results for Swimmer: {curSwimmerInfo.first_name} {curSwimmerInfo.last_name} '
				{curSwimmerInfo.graduating % 100}
			</h2>
		);
	} else if (curSwimmerInfo != null && curMeetInfo != null) {
		return (
			<h2>
				Results for Swimmer: {curSwimmerInfo.first_name} {curSwimmerInfo.last_name} '
				{curSwimmerInfo.graduating % 100} at Meet: {curMeetInfo.name} | {curMeetInfo.location} |{" "}
				{formatDate(curMeetInfo.date)}
			</h2>
		);
	} else {
		return <h2>Invalid search params</h2>;
	}
}
