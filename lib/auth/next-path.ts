import { redirect } from "next/navigation"
import type { Route } from "next"

export function safeNextPath(value: string | undefined, fallback = "/organization"): string {
	return value && value.startsWith("/") && !value.startsWith("//") ? value : fallback
}

export function redirectTo(path: string): never {
	redirect(path as Parameters<typeof redirect>[0])
}

export function toRoute(path: string): Route {
	return path as Route
}

export function authRedirectPath(accessStatus: string | undefined, nextPath: string): string {
	return accessStatus === "waitlisted" ? "/waitlist" : nextPath
}
