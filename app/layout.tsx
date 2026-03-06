import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { headers } from 'next/headers'
import Sidebar from '@/components/Sidebar'
import './globals.css'

const inter = Inter({ subsets: ['latin'], display: 'swap' })

export const metadata: Metadata = {
  title: 'Admin — AlmostCrackd',
  description: 'Admin panel for the AlmostCrackd humor study database.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Read the pathname from the x-invoke-path header Next.js sets internally,
  // falling back to the referer. This lets us suppress the sidebar on /login
  // without making the layout a client component.
  const headerList  = headers()
  const pathname    = headerList.get('x-pathname') ?? ''
  const isLoginPage = pathname === '/login' || pathname.startsWith('/login')

  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 text-gray-900 antialiased`}>
        {isLoginPage ? (
          // Login page: full-screen, no sidebar
          children
        ) : (
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 min-w-0 overflow-auto">
              {children}
            </main>
          </div>
        )}
      </body>
    </html>
  )
}
