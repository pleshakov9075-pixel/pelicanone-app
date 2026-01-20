import { apiFetch } from "./client";

export async function getBalance() {
  return apiFetch<{ balance: number }>("/credits/balance");
}

export async function listCreditTx() {
  return apiFetch<{ items: Array<{ id: string; delta: number; reason: string }>; total: number }>(
    "/credits/ledger"
  );
}
