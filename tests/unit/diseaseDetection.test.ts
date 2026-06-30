import { describe, it, expect } from "vitest";
import {
  isUsableModelPrediction,
  formatMlPrediction,
  toRawBase64,
  DISEASE_MODEL_CONFIDENCE_THRESHOLD,
} from "../../app/lib/diseaseDetection";

// Stub responses shaped exactly like ml/models/disease_detection.py's
// predict_from_base64() return values, so this exercises the real contract
// without needing trained weights, ONNX runtime, or the Python service running.
const highConfidencePrediction = {
  model: "MobileNetV2-ONNX",
  predicted_class: "Tomato___Late_blight",
  confidence: 0.94,
  treatment: {
    disease: "Late Blight (Phytophthora infestans)",
    cause: "Water mold Phytophthora infestans",
    treatment: "Apply systemic fungicide (Metalaxyl) immediately.",
    prevention: "Use resistant varieties, avoid waterlogging.",
    severity: "High",
  },
  top_3: [
    { class: "Tomato___Late_blight", confidence: 0.94 },
    { class: "Tomato___Early_blight", confidence: 0.04 },
    { class: "Tomato___healthy", confidence: 0.02 },
  ],
};

const lowConfidencePrediction = { ...highConfidencePrediction, confidence: 0.31 };

const groqFallbackSignal = {
  model: "groq_vision_fallback",
  note: "ONNX model not available. PlantVillage training required.",
  training_script: "python ml/models/disease_train_cnn.py",
};

describe("isUsableModelPrediction", () => {
  it("accepts a high-confidence ONNX prediction", () => {
    expect(isUsableModelPrediction(highConfidencePrediction)).toBe(true);
  });

  it("rejects a low-confidence ONNX prediction (falls through to Groq)", () => {
    expect(isUsableModelPrediction(lowConfidencePrediction)).toBe(false);
  });

  it("rejects the groq_vision_fallback signal (no model trained yet)", () => {
    expect(isUsableModelPrediction(groqFallbackSignal)).toBe(false);
  });

  it("rejects an error-shaped response", () => {
    expect(isUsableModelPrediction({ error: "onnx_failed", model: "onnx_failed" })).toBe(false);
  });

  it("rejects a confidence exactly at the boundary minus an epsilon", () => {
    const justBelow = { ...highConfidencePrediction, confidence: DISEASE_MODEL_CONFIDENCE_THRESHOLD - 0.001 };
    expect(isUsableModelPrediction(justBelow)).toBe(false);
  });

  it("accepts a confidence exactly at the threshold", () => {
    const atThreshold = { ...highConfidencePrediction, confidence: DISEASE_MODEL_CONFIDENCE_THRESHOLD };
    expect(isUsableModelPrediction(atThreshold)).toBe(true);
  });

  it("respects a custom threshold override", () => {
    expect(isUsableModelPrediction(lowConfidencePrediction, 0.2)).toBe(true);
  });
});

describe("formatMlPrediction", () => {
  it("includes the disease name, treatment, and rounded confidence percentage", () => {
    const text = formatMlPrediction(highConfidencePrediction);
    expect(text).toContain("94% confidence");
    expect(text).toContain("Late Blight (Phytophthora infestans)");
    expect(text).toContain("Apply systemic fungicide (Metalaxyl) immediately.");
    expect(text).toContain("Use resistant varieties, avoid waterlogging.");
  });
});

describe("toRawBase64", () => {
  it("strips a data URL prefix down to the base64 payload", () => {
    expect(toRawBase64("data:image/png;base64,iVBORw0KGgo=")).toBe("iVBORw0KGgo=");
  });

  it("returns the input unchanged if there is no comma", () => {
    expect(toRawBase64("iVBORw0KGgo=")).toBe("iVBORw0KGgo=");
  });
});
