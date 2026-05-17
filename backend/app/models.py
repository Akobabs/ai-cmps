from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_admin = Column(Boolean, default=False)
    topic_preferences = Column(JSON, default=list)  # list of preferred topics
    profile_vector = Column(JSON, default=list)      # TF-IDF preference vector
    interaction_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    interactions = relationship("Interaction", back_populates="user")


class Content(Base):
    __tablename__ = "content"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    body = Column(Text, nullable=False)
    summary = Column(String, default="")
    category = Column(String, default="General")
    tags = Column(JSON, default=list)          # auto-extracted NLP tags
    tfidf_vector = Column(JSON, default=list)  # TF-IDF vector for recommendations
    sentiment_score = Column(Float, default=0.0)
    reading_time = Column(Integer, default=5)  # minutes
    author = Column(String, default="AI-CMPS Team")
    published_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    view_count = Column(Integer, default=0)
    avg_rating = Column(Float, default=0.0)
    rating_count = Column(Integer, default=0)

    interactions = relationship("Interaction", back_populates="content")


class Interaction(Base):
    __tablename__ = "interactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content_id = Column(Integer, ForeignKey("content.id"), nullable=False)
    interaction_type = Column(String, default="view")  # view, read, rate, bookmark
    dwell_time = Column(Integer, default=0)    # seconds spent reading
    scroll_depth = Column(Float, default=0.0)  # 0.0 - 1.0
    rating = Column(Float, default=0.0)        # 1-5 explicit rating
    strength = Column(Float, default=1.0)      # computed interaction strength
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="interactions")
    content = relationship("Content", back_populates="interactions")
