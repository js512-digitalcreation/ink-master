import { avatarColor, initials } from "@/lib/format";

export function Avatar({ name, url, className }: { name: string; url?: string | null; className?: string }) {
  return (
    <div className={`avatar ${className ?? ""}`} style={{ background: avatarColor(name) }} aria-hidden="true">
      {url ? <img src={url} alt="" /> : initials(name)}
    </div>
  );
}
