import { Result, ResultAsync, okAsync, errAsync } from "neverthrow";
import { ErrorRes } from "./errors";
import * as Errors from "./errors";
import { z, ZodError } from "zod";
import { IDedObject } from "./defs";

export function formatDate(date: string): string {
	if (!date) return "";
	const d = new Date(date);
	if (isNaN(d.getTime())) return "";
	return Intl.DateTimeFormat("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
		timeZone: "UTC",
	}).format(d);
}

export function readCSV(file: File): ResultAsync<string[][], ErrorRes> {
	return ResultAsync.fromPromise(
		new Promise((resolve, reject) => {
			const reader = new FileReader();

			reader.onload = () => {
				const result = reader.result;
				if (result == null || typeof result !== "string") {
					reject(new Error("Failed to read file"));
					return;
				}
				const rows = result
					.trim()
					.split(/\r?\n/)
					.map((r) => r.split(","));
				resolve(rows);
			};

			reader.onerror = reject;
			reader.readAsText(file);
		}),
		(e) => new Errors.FileReadError(`Failed to read file: ${JSON.stringify(e)}`),
	);
}

export function formatTime(seconds_t: number | null): string {
	if (seconds_t == null || isNaN(seconds_t)) return "";
	let seconds = Number(seconds_t);
	if (seconds >= 9999) return "Unknown";
	const mins = Math.floor(seconds / 60);
	const secs = (seconds % 60).toFixed(2).padStart(5, "0");
	return mins > 0 ? `${mins}:${secs}` : secs + "s";
}

function zodErrorToHumanReadable(err: ZodError): string {
	return err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
}

export function zodParseWith<T>(
	schema: z.ZodSchema<T>,
	errFunc: (errMsg: string) => ErrorRes,
): (json: unknown) => ResultAsync<T, ErrorRes> {
	return (json: unknown) => {
		const parseResult = schema.safeParse(json);
		if (!parseResult.success) {
			return errAsync(errFunc(zodErrorToHumanReadable(parseResult.error)));
		}
		return okAsync(parseResult.data);
	};
}
export function getResponseJSON(
	response: Response,
	errFunc: (errMsg: string) => ErrorRes = (e: string) =>
		new Errors.MalformedResponse(`Failed to parse response JSON: ${e}`),
): ResultAsync<any, ErrorRes> {
	return ResultAsync.fromPromise(response.json(), (e) => errFunc(JSON.stringify(e)));
}

export function getResponseJSONAndParse(
	response: any,
	schema: z.ZodSchema<any>,
	errFunc: (errMsg: string) => ErrorRes = (e: string) =>
		new Errors.MalformedResponse(`Failed to parse response JSON: ${e}`),
): ResultAsync<any, ErrorRes> {
	return getResponseJSON(response, errFunc).andThen(zodParseWith(schema, errFunc));
}

export function fetchAndParse<T>(url: string, schema: z.ZodSchema<T>): ResultAsync<T, ErrorRes> {
	return ResultAsync.fromPromise(
		fetch(url),
		(e) => new Errors.NoResponse(`Failed to fetch from ${url}: ${JSON.stringify(e)}`),
	).andThen((res) =>
		getResponseJSONAndParse(
			res,
			schema,
			(e) => new Errors.MalformedResponse(`Failed to parse response from ${url}: ${e.toString()}`),
		),
	);
}

export function reducerByID<T extends IDedObject>(data: T[]): Record<number, T> {
	return data.reduce((acc: Record<number, T>, dat: T) => {
		acc[dat.id] = dat;
		return acc;
	}, {});
}

export function formatChange(change: number | null | undefined): string {
	if (change === null || change === undefined) return "";
	const sign = change < 0 ? "-" : "+";
	const seconds = Math.abs(change).toFixed(2);
	return `${sign}${seconds}s`;
}
