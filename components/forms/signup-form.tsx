"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { signupSchema } from "@/lib/validation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/forms/password-input";
import { ReportField } from "@/components/forms/report-controls";
import { useTranslation } from "@/lib/i18n";

type SignupValues = z.infer<typeof signupSchema>;

export function SignupForm() {
  const { t } = useTranslation();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: ""
    }
  });

  const onSubmit = async (values: SignupValues) => {
    setError(null);
    setSuccess(null);
    try {
      await api.post("/api/auth/register", values);
      setSuccess(t("auth.accountCreated"));
      router.push("/login");
    } catch {
      setError(t("auth.signupFailed"));
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <ReportField label={t("common.name")} error={errors.name?.message}>
        <Input placeholder={t("common.name")} {...register("name")} />
      </ReportField>
      <ReportField label={t("common.email")} error={errors.email?.message}>
        <Input placeholder={t("auth.emailPlaceholder")} type="email" {...register("email")} />
      </ReportField>
      <ReportField label={t("auth.passwordLabel")} error={errors.password?.message}>
        <PasswordInput showRules={true} placeholder={t("auth.passwordPlaceholder")} {...register("password")} />
      </ReportField>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {success ? <p className="text-sm text-success">{success}</p> : null}
      <Button className="w-full" type="submit" disabled={isSubmitting}>
        {isSubmitting ? t("auth.creatingAccount") : t("auth.createAccount")}
      </Button>
    </form>
  );
}
