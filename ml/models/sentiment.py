"""
ML-5: Consumer Review Sentiment Analysis
Models: VADER (baseline) â†’ DistilBERT (advanced)
Output: Positive/Neutral/Negative + confidence score + farmer reputation score
"""
import os
import json
import warnings
import numpy as np
import pandas as pd
import joblib
from sklearn.linear_model import LogisticRegression
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

warnings.filterwarnings("ignore")

MODEL_DIR = "ml/models/saved"
REPORT_DIR = "ml/reports"


def vader_predict(texts: list[str]) -> list[dict]:
    """VADER baseline sentiment prediction."""
    analyzer = SentimentIntensityAnalyzer()
    results = []
    for text in texts:
        scores = analyzer.polarity_scores(text)
        compound = scores["compound"]
        if compound >= 0.05:
            label = "positive"
            confidence = round((compound + 1) / 2, 3)
        elif compound <= -0.05:
            label = "negative"
            confidence = round((1 - compound) / 2, 3)
        else:
            label = "neutral"
            confidence = round(1.0 - abs(compound), 3)
        results.append({"label": label, "confidence": confidence, "compound": round(compound, 4)})
    return results


def train_tfidf_logreg(df: pd.DataFrame) -> tuple:
    """TF-IDF + Logistic Regression intermediate model."""
    le = LabelEncoder()
    y = le.fit_transform(df["sentiment"])

    vectorizer = TfidfVectorizer(max_features=2000, ngram_range=(1, 2), min_df=2)
    X = vectorizer.fit_transform(df["text"])

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    clf = LogisticRegression(max_iter=1000, C=1.0, random_state=42)
    clf.fit(X_train, y_train)

    preds = clf.predict(X_test)
    acc = accuracy_score(y_test, preds)
    report_text = classification_report(y_test, preds, target_names=le.classes_)

    return clf, vectorizer, le, acc, report_text


def distilbert_sentiment(texts: list[str]) -> list[dict]:
    """
    DistilBERT inference. Falls back to VADER if transformers not installed.
    Install: pip install transformers torch sentencepiece
    """
    try:
        from transformers import pipeline
        pipe = pipeline(
            "text-classification",
            model="distilbert-base-uncased-finetuned-sst-2-english",
            truncation=True,
            max_length=512,
        )
        raw = pipe(texts)
        results = []
        for r in raw:
            label_map = {"POSITIVE": "positive", "NEGATIVE": "negative"}
            label = label_map.get(r["label"], "neutral")
            results.append({"label": label, "confidence": round(r["score"], 3)})
        return results
    except ImportError:
        print("  [DistilBERT] transformers not installed â€” falling back to VADER")
        return vader_predict(texts)


def train_and_evaluate(review_path: str = "ml/data/reviews.csv") -> dict:
    print("\n[ML-5] Consumer Sentiment Analysis")
    print("=" * 50)

    os.makedirs(MODEL_DIR, exist_ok=True)
    os.makedirs(REPORT_DIR, exist_ok=True)

    df = pd.read_csv(review_path)

    # VADER baseline evaluation
    vader_preds = vader_predict(df["text"].tolist())
    vader_labels = [p["label"] for p in vader_preds]
    vader_acc = accuracy_score(df["sentiment"], vader_labels)
    print(f"  [VADER baseline] Accuracy: {vader_acc:.4f}")

    # TF-IDF + LogReg intermediate
    clf, vectorizer, le, tfidf_acc, tfidf_report = train_tfidf_logreg(df)
    print(f"  [TF-IDF+LogReg] Accuracy: {tfidf_acc:.4f}")
    print(f"\n{tfidf_report}")

    joblib.dump(clf, f"{MODEL_DIR}/sentiment_clf.pkl")
    joblib.dump(vectorizer, f"{MODEL_DIR}/sentiment_vectorizer.pkl")
    joblib.dump(le, f"{MODEL_DIR}/sentiment_le.pkl")

    # Farmer reputation scores
    df["pred_label"] = vader_labels
    df["compound"] = [p["compound"] for p in vader_preds]

    reputation = (
        df.groupby("farmer_id")
        .agg(
            avg_rating=("rating", "mean"),
            total_reviews=("review_id", "count"),
            positive_pct=("pred_label", lambda x: (x == "positive").mean()),
            negative_pct=("pred_label", lambda x: (x == "negative").mean()),
            avg_compound=("compound", "mean"),
        )
        .round(3)
        .reset_index()
    )
    reputation["reputation_score"] = (
        reputation["avg_rating"] / 5 * 0.5
        + reputation["positive_pct"] * 0.3
        + reputation["avg_compound"].clip(-1, 1).apply(lambda x: (x + 1) / 2) * 0.2
    ).round(3)

    reputation.to_csv(f"{MODEL_DIR}/farmer_reputation.csv", index=False)

    report = {
        "phase": "ML-5",
        "task": "Sentiment Analysis",
        "models": {
            "VADER": {"accuracy": round(vader_acc, 4), "type": "rule-based"},
            "TF-IDF+LogReg": {"accuracy": round(tfidf_acc, 4), "type": "ml"},
            "DistilBERT": {"accuracy": "requires GPU + transformers install", "type": "transformer"},
        },
        "dataset_size": len(df),
        "class_distribution": df["sentiment"].value_counts().to_dict(),
        "reputation_farmers_scored": len(reputation),
    }

    with open(f"{REPORT_DIR}/sentiment_report.json", "w") as f:
        json.dump(report, f, indent=2)

    print(f"  Reputation scores computed for {len(reputation)} farmers")
    print(f"  Report saved â†’ {REPORT_DIR}/sentiment_report.json")
    return report


def predict_sentiment(text: str) -> dict:
    """Predict sentiment for a single review text."""
    try:
        clf = joblib.load(f"{MODEL_DIR}/sentiment_clf.pkl")
        vectorizer = joblib.load(f"{MODEL_DIR}/sentiment_vectorizer.pkl")
        le = joblib.load(f"{MODEL_DIR}/sentiment_le.pkl")

        X = vectorizer.transform([text])
        pred = clf.predict(X)[0]
        proba = clf.predict_proba(X)[0]
        label = le.inverse_transform([pred])[0]
        confidence = round(float(max(proba)), 3)
    except Exception:
        result = vader_predict([text])[0]
        return {"label": result["label"], "confidence": result["confidence"], "model": "vader_fallback"}

    vader_result = vader_predict([text])[0]
    return {
        "label": label,
        "confidence": confidence,
        "compound_score": vader_result["compound"],
        "model": "tfidf_logreg",
    }


def get_farmer_reputation(farmer_id: str) -> dict:
    """Look up cached farmer reputation score."""
    try:
        rep_df = pd.read_csv(f"{MODEL_DIR}/farmer_reputation.csv")
        row = rep_df[rep_df["farmer_id"] == farmer_id]
        if len(row) == 0:
            return {"farmer_id": farmer_id, "reputation_score": 0.7, "note": "no reviews yet"}
        r = row.iloc[0]
        return {
            "farmer_id": farmer_id,
            "reputation_score": float(r["reputation_score"]),
            "avg_rating": float(r["avg_rating"]),
            "total_reviews": int(r["total_reviews"]),
            "positive_pct": float(r["positive_pct"]),
        }
    except FileNotFoundError:
        return {"farmer_id": farmer_id, "reputation_score": 0.7, "note": "model not trained yet"}


if __name__ == "__main__":
    report = train_and_evaluate()
    print("\nSample sentiment prediction:")
    print(predict_sentiment("Excellent quality tomatoes! Very fresh and delivered on time."))
    print(predict_sentiment("Vegetables were rotten on arrival. Terrible experience."))

