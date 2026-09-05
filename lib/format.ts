export function formatNumber(value: number): string {
	return new Intl.NumberFormat("en-IN").format(value)
}

export function formatDate(value: string): string {
	return new Intl.DateTimeFormat("en-IN", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	}).format(new Date(value))
}

export function formatDateTime(value: string): string {
	return new Intl.DateTimeFormat("en-IN", {
		day: "2-digit",
		month: "short",
		hour: "2-digit",
		minute: "2-digit",
	}).format(new Date(value))
}

export function titleCase(value: string): string {
	return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
}
