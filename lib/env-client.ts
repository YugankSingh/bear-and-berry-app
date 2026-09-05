import type { AppEnvironment } from "@/types/domain"

export function getAppEnvironmentLabel(environment: AppEnvironment): string {
	if (environment === "production") {
		return "Production fleet"
	}
	if (environment === "staging") {
		return "Staging fleet"
	}
	return "Local development"
}
