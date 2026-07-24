from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc
from app.models.ai_classification import AIClassification
from typing import List, Optional

class ClassificationRepository:
    def __init__(self, session: AsyncSession):
        self.session = session
        
    async def save_classification(self, classification_data: dict) -> AIClassification:
        new_record = AIClassification(**classification_data)
        self.session.add(new_record)
        await self.session.commit()
        await self.session.refresh(new_record)
        return new_record
        
    async def get_all_history(self, skip: int = 0, limit: int = 100) -> List[AIClassification]:
        stmt = select(AIClassification).order_by(desc(AIClassification.created_at)).offset(skip).limit(limit)
        result = await self.session.execute(stmt)
        return result.scalars().all()
        
    async def get_by_id(self, record_id: int) -> Optional[AIClassification]:
        stmt = select(AIClassification).where(AIClassification.id == record_id)
        result = await self.session.execute(stmt)
        return result.scalars().first()
        
    async def delete(self, record_id: int) -> bool:
        record = await self.get_by_id(record_id)
        if record:
            await self.session.delete(record)
            await self.session.commit()
            return True
        return False
