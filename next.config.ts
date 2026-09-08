import type { NextConfig } from "next"
import { PHASE_PRODUCTION_BUILD } from "next/constants"
import { assertRequiredEnv } from "./lib/require-env"

const nextConfig: NextConfig = {
	typedRoutes: true,
}

export default function config(phase: string): NextConfig {
	if (phase === PHASE_PRODUCTION_BUILD) {
		assertRequiredEnv()
	}
	return nextConfig
}
