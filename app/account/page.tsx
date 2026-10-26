import type { Metadata } from "next";
import Link from "next/link";
import { requireViewer } from "@/lib/auth";
import { AccountForm } from "@/components/AccountForm";
import { Avatar } from "@/components/Avatar";
import { InstallPrompt } from "@/components/InstallPrompt";
import { NotificationSettings } from "@/components/NotificationSettings";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ password?: string }> }) {
  const { password } = await searchParams;
  const { user, profile } = await requireViewer("/account");
  const name = profile?.full_name || user.email || "You";
  const isArtist = profile?.role === "artist";

  return (
    <div className="page">
      <header className="topbar"><h1 className="h-page">Account</h1></header>
      <div className="stack">
        {password === "updated" && <div className="notice good" role="status">Your password was updated.</div>}
        <div className="list-card">
          <div className="card-head">
            <Avatar name={name} />
            <div className="who">
              <h3>{name}</h3>
              <p className="shop"><span>{user.email}</span></p>
            </div>
            <span className="status accepted">{isArtist ? "Artist" : "Client"}</span>
          </div>
        </div>
        <InstallPrompt />
        <NotificationSettings userId={user.id} email={user.email ?? ""} notifyEmail={profile?.notify_email ?? true} isArtist={isArtist} />
        <AccountForm userId={user.id} fullName={profile?.full_name ?? ""} phone={profile?.phone ?? null} />
        <Link className="btn ghost block" href="/bookings">My booking requests</Link>
        <Link className="btn ghost block" href="/dashboard">{isArtist ? "Artist studio" : "I'm a tattoo artist"}</Link>
        <form action="/auth/signout" method="post">
          <button className="btn danger block" type="submit">Log out</button>
        </form>
      </div>
    </div>
  );
}
