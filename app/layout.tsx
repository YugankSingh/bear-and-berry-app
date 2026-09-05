import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({
	subsets: ["latin"],
	variable: "--font-inter-var",
	weight: ["300", "400", "500", "600", "700", "800"],
})

export const metadata: Metadata = {
	title: {
		default: "Bear & Berry Operator",
		template: "%s | Bear & Berry",
	},
	description: "Operator dashboard for Bear & Berry smoothie vending machines.",
	icons: {
		icon: "/logo-clear.png",
		apple: "/logo-clear.png",
	},
}

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	return (
		<html lang="en-IN" className={`${inter.variable} h-full antialiased`}>
			<body className="min-h-full bg-[#F8F6F2] text-[#1A1A1A]">{children}</body>
		</html>
	)
}
