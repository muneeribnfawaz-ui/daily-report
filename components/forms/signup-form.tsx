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

type SignupValues = z.infer<typeof signupSchema>;

export function SignupForm() {
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
      setSuccess("Account created successfully. Please sign in.");
      router.push("/login");
    } catch {
      setError("Signup failed. Please try again.");
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <ReportField label="Full name" error={errors.name?.message}>
        <Input placeholder="Full name" {...register("name")} />
      </ReportField>
      <ReportField label="Email" error={errors.email?.message}>
        <Input placeholder="Email" type="email" {...register("email")} />
      </ReportField>
      <ReportField label="Password" error={errors.password?.message}>
        <PasswordInput placeholder="Password" {...register("password")} />
      </ReportField>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {success ? <p className="text-sm text-success">{success}</p> : null}
      <Button className="w-full" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Creating account..." : "Create account"}
      </Button>
    </form>
  );
}
