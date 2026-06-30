#!/usr/bin/env python
"""
ML-3: MobileNetV2 Transfer Learning — PlantVillage Dataset
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
        print(f"\n=== Training {arch} ===")
        acc = train(arch)
        print(f"{arch} best accuracy: {acc:.4f}")
