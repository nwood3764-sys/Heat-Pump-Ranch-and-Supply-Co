"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle } from "lucide-react";

export default function ProfilePage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState("");

  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setName(user.user_metadata?.name ?? "");
        setEmail(user.email ?? "");
      }
      setProfileLoading(false);
    }
    loadProfile();
  }, []);

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setProfileSaving(true);
    setProfileError("");
    setProfileSuccess(false);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      data: { name },
    });

    setProfileSaving(false);
    if (error) {
      setProfileError(error.message);
    } else {
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess(false);

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      return;
    }

    setPasswordSaving(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    setPasswordSaving(false);
    if (error) {
      setPasswordError(error.message);
    } else {
      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordSuccess(false), 3000);
    }
  }

  if (profileLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-32 bg-muted rounded" />
        <div className="h-10 w-full bg-muted rounded" />
        <div className="h-10 w-full bg-muted rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-6">Profile</h1>

        {/* Profile Info */}
        <form onSubmit={handleProfileSave} className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="font-semibold mb-2">Account Information</h2>

          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1.5">
              Name
            </label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1.5">
              Email
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Contact us to change your email address.
            </p>
          </div>

          {profileError && (
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-3">
              {profileError}
            </div>
          )}

          {profileSuccess && (
            <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md p-3 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Profile updated successfully.
            </div>
          )}

          <Button type="submit" disabled={profileSaving}>
            {profileSaving ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </div>

      {/* Password Change */}
      <form onSubmit={handlePasswordChange} className="rounded-lg border bg-card p-6 space-y-4">
        <h2 className="font-semibold mb-2">Change Password</h2>

        <div>
          <label htmlFor="new-password" className="block text-sm font-medium mb-1.5">
            New Password
          </label>
          <Input
            id="new-password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>

        <div>
          <label htmlFor="confirm-password" className="block text-sm font-medium mb-1.5">
            Confirm New Password
          </label>
          <Input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
          <p className="text-xs text-muted-foreground mt-1">At least 8 characters.</p>
        </div>

        {passwordError && (
          <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-3">
            {passwordError}
          </div>
        )}

        {passwordSuccess && (
          <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md p-3 flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Password changed successfully.
          </div>
        )}

        <Button type="submit" disabled={passwordSaving} variant="outline">
          {passwordSaving ? "Updating..." : "Update Password"}
        </Button>
      </form>
    </div>
  );
}
