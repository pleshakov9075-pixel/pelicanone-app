import { useState } from "react";
import { Button } from "./ui/button";

export function TopUpModal({ onTopUp }: { onTopUp: (amount: number) => void }) {
  const [amount, setAmount] = useState(100);
  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="text-sm text-gray-500">TODO: подключить платежи. Сейчас мок.</div>
      <input
        className="rounded border p-2"
        type="number"
        min={1}
        value={amount}
        onChange={(event) => setAmount(Number(event.target.value))}
      />
      <Button onClick={() => onTopUp(amount)}>Пополнить</Button>
    </div>
  );
}
