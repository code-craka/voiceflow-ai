"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export default function SettingsPage(): JSX.Element {
  const { data: session } = useSession();
  const router = useRouter();
  const [isExporting, setIsExporting] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [gdprConsent, setGdprConsent] = React.useState({
    dataProcessing: true,
    marketing: false,
    analytics: true,
  });

  const handleExportData = async (): Promise<void> => {
    setIsExporting(true);
    try {
      const response = await fetch("/api/gdpr/export", {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error("Failed to export data");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `voiceflow-data-${new Date().toISOString()}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Export error:", error);
      alert("Failed to export data. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async (): Promise<void> => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch("/api/gdpr/delete", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to delete account");
      }

      router.push("/auth/signin");
    } catch (error) {
      console.error("Delete error:", error);
      alert("Failed to delete account. Please try again.");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleUpdateConsent = async (): Promise<void> => {
    try {
      const response = await fetch("/api/gdpr/consent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(gdprConsent),
      });

      if (!response.ok) {
        throw new Error("Failed to update consent");
      }

      alert("Consent preferences updated successfully");
    } catch (error) {
      console.error("Consent update error:", error);
      alert("Failed to update consent. Please try again.");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account and privacy preferences
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Your account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Email</Label>
              <p className="text-sm text-muted-foreground">
                {session?.user?.email}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium">Name</Label>
              <p className="text-sm text-muted-foreground">
                {session?.user?.name}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Privacy & GDPR Controls</CardTitle>
            <CardDescription>
              Manage your data processing consent and privacy preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="dataProcessing"
                  checked={gdprConsent.dataProcessing}
                  onCheckedChange={(checked) =>
                    setGdprConsent((prev) => ({
                      ...prev,
                      dataProcessing: checked === true,
                    }))
                  }
                />
                <div className="space-y-1">
                  <Label
                    htmlFor="dataProcessing"
                    className="text-sm font-medium cursor-pointer"
                  >
                    Data Processing (Required)
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Allow processing of voice recordings for transcription and AI
                    analysis
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Checkbox
                  id="marketing"
                  checked={gdprConsent.marketing}
                  onCheckedChange={(checked) =>
                    setGdprConsent((prev) => ({
                      ...prev,
                      marketing: checked === true,
                    }))
                  }
                />
                <div className="space-y-1">
                  <Label
                    htmlFor="marketing"
                    className="text-sm font-medium cursor-pointer"
                  >
                    Marketing Communications
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Receive updates about new features and improvements
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Checkbox
                  id="analytics"
                  checked={gdprConsent.analytics}
                  onCheckedChange={(checked) =>
                    setGdprConsent((prev) => ({
                      ...prev,
                      analytics: checked === true,
                    }))
                  }
                />
                <div className="space-y-1">
                  <Label
                    htmlFor="analytics"
                    className="text-sm font-medium cursor-pointer"
                  >
                    Analytics & Performance
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Help us improve the service by sharing anonymous usage data
                  </p>
                </div>
              </div>
            </div>

            <Button onClick={handleUpdateConsent}>Save Preferences</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data Export</CardTitle>
            <CardDescription>
              Download all your data in a structured format (GDPR compliant)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleExportData}
              disabled={isExporting}
              variant="outline"
            >
              {isExporting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Exporting...
                </>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" x2="12" y1="15" y2="3" />
                  </svg>
                  Export My Data
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>
              Permanently delete your account and all associated data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {showDeleteConfirm && (
              <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
                <p className="text-sm font-medium text-destructive">
                  Are you absolutely sure?
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  This action cannot be undone. All your voice notes,
                  transcriptions, and data will be permanently deleted.
                </p>
              </div>
            )}
            <div className="flex gap-2">
              <Button
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                variant="destructive"
              >
                {isDeleting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Deleting...
                  </>
                ) : showDeleteConfirm ? (
                  "Confirm Delete Account"
                ) : (
                  "Delete Account"
                )}
              </Button>
              {showDeleteConfirm && (
                <Button
                  onClick={() => setShowDeleteConfirm(false)}
                  variant="outline"
                >
                  Cancel
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
