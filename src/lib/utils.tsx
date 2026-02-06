import { Result, ResultAsync, okAsync, errAsync} from "neverthrow";
import { ErrorRes } from "./errors";
import * as Errors from "./errors";
import { z, ZodError} from "zod";

export function formatDate(seconds: number): string {
	if (!seconds) return "";
	const d = new Date(seconds * 1000);
	return Intl.DateTimeFormat("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
		timeZone: "UTC"
	}).format(d);
}

export function readCSV(file: File): ResultAsync<string[][], ErrorRes> {
	return ResultAsync.fromPromise(new Promise((resolve, reject) => {
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
	}), (e) => new Errors.FileReadError(`Failed to read file: ${JSON.stringify(e)}`));
}

export function formatTime(seconds_t: number | null): string {
	if (seconds_t == null || isNaN(seconds_t)) return "";
	let seconds = Number(seconds_t);
	const mins = Math.floor(seconds / 60);
	const secs = (seconds % 60).toFixed(2).padStart(5, "0");
	return mins > 0 ? `${mins}:${secs}` : secs + "s";
}

function zodErrorToHumanReadable(err: ZodError): string {
	return err.issues
		.map(i => `${i.path.join(".")}: ${i.message}`)
		.join("; ");
}

export function zodParseWith<T>(
	schema: z.ZodSchema<T>, 
	errFunc: (errMsg: string) => ErrorRes
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
	response: any, 
	errFunc: (errMsg: string) => ErrorRes = (e: string) => new Errors.MalformedResponse(`Failed to parse response JSON: ${e}`)
): ResultAsync<any, ErrorRes> {
	return ResultAsync.fromPromise(
		response.json(),
		(e) => errFunc(JSON.stringify(e))
	);
}

export function getResponseJSONAndParse(
	response: any,
	schema: z.ZodSchema<any>,
	errFunc: (errMsg: string) => ErrorRes = (e: string) => new Errors.MalformedResponse(`Failed to parse response JSON: ${e}`),
): ResultAsync<any, ErrorRes> {
	return getResponseJSON(response, errFunc).andThen(
		zodParseWith(schema, errFunc)
	);
}
