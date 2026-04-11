import './globals.css'

export const metadata = {
  title: 'Thames Towpath Ten — Race Portal',
  description: 'West 4 Harriers Race Director Portal',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: '#0c1535' }}>{children}</body>
    </html>
  )
}
