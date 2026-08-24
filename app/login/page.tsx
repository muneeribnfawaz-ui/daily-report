import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/components/forms/login-form";

export default function LoginPage() {
  return (
    <div className="min-h-screen px-4 py-10">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl border border-cardBorder bg-hero-gradient p-8 shadow-soft lg:p-12">
          <div className="max-w-xl space-y-6">
            <div className="text-sm uppercase tracking-[0.35em] text-muted-foreground">Enterprise Workflow</div>
            <h1 className="text-4xl font-semibold tracking-tight lg:text-6xl">Daily reports, approvals, locking, and audit trails in one place.</h1>
            <p className="text-base text-muted-foreground lg:text-lg">
              Built for team members, team leads, and admins with protected routes, consolidated reporting, and PDF generation.
            </p>
          </div>
        </section>

        <Card className="self-center">
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>Use JWT authentication to access your role-specific dashboard.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <LoginForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
