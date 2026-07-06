"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { loginSchema } from "@/lib/validation";
import { normalizeRole } from "@/lib/constants";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/forms/password-input";
import { Input } from "@/components/ui/input";
import { ReportField } from "@/components/forms/report-controls";

type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
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
      if (role === "admin" || role === "ceo") router.push("/admin/dashboard");
      else if (role === "team_member") router.push("/daily-report/my-reports");
      else if (role === "team_lead" || role === "report_manager" || role === "hod") router.push("/report-manager/dashboard");
      else router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError("Login failed. Check your credentials and try again.");
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <ReportField label="Email" error={errors.email?.message}>
        <Input placeholder="Email" type="email" {...register("email")} />
      </ReportField>
      <ReportField label="Password" error={errors.password?.message}>
        <PasswordInput placeholder="Password" {...register("password")} />
      </ReportField>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <Button className="w-full" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Signing in..." : "Login"}
      </Button>
    </form>
  );
}
