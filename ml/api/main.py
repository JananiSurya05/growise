"""
ML-7: GroWise FastAPI ML Service
Serves all trained models via REST endpoints.
Run: uvicorn ml.api.main:app --host 0.0.0.0 --port 8001 --reload
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional
import time

app = FastAPI(
    title="GroWise ML API",
    description="Trained ML models for agricultural intelligence",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"],
)


# ─── Request / Response Schemas ────────────────────────────────────────────────

class PricePredictionRequest(BaseModel):
    crop_name: str = Field(..., example="Tomato")
    location: str = Field(..., example="Chennai")
    month: int = Field(..., ge=1, le=12, example=3)
    season: str = Field(..., example="Rabi")
    quantity_kg: float = Field(default=500.0, ge=1, example=500)
    weeks_ahead: int = Field(default=1, ge=1, le=12, example=1)


class RecommendationRequest(BaseModel):
    location: str = Field(..., example="Chennai")
    season: str = Field(..., example="Rabi")
    month: int = Field(..., ge=1, le=12, example=11)
    top_k: int = Field(default=5, ge=1, le=15)


class SentimentRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=2000)


class AnomalyRequest(BaseModel):
    orders: list[dict]


class DiseaseRequest(BaseModel):
    image_b64: str = Field(..., description="Base64-encoded JPEG/PNG image")


# ─── Health ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "GroWise ML API",
        "version": "1.0.0",
        "timestamp": int(time.time()),
        "endpoints": [
            "/ml/price-prediction",
            "/ml/crop-recommendation",
            "/ml/sentiment",
            "/ml/anomaly-detection",
            "/ml/disease-detection",
        ],
    }


# ─── ML-2: Price Prediction ────────────────────────────────────────────────────

@app.post("/ml/price-prediction")
def price_prediction(req: PricePredictionRequest):
    """Predict crop price using XGBoost + Random Forest ensemble."""
    try:
        from ml.models.price_prediction import predict_price
        result = predict_price(
            crop_name=req.crop_name,
            location=req.location,
            month=req.month,
            season=req.season,
            quantity_kg=req.quantity_kg,
            weeks_ahead=req.weeks_ahead,
        )
        return result
    except FileNotFoundError:
        raise HTTPException(status_code=503, detail="Price prediction model not trained yet. Run python ml/train_all.py")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── ML-4: Crop Recommendation ─────────────────────────────────────────────────

@app.post("/ml/crop-recommendation")
def crop_recommendation(req: RecommendationRequest):
    """Recommend top crops for a given location and season."""
    try:
        from ml.models.crop_recommendation import recommend_crops
        recommendations = recommend_crops(
            location=req.location,
            season=req.season,
            month=req.month,
            top_k=req.top_k,
        )
        return {
            "location": req.location,
            "season": req.season,
            "month": req.month,
            "recommendations": recommendations,
        }
    except FileNotFoundError:
        raise HTTPException(status_code=503, detail="Recommendation model not trained yet. Run python ml/train_all.py")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── ML-5: Sentiment Analysis ──────────────────────────────────────────────────

@app.post("/ml/sentiment")
def sentiment_analysis(req: SentimentRequest):
    """Analyze sentiment of a consumer review."""
    try:
        from ml.models.sentiment import predict_sentiment
        result = predict_sentiment(req.text)
        return {"text": req.text[:100] + "..." if len(req.text) > 100 else req.text, **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/ml/farmer-reputation/{farmer_id}")
def farmer_reputation(farmer_id: str):
    """Get computed reputation score for a farmer."""
    try:
        from ml.models.sentiment import get_farmer_reputation
        return get_farmer_reputation(farmer_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── ML-6: Anomaly Detection ───────────────────────────────────────────────────

@app.post("/ml/anomaly-detection")
def anomaly_detection(req: AnomalyRequest):
    """Detect anomalous orders for government monitoring."""
    if not req.orders:
        raise HTTPException(status_code=400, detail="orders list cannot be empty")
    try:
        from ml.models.anomaly_detection import detect_anomalies
        results = detect_anomalies(req.orders)
        n_anomalies = sum(1 for r in results if r["is_anomaly"])
        return {
            "total_orders": len(results),
            "anomalies_detected": n_anomalies,
            "anomaly_rate": round(n_anomalies / len(results), 4),
            "results": results,
        }
    except FileNotFoundError:
        raise HTTPException(status_code=503, detail="Anomaly model not trained yet. Run python ml/train_all.py")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── ML-3: Disease Detection ───────────────────────────────────────────────────

@app.post("/ml/disease-detection")
def disease_detection(req: DiseaseRequest):
    """Classify plant disease from leaf image using ONNX model."""
    if not req.image_b64:
        raise HTTPException(status_code=400, detail="image_b64 is required")
    try:
        from ml.models.disease_detection import predict_from_base64
        result = predict_from_base64(req.image_b64)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Model Registry ─────────────────────────────────────────────────────────────

@app.get("/ml/model-registry")
def model_registry():
    """List all trained models and their files."""
    model_dir = "ml/models/saved"
    if not os.path.exists(model_dir):
        return {"status": "no models trained", "message": "Run python ml/train_all.py"}

    files = os.listdir(model_dir)
    return {
        "model_dir": model_dir,
        "files": sorted(files),
        "count": len(files),
        "models": {
            "price_prediction": [f for f in files if "price" in f],
            "recommendation": [f for f in files if "rec" in f or "recommender" in f],
            "sentiment": [f for f in files if "sentiment" in f or "reputation" in f],
            "anomaly": [f for f in files if "anomaly" in f],
            "disease": [f for f in files if "disease" in f or "autoencoder" in f],
        },
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("ml.api.main:app", host="0.0.0.0", port=8001, reload=True)
