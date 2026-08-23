import { getServerUserEmail } from '@/lib/amplify/authServer';
import { DEMO_MODE } from '@/lib/demo/config';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileNav } from '@/components/layout/MobileNav';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const email = await getServerUserEmail();

  return (
    <div className="flex min-h-screen flex-1 bg-void">
      <Sidebar email={email} />
      <div className="flex flex-1 flex-col">
        {DEMO_MODE && (
          <div className="bg-violet/20 px-4 py-1.5 text-center text-xs text-violet">
            DEMO MODE — 本地模擬資料，非真實 AWS 後端
          </div>
        )}
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">{children}</main>
      </div>
      <MobileNav />
    </div>
  );
}
