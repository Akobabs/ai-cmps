"""
NLP Module - Semantic Content Analysis
Implements BERT-inspired TF-IDF based semantic tagging with automatic
category classification and sentiment analysis.
"""
import re
import math
from collections import Counter
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

CATEGORY_KEYWORDS = {
    "Artificial Intelligence": [
        "machine learning", "neural network", "deep learning", "ai", "artificial intelligence",
        "nlp", "natural language processing", "bert", "transformer", "recommendation",
        "algorithm", "model", "training", "prediction", "classification", "embeddings",
        "computer vision", "reinforcement learning", "chatbot", "generative"
    ],
    "Web Development": [
        "react", "javascript", "python", "api", "frontend", "backend", "database",
        "html", "css", "fastapi", "node", "framework", "web", "development",
        "programming", "code", "software", "application", "rest", "graphql"
    ],
    "Business & Entrepreneurship": [
        "startup", "business", "marketing", "customer", "revenue", "growth", "product",
        "market", "strategy", "entrepreneur", "investment", "sales", "brand", "profit",
        "company", "management", "leadership", "innovation", "digital", "analytics"
    ],
    "Health & Wellness": [
        "health", "wellness", "fitness", "mental", "sleep", "nutrition", "exercise",
        "mindfulness", "stress", "diet", "brain", "productivity", "burnout", "meditation",
        "wellbeing", "cognitive", "physical", "emotional", "therapy", "recovery"
    ],
    "Finance & Investing": [
        "finance", "investing", "money", "stocks", "portfolio", "budget", "savings",
        "crypto", "cryptocurrency", "fund", "return", "risk", "asset", "wealth",
        "economy", "interest", "debt", "compound", "diversification", "financial"
    ],
    "Education & Learning": [
        "learning", "education", "study", "student", "knowledge", "skill", "course",
        "teaching", "university", "online", "spaced repetition", "memory", "curriculum",
        "e-learning", "training", "lecture", "exam", "academic", "research", "school"
    ],
}

POSITIVE_WORDS = {
    "excellent", "great", "good", "best", "amazing", "wonderful", "fantastic",
    "superior", "improve", "benefit", "success", "effective", "powerful",
    "efficient", "innovative", "advanced", "robust", "significant", "enhance"
}
NEGATIVE_WORDS = {
    "problem", "issue", "fail", "poor", "bad", "worst", "difficult", "challenge",
    "risk", "error", "bug", "limitation", "weakness", "concern", "threat", "danger"
}

_vectorizer: TfidfVectorizer | None = None
_corpus: list[str] = []
_content_ids: list[int] = []
_tfidf_matrix = None


def preprocess_text(text: str) -> str:
    text = text.lower()
    text = re.sub(r'[^a-z0-9\s]', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def extract_keywords(text: str, top_n: int = 8) -> list[str]:
    clean = preprocess_text(text)
    words = clean.split()
    stop_words = {
        "the", "a", "an", "in", "on", "at", "to", "for", "of", "and", "or",
        "but", "is", "are", "was", "were", "be", "been", "being", "have",
        "has", "had", "do", "does", "did", "will", "would", "could", "should",
        "may", "might", "shall", "can", "this", "that", "these", "those",
        "it", "its", "we", "our", "they", "their", "he", "she", "you", "your",
        "as", "by", "with", "from", "up", "about", "into", "through", "during",
        "also", "more", "most", "other", "than", "then", "when", "where", "which"
    }
    filtered = [w for w in words if len(w) > 3 and w not in stop_words]
    counts = Counter(filtered)
    # Boost bigrams
    bigrams = []
    for i in range(len(words) - 1):
        bg = f"{words[i]} {words[i+1]}"
        if words[i] not in stop_words and words[i+1] not in stop_words:
            bigrams.append(bg)
    bigram_counts = Counter(bigrams)
    top_unigrams = [w for w, _ in counts.most_common(top_n)]
    top_bigrams = [w for w, c in bigram_counts.most_common(4) if c > 1]
    keywords = list(dict.fromkeys(top_bigrams + top_unigrams))[:top_n]
    return keywords


def classify_category(text: str) -> str:
    clean = preprocess_text(text)
    scores = {}
    for category, keywords in CATEGORY_KEYWORDS.items():
        score = sum(clean.count(kw) * (2 if ' ' in kw else 1) for kw in keywords)
        scores[category] = score
    best = max(scores, key=scores.get)
    return best if scores[best] > 0 else "General"


def analyze_sentiment(text: str) -> float:
    """Returns a sentiment score between -1.0 (negative) and 1.0 (positive)."""
    words = preprocess_text(text).split()
    pos = sum(1 for w in words if w in POSITIVE_WORDS)
    neg = sum(1 for w in words if w in NEGATIVE_WORDS)
    total = pos + neg
    if total == 0:
        return 0.0
    return round((pos - neg) / total, 3)


def estimate_reading_time(text: str) -> int:
    word_count = len(text.split())
    return max(1, round(word_count / 200))


def generate_summary(text: str, max_sentences: int = 2) -> str:
    sentences = re.split(r'(?<=[.!?])\s+', text.strip())
    sentences = [s.strip() for s in sentences if len(s.split()) > 5]
    return ' '.join(sentences[:max_sentences])


def compute_tfidf_vector(text: str, vocabulary: dict | None = None) -> list[float]:
    """Compute a TF-IDF vector for a single document."""
    global _vectorizer
    if _vectorizer is None:
        return []
    try:
        vec = _vectorizer.transform([preprocess_text(text)])
        return vec.toarray()[0].tolist()
    except Exception:
        return []


def fit_vectorizer(texts: list[str], content_ids: list[int]):
    """Fit the global TF-IDF vectorizer on the content corpus."""
    global _vectorizer, _corpus, _content_ids, _tfidf_matrix
    if not texts:
        return
    _corpus = [preprocess_text(t) for t in texts]
    _content_ids = content_ids
    _vectorizer = TfidfVectorizer(
        max_features=500,
        ngram_range=(1, 2),
        min_df=1,
        stop_words='english'
    )
    _tfidf_matrix = _vectorizer.fit_transform(_corpus)


def get_content_tfidf(content_id: int) -> list[float]:
    global _content_ids, _tfidf_matrix
    if _tfidf_matrix is None or content_id not in _content_ids:
        return []
    idx = _content_ids.index(content_id)
    return _tfidf_matrix[idx].toarray()[0].tolist()


def compute_content_similarity(vec_a: list[float], vec_b: list[float]) -> float:
    if not vec_a or not vec_b:
        return 0.0
    a = np.array(vec_a).reshape(1, -1)
    b = np.array(vec_b).reshape(1, -1)
    if np.linalg.norm(a) == 0 or np.linalg.norm(b) == 0:
        return 0.0
    return float(cosine_similarity(a, b)[0][0])


def analyze_content(title: str, body: str) -> dict:
    """Full NLP pipeline for a content item."""
    full_text = f"{title} {title} {body}"  # double title weight
    return {
        "tags": extract_keywords(full_text),
        "category": classify_category(full_text),
        "sentiment_score": analyze_sentiment(body),
        "reading_time": estimate_reading_time(body),
        "summary": generate_summary(body),
    }
