export type ApiErrorCode =
	| "INVALID_PAYLOAD"
	| "EMAIL_REQUIRED"
	| "VALIDATION_ERROR"
	| "UNAUTHORIZED"
	| "FORBIDDEN"
	| "NOT_FOUND"
	| "CONFLICT"
	| "MAIL_CONFIG_MISSING"
	| "MAIL_TRANSPORT_ERROR"
	| "SERVER_ERROR"

export type ApiSuccess<T> = {
	ok: true
	data: T
}

export type ApiFailure = {
	ok: false
	code: ApiErrorCode
	error: string
}

export type ApiResult<T> = ApiSuccess<T> | ApiFailure
