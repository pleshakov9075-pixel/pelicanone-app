from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.models.user import User


class UserRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_platform_user_id(self, platform: str, platform_user_id: str) -> User | None:
        stmt = select(User).where(
            User.platform == platform, User.platform_user_id == platform_user_id
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_or_create_from_telegram(self, user_payload: dict) -> tuple[User, bool]:
        platform_user_id = str(user_payload.get("id", "")).strip()
        if not platform_user_id:
            raise ValueError("missing_platform_user_id")
        user = await self.get_by_platform_user_id("telegram", platform_user_id)
        username = user_payload.get("username")
        first_name = user_payload.get("first_name")
        last_name = user_payload.get("last_name")
        if user:
            changed = False
            if username != user.username:
                user.username = username
                changed = True
            if first_name != user.first_name:
                user.first_name = first_name
                changed = True
            if last_name != user.last_name:
                user.last_name = last_name
                changed = True
            if changed:
                await self.session.flush()
            return user, changed

        user = User(
            platform="telegram",
            platform_user_id=platform_user_id,
            username=username,
            first_name=first_name,
            last_name=last_name,
            balance=0,
        )
        self.session.add(user)
        await self.session.flush()
        return user, True
