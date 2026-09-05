import { z } from "zod"

export const inventoryPatchSchema = z.object({
	quantity: z.number().int().min(0),
})

export type InventoryPatchInput = z.infer<typeof inventoryPatchSchema>
