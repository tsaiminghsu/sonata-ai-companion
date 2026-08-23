'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from '@/lib/amplify/auth';
import { useRouter } from 'next/navigation';
import { SoonBadge } from '@/components/ui/SoonBadge';
import { DiamondBadge } from '@/components/wallet/DiamondBadge';

type NavItem = { label: string; href: string; soon?: boolean };
type NavGroup = { title: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    title: '伴侶',
    items: [
      { label: '首頁', href: '/' },
      { label: '我的伴侶', href: '/companions' },
      { label: '聊天', href: '/chat' },
      { label: '劇場', href: '/theater', soon: true },
    ],
  },
  {
    title: '創作',
    items: [
      { label: '衣櫥', href: '/wardrobe', soon: true },
      { label: '我的資產', href: '/assets' },
    ],
  },
  {
    title: '帳戶',
    items: [
      { label: '鑽石商城', href: '/diamond-shop' },
      { label: '每日簽到', href: '/checkin' },
    ],
  },
];

export function Sidebar({ email }: { email: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-[var(--color-border)] bg-surface px-4 py-6 md:flex">
      <span className="mb-8 px-2 text-xl font-bold bg-gradient-to-r from-magenta to-violet bg-clip-text text-transparent">
        Sonata
      </span>

      <nav className="flex flex-1 flex-col gap-6 overflow-y-auto">
        {NAV_GROUPS.map((group) => (
          <div key={group.title}>
            <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted">
              {group.title}
            </p>
            <div className="flex flex-col gap-1">
              {group.items.map((item) => {
                const active = pathname === item.href.split('?')[0];
                if (item.soon) {
                  return (
                    <span
                      key={item.label}
                      aria-disabled="true"
                      className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-muted opacity-60"
                    >
                      {item.label}
                      <SoonBadge />
                    </span>
                  );
                }
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`rounded-lg px-3 py-2 text-sm transition ${
                      active
                        ? 'bg-gradient-to-r from-magenta/20 to-violet/20 text-[var(--color-text)]'
                        : 'text-muted hover:bg-white/5 hover:text-[var(--color-text)]'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-6 flex flex-col gap-3 border-t border-[var(--color-border)] pt-4">
        <DiamondBadge />
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-magenta to-violet text-xs font-semibold text-white">
              {email.slice(0, 2).toUpperCase()}
            </span>
            <span className="truncate text-xs text-muted">{email}</span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="neon-ring rounded-lg px-3 py-2 text-left text-sm text-muted hover:bg-white/5 hover:text-[var(--color-text)]"
        >
          Log out
        </button>
      </div>
    </aside>
  );
}
