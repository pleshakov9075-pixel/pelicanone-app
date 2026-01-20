import { Button } from "../components/ui/button";
import { ru } from "../i18n/ru";
import { NavHandler } from "./types";

export function Home({ onNavigate }: { onNavigate: NavHandler }) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">{ru.titles.app}</h1>
      <p>{ru.labels.chooseGeneration}</p>
      <div className="flex gap-2">
        <Button onClick={() => onNavigate("generate")}>{ru.actions.generate}</Button>
        <Button onClick={() => onNavigate("history")}>{ru.actions.history}</Button>
        <Button onClick={() => onNavigate("balance")}>{ru.actions.balance}</Button>
      </div>
    </div>
  );
}
