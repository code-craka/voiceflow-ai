import { UserProfile } from "@/components/auth/UserProfile";

export default function ProfilePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <UserProfile />
    </div>
  );
}
