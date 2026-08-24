import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { logoutAction } from "@/lib/actions";

const navItems = [
  { href: "/student/announcements", label: "Announcement" },
  { href: "/student/grades", label: "Individual Grade" },
  { href: "/student/ranking", label: "Ranking" },
];

export default async function StudentLayout({ children }: LayoutProps<"/student">) {
  const session = await getSession();
  if (!session || session.role !== "student") redirect("/login");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Image
              src="/icons/icon-512.png"
              alt="Jiwon English"
              width={36}
              height={36}
              className="h-9 w-9 rounded-lg object-cover"
            />
            <div>
              <p className="font-serif text-sm font-semibold leading-tight text-slate-900">Jiwon English</p>
              <p className="text-xs leading-tight text-slate-500">
                {session.name} · {session.className}
              </p>
            </div>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-full border border-slate-300 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-100"
            >
              Log out
            </button>
          </form>
        </div>
        <nav className="mx-auto flex max-w-3xl gap-1 px-4 pb-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
