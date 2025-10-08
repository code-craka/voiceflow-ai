"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import type { GDPRConsent } from "@/types/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export function SignUpForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [gdprConsent, setGdprConsent] = useState<GDPRConsent>({
    dataProcessing: false,
    voiceRecording: false,
    aiProcessing: false,
    consentedAt: new Date(),
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!email || !password) {
      setError("Email and password are required");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!gdprConsent.dataProcessing || !gdprConsent.voiceRecording || !gdprConsent.aiProcessing) {
      setError("You must accept all GDPR consent terms to continue");
      return;
    }

    setLoading(true);

    try {
      await authClient.signUp.email(
        {
          email,
          password,
          name: email.split("@")[0],
          callbackURL: "/dashboard",
        },
        {
          onRequest: () => {
            setLoading(true);
          },
          onSuccess: () => {
            router.push("/dashboard");
          },
          onError: (ctx) => {
            setError(ctx.error.message || "Failed to create account");
            setLoading(false);
          },
        }
      );
    } catch (err) {
      setError("An unexpected error occurred");
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Create Account</CardTitle>
        <CardDescription>Sign up to start using VoiceFlow AI</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-3 pt-2">
            <p className="text-sm font-medium">GDPR Consent</p>
            
            <div className="flex items-start space-x-2">
              <Checkbox
                id="dataProcessing"
                checked={gdprConsent.dataProcessing}
                onCheckedChange={(checked) =>
                  setGdprConsent({ ...gdprConsent, dataProcessing: checked === true })
                }
                disabled={loading}
              />
              <label
                htmlFor="dataProcessing"
                className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                I consent to the processing of my personal data
              </label>
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox
                id="voiceRecording"
                checked={gdprConsent.voiceRecording}
                onCheckedChange={(checked) =>
                  setGdprConsent({ ...gdprConsent, voiceRecording: checked === true })
                }
                disabled={loading}
              />
              <label
                htmlFor="voiceRecording"
                className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                I consent to voice recording and storage
              </label>
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox
                id="aiProcessing"
                checked={gdprConsent.aiProcessing}
                onCheckedChange={(checked) =>
                  setGdprConsent({ ...gdprConsent, aiProcessing: checked === true })
                }
                disabled={loading}
              />
              <label
                htmlFor="aiProcessing"
                className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                I consent to AI processing of my voice recordings
              </label>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating account..." : "Sign Up"}
          </Button>
          
          <p className="text-sm text-center text-muted-foreground">
            Already have an account?{" "}
            <a href="/auth/signin" className="text-primary hover:underline">
              Sign in
            </a>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
