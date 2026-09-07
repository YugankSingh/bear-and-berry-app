"use client"

import { usePathname, useSearchParams } from "next/navigation"
import { useEffect, useRef, useState } from "react"

function readHeaders(input: RequestInfo | URL, init?: RequestInit) {
	if (init?.headers) return new Headers(init.headers)
	if (input instanceof Request) return new Headers(input.headers)
	return new Headers()
}

function isAppNavigation(input: RequestInfo | URL, init?: RequestInit) {
	const headers = readHeaders(input, init)
	const isRsc = headers.has("RSC") || headers.has("Next-Url")
	const isPrefetch =
		headers.get("Next-Router-Prefetch") === "1" ||
		headers.get("Purpose") === "prefetch"
	return isRsc && !isPrefetch
}

function isInternalNavigation(anchor: HTMLAnchorElement) {
	if (anchor.target && anchor.target !== "_self") return false
	if (anchor.hasAttribute("download")) return false

	const href = anchor.getAttribute("href")
	if (
		!href ||
		href.startsWith("#") ||
		href.startsWith("mailto:") ||
		href.startsWith("tel:")
	) {
		return false
	}

	try {
		const nextUrl = new URL(anchor.href, window.location.href)
		if (nextUrl.origin !== window.location.origin) return false
		return (
			nextUrl.pathname !== window.location.pathname ||
			nextUrl.search !== window.location.search
		)
	} catch {
		return false
	}
}

export function NavigationProgress() {
	const pathname = usePathname()
	const searchParams = useSearchParams()
	const [visible, setVisible] = useState(false)
	const [progress, setProgress] = useState(0)
	const timers = useRef<number[]>([])
	const pending = useRef(0)
	const skipFirstPath = useRef(true)

	function clearTimers() {
		for (const timer of timers.current) window.clearTimeout(timer)
		timers.current = []
	}

	function start() {
		clearTimers()
		setVisible(true)
		setProgress(16)
		timers.current.push(window.setTimeout(() => setProgress(62), 80))
		timers.current.push(window.setTimeout(() => setProgress(84), 400))
		timers.current.push(
			window.setTimeout(() => {
				if (pending.current === 0) finish()
			}, 12000),
		)
	}

	function finish() {
		clearTimers()
		setProgress(100)
		timers.current.push(
			window.setTimeout(() => {
				setVisible(false)
				setProgress(0)
			}, 220),
		)
	}

	useEffect(() => {
		const onClick = (event: MouseEvent) => {
			if (event.defaultPrevented || event.button !== 0) return
			if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
				return
			}
			const anchor = (event.target as Element | null)?.closest("a")
			if (!anchor || !isInternalNavigation(anchor)) return
			start()
		}

		document.addEventListener("click", onClick, true)
		return () => {
			document.removeEventListener("click", onClick, true)
			clearTimers()
		}
	}, [])

	useEffect(() => {
		const originalFetch = window.fetch.bind(window)
		window.fetch = async (input, init) => {
			const track = isAppNavigation(input, init)
			if (track) {
				pending.current += 1
				start()
			}
			try {
				return await originalFetch(input, init)
			} finally {
				if (track) {
					pending.current = Math.max(0, pending.current - 1)
					if (pending.current === 0) finish()
				}
			}
		}

		return () => {
			window.fetch = originalFetch
		}
	}, [])

	useEffect(() => {
		if (skipFirstPath.current) {
			skipFirstPath.current = false
			return
		}
		const timer = window.setTimeout(() => {
			if (pending.current === 0) finish()
		}, 100)
		return () => window.clearTimeout(timer)
	}, [pathname, searchParams])

	if (!visible && progress === 0) return null

	return (
		<div
			className={`pointer-events-none fixed top-0 left-0 z-[80] h-[3px] bg-[#BD0C16] shadow-[0_0_14px_rgba(189,12,22,0.5)] transition-[width,opacity] duration-300 ease-out ${
				visible ? "opacity-100" : "opacity-0"
			}`}
			style={{ width: `${progress}%` }}
			aria-hidden
		/>
	)
}
