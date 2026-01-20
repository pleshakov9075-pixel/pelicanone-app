import { useEffect, useState } from "react";
import { getBalance } from "../api/credits";
import { topup } from "../api/billing";
import { TopUpModal } from "../components/TopUpModal";
import { ru } from "../i18n/ru";
import { NavHandler } from "./types";

export function Balance({ onNavigate: _onNavigate }: { onNavigate?: NavHandler }) {
  const [balance, setBalance] = useState(0);

  const refresh = async () => {
    const data = await getBalance();
    setBalance(data.balance);
  };

  useEffect(() => {
    refresh().catch(() => setBalance(0));
  }, []);

  const handleTopup = async (amount: number) => {
    const data = await topup(amount);
    setBalance(data.balance);
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">{ru.titles.balance}</h2>
      <div className="text-2xl">{balance} ₽</div>
      <TopUpModal onTopUp={handleTopup} />
    </div>
  );
}
