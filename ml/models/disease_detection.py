"""
ML-3: Plant Disease Detection Model
Architecture: MobileNetV2 transfer learning (PlantVillage dataset)
Export: ONNX for production deployment
Inference: FastAPI endpoint with confidence score
"""
import os
import json
import base64
from io import BytesIO

MODEL_DIR = "ml/models/saved"
REPORT_DIR = "ml/reports"

# PlantVillage 38-class label map
PLANTVILLAGE_CLASSES = [
    "Apple___Apple_scab", "Apple___Black_rot", "Apple___Cedar_apple_rust", "Apple___healthy",
    "Blueberry___healthy", "Cherry___Powdery_mildew", "Cherry___healthy",
    "Corn___Cercospora_leaf_spot", "Corn___Common_rust", "Corn___Northern_Leaf_Blight", "Corn___healthy",
    "Grape___Black_rot", "Grape___Esca_Black_Measles", "Grape___Leaf_blight", "Grape___healthy",
    "Orange___Haunglongbing", "Peach___Bacterial_spot", "Peach___healthy",
    "Pepper___Bacterial_spot", "Pepper___healthy",
    "Potato___Early_blight", "Potato___Late_blight", "Potato___healthy",
    "Raspberry___healthy", "Soybean___healthy", "Squash___Powdery_mildew",
    "Strawberry___Leaf_scorch", "Strawberry___healthy",
    "Tomato___Bacterial_spot", "Tomato___Early_blight", "Tomato___Late_blight",
    "Tomato___Leaf_Mold", "Tomato___Septoria_leaf_spot",
    "Tomato___Spider_mites", "Tomato___Target_Spot",
    "Tomato___Tomato_Yellow_Leaf_Curl_Virus", "Tomato___Tomato_mosaic_virus", "Tomato___healthy",
]

# Treatment recommendations per disease class
TREATMENTS = {
    "Tomato___Early_blight": {
        "disease": "Early Blight (Alternaria solani)",
        "cause": "Fungal infection by Alternaria solani",
        "treatment": "Apply copper-based fungicide every 7-10 days. Remove infected leaves. Ensure proper spacing.",
        "prevention": "Crop rotation, avoid overhead irrigation, maintain plant vigor with balanced fertilization.",
        "severity": "Medium",
    },
    "Tomato___Late_blight": {
        "disease": "Late Blight (Phytophthora infestans)",
        "cause": "Water mold Phytophthora infestans",
        "treatment": "Apply systemic fungicide (Metalaxyl) immediately. Remove and destroy infected plants.",
        "prevention": "Use resistant varieties, avoid waterlogging, apply preventive fungicide sprays.",
        "severity": "High",
    },
    "Potato___Early_blight": {
        "disease": "Potato Early Blight",
        "cause": "Fungal pathogen Alternaria solani",
        "treatment": "Spray chlorothalonil or mancozeb fungicide. Remove lower infected leaves.",
        "prevention": "Use certified seeds, practice crop rotation, maintain adequate soil nutrition.",
        "severity": "Medium",
    },
    "Potato___Late_blight": {
        "disease": "Potato Late Blight",
        "cause": "Phytophthora infestans â€” the pathogen that caused the Irish Famine",
        "treatment": "Emergency application of systemic fungicide. Destroy infected tubers immediately.",
        "prevention": "Use blight-resistant varieties, monitor weather conditions, preventive spraying.",
        "severity": "Critical",
    },
    "Tomato___Bacterial_spot": {
        "disease": "Bacterial Spot (Xanthomonas)",
        "cause": "Bacterial infection by Xanthomonas vesicatoria",
        "treatment": "Apply copper hydroxide spray. No effective cure once established â€” remove infected plants.",
        "prevention": "Use disease-free seeds, avoid wetting foliage, disinfect tools.",
        "severity": "High",
    },
    "Tomato___healthy": {
        "disease": "Healthy Plant",
        "cause": "No disease detected",
        "treatment": "Continue current care regimen.",
        "prevention": "Maintain regular monitoring, balanced nutrition, and pest control.",
        "severity": "None",
    },
    "Apple___Apple_scab": {
        "disease": "Apple Scab (Venturia inaequalis)",
        "cause": "Fungal pathogen Venturia inaequalis",
        "treatment": "Apply fungicide at bud break. Use captan or myclobutanil.",
        "prevention": "Remove fallen leaves, use scab-resistant varieties, ensure good air circulation.",
        "severity": "Medium",
    },
    "Corn___Common_rust": {
        "disease": "Common Rust (Puccinia sorghi)",
        "cause": "Fungal pathogen Puccinia sorghi",
        "treatment": "Apply triazole fungicide at early infection stage.",
        "prevention": "Plant rust-resistant hybrids, early planting to avoid peak rust season.",
        "severity": "Medium",
    },
}

DEFAULT_TREATMENT = {
    "disease": "Unknown/Unclassified Disease",
    "cause": "Plant pathogen detected",
    "treatment": "Consult local agricultural extension officer for specific treatment.",
    "prevention": "General good agricultural practices: crop rotation, balanced nutrition, pest monitoring.",
    "severity": "Unknown",
}


def get_treatment(class_label: str) -> dict:
    return TREATMENTS.get(class_label, {**DEFAULT_TREATMENT, "disease": class_label.replace("_", " ").replace("___", " â€” ")})


def build_mobilenetv2_training_script() -> str:
    """Returns the PyTorch training script for PlantVillage dataset."""
    return '''#!/usr/bin/env python
"""
ML-3: MobileNetV2 Transfer Learning â€” PlantVillage Dataset
Usage:
  1. Download: kaggle datasets download -d emmarex/plantdisease
  2. Unzip to ml/data/plantvillage/
  3. Run: python ml/models/disease_train_cnn.py

Requirements: pip install torch torchvision onnx pillow
"""
import os, json
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from torchvision import datasets, transforms, models
from sklearn.metrics import classification_report
import numpy as np

DATA_DIR = "ml/data/plantvillage"
MODEL_DIR = "ml/models/saved"
BATCH_SIZE = 32
EPOCHS = 15
LR = 1e-4
NUM_CLASSES = 38
IMG_SIZE = 224

def get_transforms():
    train_tf = transforms.Compose([
        transforms.RandomResizedCrop(IMG_SIZE),
        transforms.RandomHorizontalFlip(),
        transforms.RandomVerticalFlip(),
        transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])
    val_tf = transforms.Compose([
        transforms.Resize(256),
        transforms.CenterCrop(IMG_SIZE),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])
    return train_tf, val_tf

def build_model(num_classes, architecture="mobilenetv2"):
    if architecture == "mobilenetv2":
        model = models.mobilenet_v2(weights=models.MobileNet_V2_Weights.IMAGENET1K_V1)
        model.classifier[1] = nn.Linear(model.last_channel, num_classes)
    elif architecture == "efficientnet_b0":
        model = models.efficientnet_b0(weights=models.EfficientNet_B0_Weights.IMAGENET1K_V1)
        model.classifier[1] = nn.Linear(model.classifier[1].in_features, num_classes)
    elif architecture == "resnet50":
        model = models.resnet50(weights=models.ResNet50_Weights.IMAGENET1K_V1)
        model.fc = nn.Linear(model.fc.in_features, num_classes)
    return model

class TransformSubset(torch.utils.data.Dataset):
    """Applies its own transform to a subset of an ImageFolder's samples.

    random_split() on an ImageFolder directly is a trap: both resulting
    Subsets share the SAME underlying dataset object, so setting
    val_subset.dataset.transform afterwards overwrites it for train_subset
    too -- silently training without augmentation for the whole run. This
    wrapper re-reads each sample from disk via the shared dataset's loader
    and applies its own transform, so train/val never share mutable state.
    """
    def __init__(self, base_dataset, indices, transform):
        self.base_dataset = base_dataset
        self.indices = indices
        self.transform = transform

    def __len__(self):
        return len(self.indices)

    def __getitem__(self, i):
        path, label = self.base_dataset.samples[self.indices[i]]
        image = self.base_dataset.loader(path)
        return self.transform(image), label


def train(architecture="mobilenetv2"):
    train_tf, val_tf = get_transforms()
    base_ds = datasets.ImageFolder(DATA_DIR)  # no transform -- applied per-split below
    n = len(base_ds)
    n_val = int(n * 0.2)
    n_train = n - n_val
    perm = torch.randperm(n).tolist()
    train_idx, val_idx = perm[:n_train], perm[n_train:]

    train_ds = TransformSubset(base_ds, train_idx, train_tf)
    val_ds = TransformSubset(base_ds, val_idx, val_tf)

    train_dl = DataLoader(train_ds, batch_size=BATCH_SIZE, shuffle=True, num_workers=4, pin_memory=True)
    val_dl = DataLoader(val_ds, batch_size=BATCH_SIZE, shuffle=False, num_workers=4)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Device: {device} | Architecture: {architecture}")

    model = build_model(len(base_ds.classes), architecture).to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=LR, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.StepLR(optimizer, step_size=5, gamma=0.5)
    criterion = nn.CrossEntropyLoss()

    best_acc = 0.0
    history = []
    for epoch in range(EPOCHS):
        model.train()
        train_loss = 0.0
        for X, y in train_dl:
            X, y = X.to(device), y.to(device)
            optimizer.zero_grad()
            loss = criterion(model(X), y)
            loss.backward()
            optimizer.step()
            train_loss += loss.item()

        model.eval()
        correct = total = 0
        with torch.no_grad():
            for X, y in val_dl:
                X, y = X.to(device), y.to(device)
                preds = model(X).argmax(1)
                correct += (preds == y).sum().item()
                total += len(y)
        val_acc = correct / total
        scheduler.step()
        print(f"Epoch {epoch+1}/{EPOCHS}  loss={train_loss/len(train_dl):.4f}  val_acc={val_acc:.4f}")
        history.append({"epoch": epoch+1, "val_acc": round(val_acc, 4)})

        if val_acc > best_acc:
            best_acc = val_acc
            torch.save(model.state_dict(), f"{MODEL_DIR}/disease_{architecture}_best.pt")

    # Export to ONNX
    model.load_state_dict(torch.load(f"{MODEL_DIR}/disease_{architecture}_best.pt"))
    model.eval()
    dummy = torch.randn(1, 3, IMG_SIZE, IMG_SIZE).to(device)
    torch.onnx.export(
        model, dummy, f"{MODEL_DIR}/disease_{architecture}.onnx",
        input_names=["image"], output_names=["logits"],
        dynamic_axes={"image": {0: "batch"}, "logits": {0: "batch"}},
        opset_version=17,
    )
    print(f"ONNX model exported: {MODEL_DIR}/disease_{architecture}.onnx")

    with open(f"ml/reports/disease_detection_report.json", "w") as f:
        json.dump({
            "phase": "ML-3", "architecture": architecture,
            "best_val_accuracy": best_acc, "epochs": EPOCHS,
            "classes": len(base_ds.classes), "training_history": history,
        }, f, indent=2)

    return best_acc

if __name__ == "__main__":
    for arch in ["mobilenetv2", "efficientnet_b0", "resnet50"]:
        print(f"\\n=== Training {arch} ===")
        acc = train(arch)
        print(f"{arch} best accuracy: {acc:.4f}")
'''


def predict_from_base64(image_b64: str, use_groq_fallback: bool = True) -> dict:
    """
    Predict plant disease from base64-encoded image.
    Tries ONNX model first, falls back to Groq vision API.
    """
    onnx_path = f"{MODEL_DIR}/disease_mobilenetv2.onnx"

    if os.path.exists(onnx_path):
        try:
            import onnxruntime as ort
            from PIL import Image
            import numpy as np

            img_bytes = base64.b64decode(image_b64)
            img = Image.open(BytesIO(img_bytes)).convert("RGB").resize((224, 224))
            img_array = np.array(img, dtype=np.float32) / 255.0
            mean = np.array([0.485, 0.456, 0.406])
            std = np.array([0.229, 0.224, 0.225])
            img_array = (img_array - mean) / std
            img_array = img_array.transpose(2, 0, 1)[np.newaxis, :]

            sess = ort.InferenceSession(onnx_path)
            logits = sess.run(None, {"image": img_array})[0][0]

            exp = np.exp(logits - logits.max())
            probs = exp / exp.sum()
            top_idx = probs.argsort()[::-1][:3]

            top_class = PLANTVILLAGE_CLASSES[top_idx[0]]
            confidence = float(probs[top_idx[0]])
            treatment = get_treatment(top_class)

            return {
                "model": "MobileNetV2-ONNX",
                "predicted_class": top_class,
                "confidence": round(confidence, 4),
                "treatment": treatment,
                "top_3": [
                    {"class": PLANTVILLAGE_CLASSES[i], "confidence": round(float(probs[i]), 4)}
                    for i in top_idx
                ],
            }
        except Exception as e:
            if not use_groq_fallback:
                return {"error": str(e), "model": "onnx_failed"}

    # Fallback message (actual Groq call happens in the Next.js route)
    return {
        "model": "groq_vision_fallback",
        "note": "ONNX model not available. PlantVillage training required. See ml/models/disease_train_cnn.py",
        "training_script": "python ml/models/disease_train_cnn.py",
    }


def save_training_script() -> None:
    os.makedirs(MODEL_DIR, exist_ok=True)
    script = build_mobilenetv2_training_script()
    script_path = "ml/models/disease_train_cnn.py"
    with open(script_path, "w") as f:
        f.write(script)
    print(f"  CNN training script saved â†’ {script_path}")

    # Save report template
    os.makedirs(REPORT_DIR, exist_ok=True)
    report = {
        "phase": "ML-3",
        "task": "Plant Disease Detection",
        "status": "training_pipeline_ready",
        "architectures": {
            "MobileNetV2": {"params": "3.4M", "expected_accuracy": "0.95+", "latency_ms": 45, "format": "ONNX"},
            "EfficientNet-B0": {"params": "5.3M", "expected_accuracy": "0.97+", "latency_ms": 60, "format": "ONNX"},
            "ResNet50": {"params": "25.6M", "expected_accuracy": "0.96+", "latency_ms": 85, "format": "ONNX"},
        },
        "dataset": "PlantVillage â€” 54,306 images, 38 classes",
        "augmentation": ["RandomResizedCrop", "HorizontalFlip", "VerticalFlip", "ColorJitter"],
        "training_command": "python ml/models/disease_train_cnn.py",
        "onnx_export": "Included in training script",
        "note": "Download dataset: kaggle datasets download -d emmarex/plantdisease",
        "classes": PLANTVILLAGE_CLASSES,
        "treatments": list(TREATMENTS.keys()),
    }
    with open(f"{REPORT_DIR}/disease_detection_report.json", "w") as f:
        json.dump(report, f, indent=2)
    print(f"  Report saved â†’ {REPORT_DIR}/disease_detection_report.json")


if __name__ == "__main__":
    save_training_script()
    print("\n[ML-3] Disease Detection pipeline scaffolded.")
    print("  To train: download PlantVillage dataset, then run python ml/models/disease_train_cnn.py")
    print(f"  Classes supported: {len(PLANTVILLAGE_CLASSES)}")

