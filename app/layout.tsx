import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { getThemeInitScript } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "CazadorEbay",
  description: "Herramienta para detectar oportunidades de compra en eBay con recomendaciones claras.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: getThemeInitScript() }} />
      </head>
      <body>
        <div className="shell">
          <header className="hero">
            <div>
              <p className="eyebrow">CazadorEbay</p>
              <h1>Detecta rapido que vale la pena comprar, por que y que hacer ahora.</h1>
            </div>
            <div className="hero-actions">
              <p>
                La app prioriza oportunidades accionables, cambios importantes y busquedas claras. Lo tecnico sigue ahi, pero en segunda capa.
              </p>
              <div className="toolbar">
                <nav className="nav">
                  <Link href="/">Hoy</Link>
                  <Link href="/opportunities">Oportunidades</Link>
                  <Link href="/alerts">Cambios</Link>
                  <Link href="/profiles">Mis busquedas</Link>
                </nav>
                <div className="toolbar-side">
                  <nav className="nav nav-secondary">
                    <Link href={"/system" as Route}>Panel tecnico</Link>
                  </nav>
                  <ThemeToggle />
                </div>
              </div>
            </div>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
