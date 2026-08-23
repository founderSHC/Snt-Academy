import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { logoutAction } from "@/lib/actions";

const navItems = [
  { href: "/teacher", label: "Dashboard" },
  { href: "/teacher/students", label: "Students" },
  { href: "/teacher/announcements", label: "Announcements" },
  { href: "/teacher/scores", label: "Scores" },
  { href: "/teacher/settings", label: "Settings" },
];

export default async function TeacherLayout({ children }: LayoutProps<"/teacher">) {
  const session = await getSession();
  if (!session || session.role !== "teacher") redirect("/login");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--brand)] text-sm font-bold text-white">
              SNT
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight text-slate-900">SNT Academy</p>
              <p className="text-xs leading-tight text-slate-500">Teacher · {session.name}</p>
            </div>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-100"
            >
              Log out
            </button>
          </form>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 pb-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
