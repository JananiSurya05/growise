"""
ML-2: Crop Price Prediction Engine
Models: Linear Regression -> Random Forest -> XGBoost -> LSTM
Evaluation: MAE, RMSE, R²
"""
import os
import json
import warnings
import numpy as np
import pandas as pd
import joblib
import mlflow
import mlflow.sklearn
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from xgboost import XGBRegressor

warnings.filterwarnings("ignore")

MODEL_DIR = "ml/models/saved"
REPORT_DIR = "ml/reports"
DATA_PATH = "ml/data/crop_prices.csv"

FEATURE_COLS = [
    "crop_encoded", "location_encoded", "month", "week", "year",
    "season_encoded", "is_peak_season", "quantity_kg",
]
TARGET_COL = "price"


def _load_and_engineer(path: str) -> tuple[pd.DataFrame, LabelEncoder, LabelEncoder, LabelEncoder]:
    df = pd.read_csv(path)

    le_crop = LabelEncoder()
    le_loc = LabelEncoder()
    le_season = LabelEncoder()

    df["crop_encoded"] = le_crop.fit_transform(df["crop_name"])
    df["location_encoded"] = le_loc.fit_transform(df["location"])
    df["season_encoded"] = le_season.fit_transform(df["season"])

    return df, le_crop, le_loc, le_season


def _evaluate(model, X_test: np.ndarray, y_test: np.ndarray, name: str) -> dict:
    preds = model.predict(X_test)
    mae = mean_absolute_error(y_test, preds)
    rmse = float(np.sqrt(mean_squared_error(y_test, preds)))
    r2 = r2_score(y_test, preds)
    print(f"  [{name}] MAE={mae:.2f}  RMSE={rmse:.2f}  R²={r2:.4f}")
    return {"model": name, "MAE": round(mae, 4), "RMSE": round(rmse, 4), "R2": round(r2, 4)}


def train_lstm(X_train, y_train, X_test, y_test) -> dict:
    """
    LSTM time-series model.
    Falls back gracefully if torch is unavailable (CPU training note).
    Returns evaluation metrics dict.
    """
    try:
        import torch
        import torch.nn as nn
        from torch.utils.data import DataLoader, TensorDataset

        class LSTMPriceModel(nn.Module):
            def __init__(self, input_size, hidden=64, layers=2):
                super().__init__()
                self.lstm = nn.LSTM(input_size, hidden, layers, batch_first=True, dropout=0.2)
                self.fc = nn.Linear(hidden, 1)

            def forward(self, x):
                out, _ = self.lstm(x)
                return self.fc(out[:, -1, :]).squeeze(-1)

        X_tr = torch.tensor(X_train, dtype=torch.float32).unsqueeze(1)
        y_tr = torch.tensor(y_train.values, dtype=torch.float32)
        X_te = torch.tensor(X_test, dtype=torch.float32).unsqueeze(1)
        y_te = torch.tensor(y_test.values, dtype=torch.float32)

        ds = TensorDataset(X_tr, y_tr)
        loader = DataLoader(ds, batch_size=64, shuffle=True)

        model_lstm = LSTMPriceModel(X_train.shape[1])
        optimizer = torch.optim.Adam(model_lstm.parameters(), lr=1e-3)
        criterion = nn.MSELoss()

        for epoch in range(30):
            model_lstm.train()
            for xb, yb in loader:
                optimizer.zero_grad()
                loss = criterion(model_lstm(xb), yb)
                loss.backward()
                optimizer.step()

        model_lstm.eval()
        with torch.no_grad():
            preds = model_lstm(X_te).numpy()

        mae = mean_absolute_error(y_te.numpy(), preds)
        rmse = float(np.sqrt(mean_squared_error(y_te.numpy(), preds)))
        r2 = r2_score(y_te.numpy(), preds)
        print(f"  [LSTM] MAE={mae:.2f}  RMSE={rmse:.2f}  R²={r2:.4f}")

        os.makedirs(MODEL_DIR, exist_ok=True)
        torch.save(model_lstm.state_dict(), f"{MODEL_DIR}/lstm_price.pt")
        return {"model": "LSTM", "MAE": round(mae, 4), "RMSE": round(rmse, 4), "R2": round(r2, 4)}

    except ImportError:
        print("  [LSTM] torch not installed — skipping (install pytorch for LSTM training)")
        return {"model": "LSTM", "MAE": None, "RMSE": None, "R2": None, "note": "torch not installed"}


def train_and_evaluate(data_path: str = DATA_PATH) -> dict:
    print("\n[ML-2] Crop Price Prediction Engine")
    print("=" * 50)

    os.makedirs(MODEL_DIR, exist_ok=True)
    os.makedirs(REPORT_DIR, exist_ok=True)

    df, le_crop, le_loc, le_season = _load_and_engineer(data_path)

    X = df[FEATURE_COLS].values
    y = df[TARGET_COL]

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y, test_size=0.2, random_state=42
    )

    mlflow.set_tracking_uri("sqlite:///ml/mlflow.db")
    mlflow.set_experiment("growise-price-prediction")
    results = []

    # --- Linear Regression ---
    with mlflow.start_run(run_name="LinearRegression"):
        lr = LinearRegression()
        lr.fit(X_train, y_train)
        metrics = _evaluate(lr, X_test, y_test, "LinearRegression")
        mlflow.log_metrics({"MAE": metrics["MAE"], "RMSE": metrics["RMSE"], "R2": metrics["R2"]})
        mlflow.sklearn.log_model(lr, "model")
        results.append(metrics)

    # --- Random Forest ---
    with mlflow.start_run(run_name="RandomForest"):
        rf = RandomForestRegressor(n_estimators=200, max_depth=12, n_jobs=-1, random_state=42)
        rf.fit(X_train, y_train)
        metrics = _evaluate(rf, X_test, y_test, "RandomForest")
        mlflow.log_params({"n_estimators": 200, "max_depth": 12})
        mlflow.log_metrics({"MAE": metrics["MAE"], "RMSE": metrics["RMSE"], "R2": metrics["R2"]})
        mlflow.sklearn.log_model(rf, "model")
        results.append(metrics)

        feat_imp = dict(zip(FEATURE_COLS, rf.feature_importances_.tolist()))
        print(f"  [RF] Feature importance: {json.dumps({k: round(v,3) for k,v in sorted(feat_imp.items(), key=lambda x:-x[1])[:5]})}")

    # --- XGBoost ---
    with mlflow.start_run(run_name="XGBoost"):
        xgb = XGBRegressor(
            n_estimators=300, max_depth=6, learning_rate=0.05,
            subsample=0.8, colsample_bytree=0.8, random_state=42, verbosity=0,
        )
        xgb.fit(X_train, y_train)
        metrics = _evaluate(xgb, X_test, y_test, "XGBoost")
        mlflow.log_params({"n_estimators": 300, "max_depth": 6, "lr": 0.05})
        mlflow.log_metrics({"MAE": metrics["MAE"], "RMSE": metrics["RMSE"], "R2": metrics["R2"]})
        results.append(metrics)

    # --- LSTM ---
    lstm_metrics = train_lstm(X_train, y_train, X_test, y_test)
    results.append(lstm_metrics)

    # --- Save best model (XGBoost by R²) ---
    best = max([r for r in results if r["R2"] is not None], key=lambda r: r["R2"])
    print(f"\n  Best model: {best['model']} (R²={best['R2']})")

    joblib.dump(xgb, f"{MODEL_DIR}/price_xgb.pkl")
    joblib.dump(rf, f"{MODEL_DIR}/price_rf.pkl")
    joblib.dump(lr, f"{MODEL_DIR}/price_lr.pkl")
    joblib.dump(scaler, f"{MODEL_DIR}/price_scaler.pkl")
    joblib.dump(le_crop, f"{MODEL_DIR}/price_le_crop.pkl")
    joblib.dump(le_loc, f"{MODEL_DIR}/price_le_loc.pkl")
    joblib.dump(le_season, f"{MODEL_DIR}/price_le_season.pkl")

    # Feature importance report
    feat_importance = {
        FEATURE_COLS[i]: round(float(rf.feature_importances_[i]), 4)
        for i in range(len(FEATURE_COLS))
    }

    report = {
        "phase": "ML-2",
        "task": "Crop Price Prediction",
        "models_evaluated": results,
        "best_model": best["model"],
        "feature_importance": feat_importance,
        "training_samples": len(X_train),
        "test_samples": len(X_test),
        "features": FEATURE_COLS,
        "target": TARGET_COL,
    }

    with open(f"{REPORT_DIR}/price_prediction_report.json", "w") as f:
        json.dump(report, f, indent=2)

    print(f"  Report saved -> {REPORT_DIR}/price_prediction_report.json")
    return report


def predict_price(
    crop_name: str,
    location: str,
    month: int,
    season: str,
    quantity_kg: float = 500.0,
    weeks_ahead: int = 1,
) -> dict:
    """Predict crop price for given parameters. Used by FastAPI."""
    le_crop = joblib.load(f"{MODEL_DIR}/price_le_crop.pkl")
    le_loc = joblib.load(f"{MODEL_DIR}/price_le_loc.pkl")
    le_season = joblib.load(f"{MODEL_DIR}/price_le_season.pkl")
    scaler = joblib.load(f"{MODEL_DIR}/price_scaler.pkl")
    xgb = joblib.load(f"{MODEL_DIR}/price_xgb.pkl")
    rf = joblib.load(f"{MODEL_DIR}/price_rf.pkl")

    # Encode
    try:
        crop_enc = le_crop.transform([crop_name])[0]
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

    target_month = ((month - 1 + weeks_ahead // 4) % 12) + 1
    year = 2025
    week = (month * 4) + (weeks_ahead % 4)
    is_peak = 0

    features = np.array([[
        crop_enc, loc_enc, target_month, week, year,
        season_enc, is_peak, quantity_kg
    ]])
    features_scaled = scaler.transform(features)

    xgb_pred = float(xgb.predict(features_scaled)[0])
    rf_pred = float(rf.predict(features_scaled)[0])
    ensemble_pred = round((xgb_pred * 0.6 + rf_pred * 0.4), 2)

    # Confidence score based on RF std across trees
    tree_preds = np.array([tree.predict(features_scaled)[0] for tree in rf.estimators_[:50]])
    std_dev = float(np.std(tree_preds))
    confidence = max(0.0, min(1.0, round(1.0 - std_dev / (ensemble_pred + 1e-6), 3)))

    return {
        "crop": crop_name,
        "location": location,
        "predicted_price": ensemble_pred,
        "confidence_score": confidence,
        "weeks_ahead": weeks_ahead,
        "model": "XGBoost+RF Ensemble",
        "individual_predictions": {
            "xgboost": round(xgb_pred, 2),
            "random_forest": round(rf_pred, 2),
        },
    }


if __name__ == "__main__":
    report = train_and_evaluate()
    print("\nSample prediction:")
    print(predict_price("Tomato", "Chennai", 3, "Rabi", 500, weeks_ahead=1))
