export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-void px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="text-2xl font-bold bg-gradient-to-r from-magenta to-violet bg-clip-text text-transparent">
            Sonata
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}
