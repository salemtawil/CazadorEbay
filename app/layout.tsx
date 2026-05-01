import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { getThemeInitScript } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "CazadorEbay",
  description: "Marketplace intelligence con Next.js, Prisma y Supabase Postgres.",
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
              <h1>Encuentra listings con margen antes de perder tiempo en evaluarlos a mano.</h1>
            </div>
            <div className="hero-actions">
              <p>
                Web app full-stack con arquitectura modular monolith, pipeline de evaluacion,
                fixtures para iteracion rapida y persistencia lista para Supabase Postgres en Vercel.
              </p>
              <div className="toolbar">
                <nav className="nav">
                  <Link href="/">Dashboard</Link>
                  <Link href="/profiles">Perfiles</Link>
                  <Link href="/opportunities">Oportunidades</Link>
                  <Link href={"/alerts" as Route}>Alertas</Link>
                  <Link href={"/system" as Route}>Sistema</Link>
                </nav>
                <ThemeToggle />
              </div>
            </div>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
