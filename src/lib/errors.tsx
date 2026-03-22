export class ErrorRes extends Error {
	name: string;
	constructor(name: string, message: string) {
		super(message);
		this.name = name;
	}
	toString() {
		return `${this.name}: ${this.message}`;
	}
}
export class NotFound extends ErrorRes {
	constructor(message: string) {
		super(message, "NotFoundError");
	}
}
export class MalformedResponse extends ErrorRes {
	constructor(message: string) {
		super(message, "MalformedResponseError");
	}
}
export class NoResponse extends ErrorRes {
	constructor(message: string) {
		super(message, "NoResponseError");
	}
}

export class FileReadError extends ErrorRes {
	constructor(message: string) {
		super(message, "FileReadError");
	}
}

export class GeneralError extends ErrorRes {
	constructor(message: string) {
		super(message, "Error");
	}
}

export class InvalidSearchParams extends ErrorRes {
	constructor(message: string) {
		super(message, "InvalidSearchParamsError");
	}
}

export class Unauthorized extends ErrorRes {
	constructor(message: string) {
		super(message, "UnauthorizedError");
	}
}
