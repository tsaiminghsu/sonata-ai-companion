'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  { label: '首頁', href: '/' },
  { label: '伴侶', href: '/companions' },
  { label: '聊天', href: '/chat' },
  { label: '資產', href: '/assets' },
  { label: '簽到', href: '/checkin' },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-[var(--color-border)] bg-surface/95 backdrop-blur md:hidden">
      {ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] ${
              active ? 'text-magenta' : 'text-muted'
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
