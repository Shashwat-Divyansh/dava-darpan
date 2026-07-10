import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Pill } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Same email check the server uses, so the client catches obvious mistakes early.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Where to go after signing up (internal paths only); default to home.
  const redirectParam = searchParams.get("redirect");
  const redirectTo = redirectParam && redirectParam.startsWith("/") ? redirectParam : "/";

  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState({}); // per-field client validation
  const [apiError, setApiError] = useState(""); // error returned by the server
  const [submitting, setSubmitting] = useState(false);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  // Returns an errors object — empty means the form is valid.
  function validate() {
    const errors = {};
    if (!form.name.trim()) errors.name = "Name is required";
    if (!form.email.trim()) errors.email = "Email is required";
    else if (!EMAIL_REGEX.test(form.email)) errors.email = "Enter a valid email address";
    if (!form.password) errors.password = "Password is required";
    else if (form.password.length < 8)
      errors.password = "Password must be at least 8 characters";
    return errors;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setApiError("");

    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return; // stop if client validation fails

    setSubmitting(true);
    try {
      await signup(form);
      navigate(redirectTo); // success → back where they came from (or home)
    } catch (err) {
      setApiError(err.response?.data?.error || "Could not sign up. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex items-center gap-2">
            <Pill className="size-6 text-primary" />
            <span className="font-display text-lg font-bold">Dava Darpan</span>
          </div>
          <CardTitle className="font-display text-2xl font-bold">Create your account</CardTitle>
          <CardDescription>Start comparing medicines and saving money</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                value={form.name}
                onChange={handleChange}
                aria-invalid={!!fieldErrors.name}
                placeholder="Jane Doe"
              />
              {fieldErrors.name && <p className="text-sm text-destructive">{fieldErrors.name}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                aria-invalid={!!fieldErrors.email}
                placeholder="you@example.com"
              />
              {fieldErrors.email && <p className="text-sm text-destructive">{fieldErrors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                aria-invalid={!!fieldErrors.password}
                placeholder="At least 8 characters"
              />
              {fieldErrors.password && (
                <p className="text-sm text-destructive">{fieldErrors.password}</p>
              )}
            </div>

            {/* Server-side error (e.g. email already exists) */}
            {apiError && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {apiError}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Creating account…" : "Sign up"}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              to={redirectParam ? `/login?redirect=${encodeURIComponent(redirectParam)}` : "/login"}
              className="font-medium text-primary hover:underline"
            >
              Log in
            </Link>
          </p>

          {/* Guests can search & compare freely — only saving needs an account. */}
          <p className="mt-3 border-t pt-3 text-center text-sm">
            <Link
              to={redirectTo.startsWith("/favorites") ? "/" : redirectTo}
              className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Continue as guest — browse without an account →
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
