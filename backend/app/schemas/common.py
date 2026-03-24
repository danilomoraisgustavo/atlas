from pydantic import BaseModel
from typing import Optional

class MessageResponse(BaseModel):
    detail: str
    extra: Optional[dict] = None
