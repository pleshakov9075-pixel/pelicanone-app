from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.models.user import User


class UserRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_or_create(self, platform: str, platform_user_id: str) -> User:
        stmt = select(User).where(
            User.platform == platform, User.platform_user_id == platform_user_id
        )
        result = await self.session.execute(stmt)
        user = result.scalar_one_or_none()
        if user:
            return user
        user = User(platform=platform, platform_user_id=platform_user_id)
        self.session.add(user)
        await self.session.flush()
        return user
