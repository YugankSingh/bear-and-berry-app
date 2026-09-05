import { z } from "zod"
import { LEAD_INTENTS, LEAD_SOURCES, LEAD_STATUSES } from "@/types/domain"

const optionalText = z
	.string()
	.trim()
	.max(2000)
	.optional()
	.transform((value) => (value && value.length > 0 ? value : undefined))

export const leadIngestSchema = z.object({
	name: optionalText,
	business: optionalText,
	organization: optionalText,
	location: optionalText,
	footfall: optionalText,
	email: z.string().trim().email(),
	phone: optionalText,
	timeline: optionalText,
	operatorContext: optionalText,
	message: optionalText,
	intent: z.enum(LEAD_INTENTS).optional(),
	source: z.enum(LEAD_SOURCES).optional(),
})

export type LeadIngestInput = z.input<typeof leadIngestSchema>
export type LeadIngestParsed = z.output<typeof leadIngestSchema>

export const leadStatusSchema = z.object({
	status: z.enum(LEAD_STATUSES),
})

export function normalizeLeadPayload(input: LeadIngestInput | LeadIngestParsed) {
	const intent = input.intent ?? "unit"
	const organization = input.organization ?? input.business ?? null

	return {
		name: input.name ?? null,
		email: input.email.toLowerCase(),
		phone: input.phone ?? null,
		organization,
		location: input.location ?? null,
		footfall: input.footfall ?? null,
		timeline: input.timeline ?? null,
		operatorContext: input.operatorContext ?? null,
		message: input.message ?? null,
		intent,
		source: input.source ?? "api",
	}
}

export function intentTitle(intent: (typeof LEAD_INTENTS)[number]): string {
	if (intent === "proposal") {
		return "Commercial Proposal Request"
	}
	if (intent === "admin") {
		return "Admin Support Request"
	}
	return "Unit Request"
}
