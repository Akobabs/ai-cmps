from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional


class UserRegister(BaseModel):
    email: str
    username: str
    password: str
    topic_preferences: list[str] = []


class UserLogin(BaseModel):
    email: str
    password: str


class UserOut(BaseModel):
    id: int
    email: str
    username: str
    is_admin: bool
    topic_preferences: list[str]
    interaction_count: int
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut


class ContentCreate(BaseModel):
    title: str
    body: str
    category: str = "General"
    author: str = "AI-CMPS Team"


class ContentOut(BaseModel):
    id: int
    title: str
    body: str
    summary: str
    category: str
    tags: list[str]
    reading_time: int
    author: str
    published_at: datetime
    view_count: int
    avg_rating: float
    rating_count: int
    sentiment_score: float

    class Config:
        from_attributes = True


class RecommendedContent(BaseModel):
    content: ContentOut
    score: float
    reason: str
    alpha: float


class InteractionCreate(BaseModel):
    content_id: int
    interaction_type: str = "view"
    dwell_time: int = 0
    scroll_depth: float = 0.0
    rating: Optional[float] = None


class AnalyticsOut(BaseModel):
    total_users: int
    total_content: int
    total_interactions: int
    avg_session_duration: float
    content_consumption_rate: float
    precision_at_10: float
    recall_at_10: float
    avg_response_latency_ms: float
    top_categories: list[dict]
    recent_interactions: list[dict]
    engagement_trend: list[dict]
