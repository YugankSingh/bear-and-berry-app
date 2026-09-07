import { redirectTo } from "@/lib/auth/next-path"
import { ORGANIZATION_ROOT } from "@/lib/auth/org-path"

export default function HomePage() {
	redirectTo(ORGANIZATION_ROOT)
}
