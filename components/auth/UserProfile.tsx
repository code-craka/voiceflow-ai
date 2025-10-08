"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export function UserProfile() {
  const { data: session, isPending, error } = authClient.useSession();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            router.push("/auth/signin");
          },
        },
      });
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  if (isPending) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
          <p className="text-center text-muted-foreground mt-4">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-6">
          <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
            Error loading session: {error.message}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!session?.user) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Not Authenticated</CardTitle>
          <CardDescription>Please sign in to view your profile</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button onClick={() => router.push("/auth/signin")} className="w-full">
            Sign In
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>Your account information</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Name</p>
          <p className="text-base">{session.user.name || "Not set"}</p>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Email</p>
          <p className="text-base">{session.user.email}</p>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Email Verified</p>
          <p className="text-base">
            {session.user.emailVerified ? (
              <span className="text-green-600">✓ Verified</span>
            ) : (
              <span className="text-amber-600">Not verified</span>
            )}
          </p>
        </div>

        {session.user.image && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Profile Image</p>
            <img
              src={session.user.image}
              alt="Profile"
              className="w-16 h-16 rounded-full"
            />
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col space-y-2">
        <Button onClick={handleSignOut} variant="outline" className="w-full">
          Sign Out
        </Button>
      </CardFooter>
    </Card>
  );
}
