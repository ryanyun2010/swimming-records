import { ResultAsync, okAsync, errAsync } from "neverthrow";
import * as Errors from "./errors";
export function formatDate(seconds) {
    if (!seconds)
        return "";
    const d = new Date(seconds * 1000);
    return Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        timeZone: "UTC"
    }).format(d);
}
export function readCSV(file) {
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
export function formatTime(seconds_t) {
    if (seconds_t == null || isNaN(seconds_t))
        return "";
    let seconds = Number(seconds_t);
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(2).padStart(5, "0");
    return mins > 0 ? `${mins}:${secs}` : secs + "s";
}
function zodErrorToHumanReadable(err) {
    return err.issues
        .map(i => `${i.path.join(".")}: ${i.message}`)
        .join("; ");
}
export function zodParseWith(schema, errFunc) {
    return (json) => {
        const parseResult = schema.safeParse(json);
        if (!parseResult.success) {
            return errAsync(errFunc(zodErrorToHumanReadable(parseResult.error)));
        }
        return okAsync(parseResult.data);
    };
}
export function getResponseJSON(response, errFunc = (e) => new Errors.MalformedResponse(`Failed to parse response JSON: ${e}`)) {
    return ResultAsync.fromPromise(response.json(), (e) => errFunc(JSON.stringify(e)));
}
export function getResponseJSONAndParse(response, schema, errFunc = (e) => new Errors.MalformedResponse(`Failed to parse response JSON: ${e}`)) {
    return getResponseJSON(response, errFunc).andThen((res) => {
        console.log("Raw JSON response:", JSON.stringify(res));
        return zodParseWith(schema, errFunc)(res);
    });
}
