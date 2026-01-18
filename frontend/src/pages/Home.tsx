import { Button } from "../components/ui/button";
import { NavHandler } from "./types";

export function Home({ onNavigate }: { onNavigate: NavHandler }) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">PelicanOne 2.0</h1>
      <p>Выберите тип генерации:</p>
      <div className="flex gap-2">
        <Button onClick={() => onNavigate("generate")}>Image</Button>
        <Button onClick={() => onNavigate("history")}>History</Button>
        <Button onClick={() => onNavigate("balance")}>Balance</Button>
      </div>
    </div>
  );
}
