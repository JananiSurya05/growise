"""
ML-4: Smart Crop Recommendation Engine
Approaches: Rule-Based â†’ Content-Based â†’ Collaborative Filtering â†’ ML Ranking
Output: Top 5 crops with demand/profitability/risk scores
"""
import os
import json
import warnings
import numpy as np
import pandas as pd
import joblib
from sklearn.preprocessing import MinMaxScaler, LabelEncoder
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error

warnings.filterwarnings("ignore")

MODEL_DIR = "ml/models/saved"
REPORT_DIR = "ml/reports"

CROP_KNOWLEDGE = {
    "Tomato":      {"water": "medium", "labor": "high",   "grow_days": 75,  "soil": "loamy"},
    "Onion":       {"water": "medium", "labor": "medium", "grow_days": 120, "soil": "loamy"},
    "Potato":      {"water": "high",   "labor": "medium", "grow_days": 90,  "soil": "sandy"},
    "Rice":        {"water": "very_high","labor":"high",  "grow_days": 130, "soil": "clay"},
    "Banana":      {"water": "high",   "labor": "low",    "grow_days": 365, "soil": "loamy"},
    "Chilli":      {"water": "medium", "labor": "high",   "grow_days": 90,  "soil": "loamy"},
    "Groundnut":   {"water": "low",    "labor": "medium", "grow_days": 120, "soil": "sandy"},
    "Brinjal":     {"water": "medium", "labor": "medium", "grow_days": 75,  "soil": "loamy"},
    "Lady Finger": {"water": "medium", "labor": "medium", "grow_days": 60,  "soil": "loamy"},
    "Carrot":      {"water": "medium", "labor": "low",    "grow_days": 80,  "soil": "sandy"},
    "Coconut":     {"water": "low",    "labor": "low",    "grow_days": 1825,"soil": "sandy"},
    "Sugarcane":   {"water": "very_high","labor":"high",  "grow_days": 365, "soil": "clay"},
    "Cotton":      {"water": "medium", "labor": "high",   "grow_days": 180, "soil": "clay"},
    "Cabbage":     {"water": "medium", "labor": "low",    "grow_days": 90,  "soil": "loamy"},
    "Cauliflower": {"water": "medium", "labor": "low",    "grow_days": 90,  "soil": "loamy"},
}

SEASON_SUITABILITY = {
    "Kharif": ["Rice", "Cotton", "Groundnut", "Lady Finger", "Brinjal", "Tomato"],
    "Rabi":   ["Potato", "Onion", "Carrot", "Cabbage", "Cauliflower", "Chilli", "Tomato"],
    "Zaid":   ["Banana", "Coconut", "Sugarcane", "Lady Finger", "Tomato"],
}

LOCATION_DEMAND = {
    "Chennai":    ["Tomato", "Onion", "Banana", "Carrot", "Potato"],
    "Coimbatore": ["Tomato", "Coconut", "Banana", "Onion", "Groundnut"],
    "Madurai":    ["Banana", "Onion", "Tomato", "Chilli", "Rice"],
    "Salem":      ["Mango", "Tomato", "Onion", "Banana", "Coconut"],
    "Trichy":     ["Rice", "Banana", "Coconut", "Onion", "Tomato"],
    "Vellore":    ["Tomato", "Onion", "Groundnut", "Potato", "Rice"],
    "Tirunelveli":["Banana", "Coconut", "Rice", "Tomato", "Chilli"],
    "Erode":      ["Coconut", "Groundnut", "Cotton", "Onion", "Banana"],
    "Thanjavur":  ["Rice", "Banana", "Coconut", "Sugarcane", "Tomato"],
    "Dindigul":   ["Banana", "Coconut", "Onion", "Tomato", "Chilli"],
}


def _compute_scores(crop: str, location: str, season: str, price_df: pd.DataFrame) -> dict:
    crop_prices = price_df[price_df["crop_name"] == crop]

    # Profitability score
    if len(crop_prices) > 0:
        avg_price = crop_prices["price"].mean()
        price_max = price_df["price"].max()
        profit_score = round(avg_price / price_max, 3)
    else:
        profit_score = 0.3

    # Demand score
    loc_crops = LOCATION_DEMAND.get(location, [])
    season_crops = SEASON_SUITABILITY.get(season, [])
    demand_score = 0.0
    if crop in loc_crops:
        demand_score += 0.5
    if crop in season_crops:
        demand_score += 0.4
    if crop in SEASON_SUITABILITY.get(season, []):
        demand_score += 0.1
    demand_score = round(min(1.0, demand_score), 3)

    # Risk score (lower = better)
    knowledge = CROP_KNOWLEDGE.get(crop, {})
    water_risk = {"very_high": 0.8, "high": 0.5, "medium": 0.3, "low": 0.1}.get(knowledge.get("water", "medium"), 0.3)
    labor_risk = {"high": 0.6, "medium": 0.3, "low": 0.1}.get(knowledge.get("labor", "medium"), 0.3)

    if len(crop_prices) > 1:
        price_volatility = round(crop_prices["price"].std() / (crop_prices["price"].mean() + 1e-6), 3)
    else:
        price_volatility = 0.3

    risk_score = round((water_risk * 0.3 + labor_risk * 0.3 + price_volatility * 0.4), 3)

    return {
        "profitability_score": profit_score,
        "demand_score": demand_score,
        "risk_score": risk_score,
    }


def _composite_score(scores: dict, weights=(0.4, 0.4, 0.2)) -> float:
    return round(
        scores["profitability_score"] * weights[0]
        + scores["demand_score"] * weights[1]
        + (1 - scores["risk_score"]) * weights[2],
        4,
    )


def build_training_dataset(price_df: pd.DataFrame) -> pd.DataFrame:
    """Generate training data for the ML ranking model."""
    rows = []
    locations = price_df["location"].unique()
    seasons = price_df["season"].unique()
    crops = price_df["crop_name"].unique()

    le_crop = LabelEncoder().fit(crops)
    le_loc = LabelEncoder().fit(locations)
    le_season = LabelEncoder().fit(seasons)

    for loc in locations:
        for season in seasons:
            for crop in crops:
                scores = _compute_scores(crop, loc, season, price_df)
                composite = _composite_score(scores)
                rows.append({
                    "crop_encoded": le_crop.transform([crop])[0],
                    "location_encoded": le_loc.transform([loc])[0],
                    "season_encoded": le_season.transform([season])[0],
                    "profitability_score": scores["profitability_score"],
                    "demand_score": scores["demand_score"],
                    "risk_score": scores["risk_score"],
                    "composite_score": composite,
                    "crop": crop,
                    "location": loc,
                    "season": season,
                })

    return pd.DataFrame(rows), le_crop, le_loc, le_season


def train_and_evaluate(price_path: str = "ml/data/crop_prices.csv") -> dict:
    print("\n[ML-4] Smart Crop Recommendation Engine")
    print("=" * 50)

    os.makedirs(MODEL_DIR, exist_ok=True)
    os.makedirs(REPORT_DIR, exist_ok=True)

    price_df = pd.read_csv(price_path)

    training_df, le_crop, le_loc, le_season = build_training_dataset(price_df)

    feature_cols = ["crop_encoded", "location_encoded", "season_encoded",
                    "profitability_score", "demand_score", "risk_score"]
    X = training_df[feature_cols].values
    y = training_df["composite_score"].values

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    ranker = GradientBoostingRegressor(n_estimators=200, learning_rate=0.05, max_depth=4, random_state=42)
    ranker.fit(X_train, y_train)

    preds = ranker.predict(X_test)
    mae = mean_absolute_error(y_test, preds)
    print(f"  Ranking model MAE: {mae:.4f}")

    joblib.dump(ranker, f"{MODEL_DIR}/recommender.pkl")
    joblib.dump(le_crop, f"{MODEL_DIR}/rec_le_crop.pkl")
    joblib.dump(le_loc, f"{MODEL_DIR}/rec_le_loc.pkl")
    joblib.dump(le_season, f"{MODEL_DIR}/rec_le_season.pkl")

    report = {
        "phase": "ML-4",
        "task": "Crop Recommendation Engine",
        "approach": "Rule-Based + Content-Based + ML Ranking (GBR)",
        "training_samples": len(X_train),
        "ranking_mae": round(mae, 6),
        "features": feature_cols,
    }

    with open(f"{REPORT_DIR}/crop_recommendation_report.json", "w") as f:
        json.dump(report, f, indent=2)

    print(f"  Report saved â†’ {REPORT_DIR}/crop_recommendation_report.json")
    return report


def recommend_crops(location: str, season: str, month: int, top_k: int = 5) -> list[dict]:
    """Return top-k crop recommendations for given location/season."""
    price_df = pd.read_csv("ml/data/crop_prices.csv")
    ranker = joblib.load(f"{MODEL_DIR}/recommender.pkl")
    le_crop = joblib.load(f"{MODEL_DIR}/rec_le_crop.pkl")
    le_loc = joblib.load(f"{MODEL_DIR}/rec_le_loc.pkl")
    le_season = joblib.load(f"{MODEL_DIR}/rec_le_season.pkl")

    crops = list(CROP_KNOWLEDGE.keys())
    results = []

    for crop in crops:
        scores = _compute_scores(crop, location, season, price_df)

        try:
            crop_enc = le_crop.transform([crop])[0]
        except ValueError:
            crop_enc = 0
        try:
            loc_enc = le_loc.transform([location])[0]
        except ValueError:
            loc_enc = 0
        try:
            season_enc = le_season.transform([season])[0]
        except ValueError:
            season_enc = 0

        features = np.array([[
            crop_enc, loc_enc, season_enc,
            scores["profitability_score"],
            scores["demand_score"],
            scores["risk_score"],
        ]])
        ml_score = float(ranker.predict(features)[0])

        season_crops = SEASON_SUITABILITY.get(season, [])
        loc_crops = LOCATION_DEMAND.get(location, [])
        reason_parts = []
        if crop in season_crops:
            reason_parts.append(f"optimal for {season} season")
        if crop in loc_crops:
            reason_parts.append(f"high demand in {location}")
        if scores["profitability_score"] > 0.6:
            reason_parts.append("above-average market price")
        if scores["risk_score"] < 0.3:
            reason_parts.append("low cultivation risk")
        reason = ", ".join(reason_parts) if reason_parts else "general market suitability"

        knowledge = CROP_KNOWLEDGE.get(crop, {})
        results.append({
            "crop": crop,
            "composite_score": round(ml_score, 4),
            "demand_score": scores["demand_score"],
            "profitability_score": scores["profitability_score"],
            "risk_score": scores["risk_score"],
            "grow_days": knowledge.get("grow_days", 90),
            "water_requirement": knowledge.get("water", "medium"),
            "reason": reason,
        })

    results.sort(key=lambda x: x["composite_score"], reverse=True)
    return results[:top_k]


if __name__ == "__main__":
    report = train_and_evaluate()
    print("\nSample recommendation:")
    recs = recommend_crops("Chennai", "Rabi", 11)
    for i, r in enumerate(recs, 1):
        print(f"  {i}. {r['crop']} â€” score={r['composite_score']}, demand={r['demand_score']}, risk={r['risk_score']}")
        print(f"     Why: {r['reason']}")

