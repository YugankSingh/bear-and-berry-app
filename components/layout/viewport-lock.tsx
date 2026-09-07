"use client"

import { useEffect } from "react"

export function ViewportLock() {
	useEffect(() => {
		const html = document.documentElement
		const body = document.body
		const previous = {
			htmlOverflow: html.style.overflow,
			bodyOverflow: body.style.overflow,
			htmlHeight: html.style.height,
			bodyHeight: body.style.height,
		}

		html.style.overflow = "hidden"
		body.style.overflow = "hidden"
		html.style.height = "100dvh"
		body.style.height = "100dvh"

		return () => {
			html.style.overflow = previous.htmlOverflow
			body.style.overflow = previous.bodyOverflow
			html.style.height = previous.htmlHeight
			body.style.height = previous.bodyHeight
		}
	}, [])

	return null
}
