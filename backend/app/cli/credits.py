import argparse
import asyncio
import os
import sys

from app.core.repositories.credits import CreditRepository
from app.core.repositories.users import UserRepository
from app.db import async_session


def _parse_admin_ids(raw: str) -> set[str]:
    return {item.strip() for item in raw.split(",") if item.strip()}


async def _topup(telegram_id: str, amount: int, reason: str) -> int:
    async with async_session() as session:
        users = UserRepository(session)
        user, _ = await users.get_or_create_from_telegram({"id": telegram_id})
        credits = CreditRepository(session)
        await credits.create_tx(user.id, delta=amount, reason=reason)
        await session.commit()
        return await credits.get_balance(user.id)


def _run_topup(args: argparse.Namespace) -> int:
    admin_ids = _parse_admin_ids(os.environ.get("ADMIN_TG_IDS", ""))
    if admin_ids:
        if not args.admin_id or args.admin_id not in admin_ids:
            print("admin_id_not_allowed", file=sys.stderr)
            return 1
    balance = asyncio.run(_topup(args.telegram_id, args.amount, args.reason))
    print(balance)
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="credits")
    subparsers = parser.add_subparsers(dest="command", required=True)

    topup_parser = subparsers.add_parser("topup", help="Top up credits for a user")
    topup_parser.add_argument("--telegram-id", required=True)
    topup_parser.add_argument("--amount", required=True, type=int)
    topup_parser.add_argument("--reason", default="admin_topup")
    topup_parser.add_argument("--admin-id")
    topup_parser.set_defaults(func=_run_topup)
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
