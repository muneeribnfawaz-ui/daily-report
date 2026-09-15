"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import type { z } from "zod";
import { Mail, Lock, AlertCircle, ArrowRight } from "lucide-react";
import { loginSchema } from "@/lib/validation";
import { normalizeRole } from "@/lib/constants";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/forms/password-input";
import { Input } from "@/components/ui/input";
import { ReportField } from "@/components/forms/report-controls";

type LoginValues = z.infer<typeof loginSchema>;

const safeZodResolver = (schema: typeof loginSchema): Resolver<LoginValues> => {
  return async (values) => {
    const result = await schema.safeParseAsync(values);
    if (result.success) {
      return { values: result.data, errors: {} };
    }
    const errors: Record<string, { type: string; message: string }> = {};
    for (const issue of result.error.issues) {
      const fieldPath = issue.path.join(".");
      if (fieldPath && !errors[fieldPath]) {
        errors[fieldPath] = {
          type: issue.code,
          message: issue.message
        };
      }
    }
    return { values: {}, errors: errors as any };
  };
};

import { useTranslation } from "@/lib/i18n";

export function LoginForm() {
  const { t, isRTL } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<LoginValues>({
    resolver: safeZodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  });

  const onSubmit = async (values: LoginValues) => {
    setError(null);
    try {
      const response = await api.post("/api/auth/login", values);
      queryClient.clear();
      const role = normalizeRole(response.data?.data?.role);
      if (role === "admin") router.push("/admin/dashboard");
      else if (role === "ceo") router.push("/ceo/dashboard");
      else if (role === "team_lead") router.push("/team-lead/dashboard");
      else if (role === "report_manager") router.push("/reports");
      else if (role === "hod") router.push("/dashboard");
      else if (role === "team_member") router.push("/tm/dashboard");
      else router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(t("auth.invalidCredentials"));
    }
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
      <ReportField label={t("auth.emailLabel")} error={errors.email?.message}>
        <div className="relative">
          <Mail className="absolute ltr:left-3.5 rtl:right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
          <Input
            placeholder={t("auth.emailPlaceholder")}
            type="email"
            className="ltr:pl-10 rtl:pr-10 h-11 border-border bg-card text-textPrimary placeholder:text-mutedForeground focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary rounded-xl transition-all"
            {...register("email")}
          />
        </div>
      </ReportField>

      <ReportField label={t("auth.passwordLabel")} error={errors.password?.message}>
        <div className="relative">
          <Lock className="absolute ltr:left-3.5 rtl:right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
          <PasswordInput
            placeholder={t("auth.passwordPlaceholder")}
            className="ltr:pl-10 rtl:pr-10 h-11 border-border bg-card text-textPrimary placeholder:text-mutedForeground focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary rounded-xl transition-all"
            {...register("password")}
          />
        </div>
      </ReportField>

      {error ? (
        <div className="p-3.5 rounded-xl bg-danger/10 border border-danger/20 text-xs text-danger font-medium flex items-center gap-2.5">
          <AlertCircle className="h-4 w-4 text-danger shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <Button
        className="w-full bg-primary hover:bg-primaryDark text-primary-foreground font-bold h-11 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
        type="submit"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          t("auth.signingIn")
        ) : (
          <>
            <span>{t("auth.signIn")}</span>
            <ArrowRight className="h-4 w-4 rtl:rotate-180" />
          </>
        )}
      </Button>
    </form>
  );
}
