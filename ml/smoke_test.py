"""Quick inference smoke test for all deployed models."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ml.models.price_prediction import predict_price
from ml.models.crop_recommendation import recommend_crops
from ml.models.sentiment import predict_sentiment
from ml.models.anomaly_detection import detect_anomalies

print("== Price Prediction ==")
r = predict_price("Tomato", "Chennai", 3, "Rabi", 500, weeks_ahead=1)
print(f"  Tomato next week: Rs{r['predicted_price']:.2f}/kg | confidence={r['confidence_score']}")

print("== Crop Recommendations (Chennai, Rabi) ==")
for i, rec in enumerate(recommend_crops("Chennai", "Rabi", 11, top_k=3), 1):
    print(f"  {i}. {rec['crop']} | score={rec['composite_score']} | {rec['reason']}")

print("== Sentiment ==")
pos = predict_sentiment("Excellent fresh tomatoes! Very happy with the quality.")
neg = predict_sentiment("Vegetables were rotten. Terrible experience.")
print(f"  Positive review: {pos['label']} ({pos['confidence']})")
print(f"  Negative review: {neg['label']} ({neg['confidence']})")

print("== Anomaly Detection ==")
orders = [
    {"order_id": "normal", "price_per_kg": 40, "quantity_kg": 20, "total": 800, "amount_saved": 180},
    {"order_id": "fraud",  "price_per_kg": 5000, "quantity_kg": 5000, "total": 25000000, "amount_saved": 0},
]
for r in detect_anomalies(orders):
    print(f"  {r['order_id']}: anomaly={r['is_anomaly']} risk={r['risk_level']} score={r['anomaly_score']}")

print("\nAll models operational.")
