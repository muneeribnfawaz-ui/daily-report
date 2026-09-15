"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/components/forms/login-form";
import { ShieldCheck, FileCheck2, LockKeyhole, Sparkles, Building2 } from "lucide-react";
import { LanguageSelector } from "@/components/layout/language-selector";
import { useTranslation } from "@/lib/i18n";

export default function LoginPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background flex flex-col justify-between text-textPrimary transition-colors duration-200">
      {/* Top Navbar */}
      <header className="bg-navbar text-sidebarText px-6 py-4 shadow-md border-b border-primary/20">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-sm font-bold">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-sidebarText">{t("auth.systemTitle")}</span>
              <span className="text-xs block text-primary font-medium tracking-wider uppercase">{t("auth.enterpriseEdition")}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSelector variant="auth" />
            <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-primary bg-sidebar border border-primary/30 px-3 py-1.5 rounded-full">
              <Sparkles className="h-3.5 w-3.5" />
              <span>{t("auth.securePortalBadge")}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 px-4 py-12 flex items-center justify-center">
        <div className="mx-auto grid max-w-6xl w-full gap-8 lg:grid-cols-[1.1fr_0.9fr] items-stretch">
          {/* Left Hero Card Panel (Theme Deep Sidebar Container with Primary Highlights) */}
          <section className="rounded-3xl border border-primary/20 bg-sidebar p-8 text-sidebarText shadow-2xl lg:p-12 flex flex-col justify-between relative overflow-hidden">
            {/* Ambient Lighting Accents */}
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-primaryDark/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/15 border border-primary/30 px-3.5 py-1 text-xs uppercase tracking-widest text-primary font-semibold">
                <Sparkles className="h-3.5 w-3.5" />
                {t("auth.enterpriseWorkflow")}
              </div>

              <h1 className="text-3xl font-bold tracking-tight lg:text-5xl leading-tight text-sidebarText">
                {t("auth.heroHeadline")}
              </h1>

              <div className="pt-4 space-y-4 text-sm opacity-90">
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 mt-0.5">
                    <FileCheck2 className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <span className="font-semibold text-sidebarText">{t("auth.featureConsolidatedTitle")}</span>
                    <p className="text-xs opacity-75">{t("auth.featureConsolidatedDesc")}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 mt-0.5">
                    <ShieldCheck className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <span className="font-semibold text-sidebarText">{t("auth.featureApprovalTitle")}</span>
                    <p className="text-xs opacity-75">{t("auth.featureApprovalDesc")}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 mt-0.5">
                    <LockKeyhole className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <span className="font-semibold text-sidebarText">{t("auth.featureLockingTitle")}</span>
                    <p className="text-xs opacity-75">{t("auth.featureLockingDesc")}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative z-10 pt-8 border-t border-primary/20 flex items-center justify-between text-xs opacity-80">
              <span>{t("auth.protectedEnvironment")}</span>
              <span className="text-primary font-medium">{t("auth.jwtAuthenticated")}</span>
            </div>
          </section>

          {/* Right Login Form Card Panel */}
          <Card className="self-center bg-card border border-border shadow-xl rounded-3xl p-2 sm:p-4">
            <CardHeader className="space-y-1.5 pb-4">
              <CardTitle className="text-2xl font-bold tracking-tight text-textPrimary">{t("auth.signIn")}</CardTitle>
              <CardDescription className="text-sm text-mutedForeground">
                {t("auth.loginSubtitle")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <LoginForm />
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-navbar text-sidebarText px-6 py-4 border-t border-primary/20 text-xs text-center">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>{t("auth.copyright", { year: new Date().getFullYear() })}</span>
          <span className="text-primary font-medium">{t("auth.strictAccessControl")}</span>
        </div>
      </footer>
    </div>
  );
}
