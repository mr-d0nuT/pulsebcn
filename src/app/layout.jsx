import './globals.css'

export const metadata = {
  title: 'BarnaPulse | Live Map',
  description: 'Eventos de Barcelona en tiempo real',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
