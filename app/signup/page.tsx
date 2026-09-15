"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SignupForm } from "@/components/forms/signup-form";
import { useTranslation } from "@/lib/i18n";

export default function SignupPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen px-4 py-10">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl border border-cardBorder bg-hero-gradient p-8 shadow-soft lg:p-12">
          <div className="max-w-xl space-y-6">
            <div className="text-sm uppercase tracking-[0.35em] text-muted-foreground">{t("auth.getStarted")}</div>
            <h1 className="text-4xl font-semibold tracking-tight lg:text-6xl">{t("auth.signUpHeroTitle")}</h1>
            <p className="text-base text-muted-foreground lg:text-lg">
              {t("auth.signUpHeroDesc")}
            </p>
          </div>
        </section>

        <Card className="self-center">
          <CardHeader>
            <CardTitle>{t("auth.signUp")}</CardTitle>
            <CardDescription>{t("auth.signUpSubtitle")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <SignupForm />
            <p className="text-xs text-muted-foreground">
              {t("auth.alreadyHaveAccount")}{" "}
              <Link className="underline font-medium hover:text-primary" href="/login">
                {t("auth.signIn")}
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
