import { useState } from "react";
import { Button } from "./ui/button";
import { ru } from "../i18n/ru";

export function TopUpModal({ onTopUp }: { onTopUp: (amount: number) => void }) {
  const [amount, setAmount] = useState(100);
  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="text-sm text-gray-500">{ru.messages.topupStub}</div>
      <input
        className="rounded border p-2"
        type="number"
        min={1}
        value={amount}
        onChange={(event) => setAmount(Number(event.target.value))}
      />
      <Button onClick={() => onTopUp(amount)}>{ru.actions.topup}</Button>
    </div>
  );
}
