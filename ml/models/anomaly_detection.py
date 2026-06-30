"""
ML-6: Government Anomaly Detection Engine
Models: Z-Score â†’ Isolation Forest â†’ Autoencoder
Detects: price spikes, fraud, market manipulation, demand anomalies
"""
import os
import json
import warnings
import numpy as np
import pandas as pd
import joblib
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report

warnings.filterwarnings("ignore")

MODEL_DIR = "ml/models/saved"
REPORT_DIR = "ml/reports"

FEATURE_COLS = ["price_per_kg", "quantity_kg", "total", "amount_saved"]
Z_THRESHOLD = 2.5
CONTAMINATION = 0.05  # 5% anomalies expected


def z_score_detect(df: pd.DataFrame, threshold: float = Z_THRESHOLD) -> np.ndarray:
    """Baseline: Z-score anomaly detection per feature."""
    scores = np.zeros(len(df))
    for col in FEATURE_COLS:
        if col not in df.columns:
            continue
        z = np.abs((df[col] - df[col].mean()) / (df[col].std() + 1e-9))
        scores = np.maximum(scores, z.values)
    return (scores > threshold).astype(int)


def train_autoencoder(X_train: np.ndarray, X_test: np.ndarray) -> dict:
    """
    Autoencoder anomaly detection using PyTorch.
    Falls back gracefully if torch is unavailable.
    """
    try:
        import torch
        import torch.nn as nn

        class Autoencoder(nn.Module):
            def __init__(self, input_dim):
                super().__init__()
                self.encoder = nn.Sequential(
                    nn.Linear(input_dim, 16),
                    nn.ReLU(),
                    nn.Linear(16, 8),
                    nn.ReLU(),
                    nn.Linear(8, 4),
                )
                self.decoder = nn.Sequential(
                    nn.Linear(4, 8),
                    nn.ReLU(),
                    nn.Linear(8, 16),
                    nn.ReLU(),
                    nn.Linear(16, input_dim),
                )

            def forward(self, x):
                return self.decoder(self.encoder(x))

        X_tr = torch.tensor(X_train, dtype=torch.float32)
        X_te = torch.tensor(X_test, dtype=torch.float32)

        ae = Autoencoder(X_train.shape[1])
        optimizer = torch.optim.Adam(ae.parameters(), lr=1e-3)
        criterion = nn.MSELoss()

        for epoch in range(50):
            ae.train()
            optimizer.zero_grad()
            recon = ae(X_tr)
            loss = criterion(recon, X_tr)
            loss.backward()
            optimizer.step()

        ae.eval()
        with torch.no_grad():
            recon_test = ae(X_te)
            recon_errors = ((X_te - recon_test) ** 2).mean(dim=1).numpy()

        threshold = np.percentile(recon_errors, 95)
        preds = (recon_errors > threshold).astype(int)

        os.makedirs(MODEL_DIR, exist_ok=True)
        torch.save(ae.state_dict(), f"{MODEL_DIR}/autoencoder_anomaly.pt")
        return {"method": "Autoencoder", "threshold": float(threshold), "predictions": preds, "errors": recon_errors}

    except ImportError:
        print("  [Autoencoder] torch not installed â€” skipping")
        return {"method": "Autoencoder", "note": "torch not installed"}


def inject_anomalies(df: pd.DataFrame, frac: float = 0.05) -> tuple[pd.DataFrame, np.ndarray]:
    """Inject synthetic anomalies for evaluation."""
    n_anomalies = int(len(df) * frac)
    labels = np.zeros(len(df), dtype=int)

    anomaly_indices = np.random.choice(len(df), n_anomalies, replace=False)
    df = df.copy()

    for idx in anomaly_indices:
        anomaly_type = np.random.choice(["price_spike", "quantity_fraud", "impossible_saving"])
        if anomaly_type == "price_spike":
            df.iloc[idx, df.columns.get_loc("price_per_kg")] *= np.random.uniform(5, 10)
        elif anomaly_type == "quantity_fraud":
            df.iloc[idx, df.columns.get_loc("quantity_kg")] *= np.random.uniform(20, 50)
        else:
            df.iloc[idx, df.columns.get_loc("amount_saved")] = df.iloc[idx]["total"] * 2
        labels[idx] = 1

    return df, labels


def train_and_evaluate(order_path: str = "ml/data/orders.csv") -> dict:
    print("\n[ML-6] Government Anomaly Detection Engine")
    print("=" * 50)

    os.makedirs(MODEL_DIR, exist_ok=True)
    os.makedirs(REPORT_DIR, exist_ok=True)

    df = pd.read_csv(order_path)
    df_numeric = df[FEATURE_COLS].fillna(0)

    # Inject anomalies for evaluation
    df_eval, true_labels = inject_anomalies(df_numeric)

    scaler = StandardScaler()
    X = scaler.fit_transform(df_eval[FEATURE_COLS].values)
    X_clean = scaler.transform(df_numeric.values)

    # --- Z-Score baseline ---
    z_preds = z_score_detect(df_eval)
    from sklearn.metrics import precision_score, recall_score, f1_score
    z_precision = precision_score(true_labels, z_preds, zero_division=0)
    z_recall = recall_score(true_labels, z_preds, zero_division=0)
    z_f1 = f1_score(true_labels, z_preds, zero_division=0)
    print(f"  [Z-Score]          P={z_precision:.3f}  R={z_recall:.3f}  F1={z_f1:.3f}")

    # --- Isolation Forest ---
    iso = IsolationForest(
        n_estimators=200,
        contamination=CONTAMINATION,
        random_state=42,
        n_jobs=-1,
    )
    iso.fit(X_clean)
    iso_preds_raw = iso.predict(X)
    iso_preds = (iso_preds_raw == -1).astype(int)

    iso_precision = precision_score(true_labels, iso_preds, zero_division=0)
    iso_recall = recall_score(true_labels, iso_preds, zero_division=0)
    iso_f1 = f1_score(true_labels, iso_preds, zero_division=0)
    print(f"  [Isolation Forest] P={iso_precision:.3f}  R={iso_recall:.3f}  F1={iso_f1:.3f}")

    # --- Autoencoder ---
    ae_result = train_autoencoder(X_clean[:int(len(X)*0.8)], X[int(len(X)*0.8):])

    joblib.dump(iso, f"{MODEL_DIR}/anomaly_isoforest.pkl")
    joblib.dump(scaler, f"{MODEL_DIR}/anomaly_scaler.pkl")

    # Anomaly scores for all orders (for dashboard)
    anomaly_scores = -iso.score_samples(scaler.transform(df_numeric.values))
    anomaly_scores_norm = (anomaly_scores - anomaly_scores.min()) / (anomaly_scores.max() - anomaly_scores.min() + 1e-9)
    df["anomaly_score"] = anomaly_scores_norm.round(4)
    df["is_anomaly"] = (iso.predict(scaler.transform(df_numeric.values)) == -1).astype(int)

    report = {
        "phase": "ML-6",
        "task": "Anomaly Detection",
        "models": {
            "Z-Score": {"precision": round(z_precision, 4), "recall": round(z_recall, 4), "f1": round(z_f1, 4)},
            "IsolationForest": {"precision": round(iso_precision, 4), "recall": round(iso_recall, 4), "f1": round(iso_f1, 4)},
            "Autoencoder": ae_result.get("method", "skipped"),
        },
        "total_transactions": len(df),
        "anomalies_detected": int(df["is_anomaly"].sum()),
        "contamination_rate": CONTAMINATION,
        "features": FEATURE_COLS,
    }

    with open(f"{REPORT_DIR}/anomaly_detection_report.json", "w") as f:
        json.dump(report, f, indent=2)

    print(f"  Anomalies detected: {df['is_anomaly'].sum()} / {len(df)} orders")
    print(f"  Report saved â†’ {REPORT_DIR}/anomaly_detection_report.json")
    return report


def detect_anomalies(orders: list[dict]) -> list[dict]:
    """Detect anomalies in a list of order dicts. Used by FastAPI."""
    iso = joblib.load(f"{MODEL_DIR}/anomaly_isoforest.pkl")
    scaler = joblib.load(f"{MODEL_DIR}/anomaly_scaler.pkl")

    df = pd.DataFrame(orders)
    for col in FEATURE_COLS:
        if col not in df.columns:
            df[col] = 0.0

    X = scaler.transform(df[FEATURE_COLS].fillna(0).values)
    preds = iso.predict(X)
    scores = -iso.score_samples(X)
    scores_norm = (scores - scores.min()) / (scores.max() - scores.min() + 1e-9)

    results = []
    for i, order in enumerate(orders):
        is_anomaly = preds[i] == -1
        risk_level = "HIGH" if scores_norm[i] > 0.8 else "MEDIUM" if scores_norm[i] > 0.5 else "LOW"

        alert_reasons = []
        row = df.iloc[i]
        if row.get("price_per_kg", 0) > 500:
            alert_reasons.append("Unusual price (>â‚¹500/kg)")
        if row.get("quantity_kg", 0) > 1000:
            alert_reasons.append("Unusually large quantity")
        if row.get("amount_saved", 0) > row.get("total", 1):
            alert_reasons.append("Savings exceed order total â€” impossible")
        if not alert_reasons and is_anomaly:
            alert_reasons.append("Statistical anomaly detected by Isolation Forest")

        results.append({
            "order_id": order.get("order_id", f"order_{i}"),
            "is_anomaly": bool(is_anomaly),
            "anomaly_score": round(float(scores_norm[i]), 4),
            "risk_level": risk_level,
            "alert_reasons": alert_reasons,
        })

    return results


if __name__ == "__main__":
    report = train_and_evaluate()
    print("\nSample detection:")
    test_orders = [
        {"order_id": "o1", "price_per_kg": 45, "quantity_kg": 20, "total": 900, "amount_saved": 200},
        {"order_id": "o2", "price_per_kg": 5000, "quantity_kg": 2000, "total": 10000000, "amount_saved": 0},
    ]
    results = detect_anomalies(test_orders)
    for r in results:
        print(f"  {r['order_id']}: anomaly={r['is_anomaly']}, score={r['anomaly_score']}, risk={r['risk_level']}")

