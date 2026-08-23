import { CheckInCard } from '@/components/wallet/CheckInCard';

export default function CheckInPage() {
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 p-6 md:p-10">
      <h1 className="text-xl font-semibold">每日簽到</h1>
      <CheckInCard />
    </div>
  );
}
