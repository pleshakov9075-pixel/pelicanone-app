import { apiFetch } from "./client";

export async function topup(amount: number) {
  return apiFetch<{ balance: number }>("/billing/topup", {
    method: "POST",
    body: JSON.stringify({ amount })
  });
}
