import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SignupForm } from "@/components/forms/signup-form";

export default function SignupPage() {
  return (
    <div className="min-h-screen px-4 py-10">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl border border-cardBorder bg-hero-gradient p-8 shadow-soft lg:p-12">
          <div className="max-w-xl space-y-6">
            <div className="text-sm uppercase tracking-[0.35em] text-muted-foreground">Get Started</div>
            <h1 className="text-4xl font-semibold tracking-tight lg:text-6xl">Create your team member account and start submitting daily reports.</h1>
            <p className="text-base text-muted-foreground lg:text-lg">
              Public signup is for team members. Team leads and admins are managed by the system administrator.
            </p>
          </div>
        </section>

        <Card className="self-center">
          <CardHeader>
            <CardTitle>Sign up</CardTitle>
            <CardDescription>Create a new team member account.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <SignupForm />
            <p className="text-xs text-muted-foreground">
              Already have an account? <Link className="underline" href="/login">Sign in</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
