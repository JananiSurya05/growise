// Decides whether a response from the Python ML service (POST /ml/disease-detection)
// is trustworthy enough to show directly, or whether /api/disease should fall
// back to the Groq vision LLM. Pure functions, no fetch/IO here, so this can
// be unit-tested independently of the ML service, ONNX runtime, or trained
// weights — see tests/unit/diseaseDetection.test.ts.
//
// ml/models/disease_detection.py's predict_from_base64() returns one of:
//   - a real prediction (model: "MobileNetV2-ONNX", confidence, treatment, ...)
//     when ml/models/saved/disease_mobilenetv2.onnx exists
//   - a fallback signal (model: "groq_vision_fallback") when it doesn't
// Dropping the trained .onnx file into that path changes which of these the
// Python service returns — nothing here needs to change either way.

export const DISEASE_MODEL_CONFIDENCE_THRESHOLD = 0.6;

export interface MlDiseaseTreatment {
  disease: string;
  cause: string;
  treatment: string;
  prevention: string;
  severity: string;
}

export interface MlDiseasePrediction {
  model: string;
  predicted_class: string;
  confidence: number;
  treatment: MlDiseaseTreatment;
  top_3: Array<{ class: string; confidence: number }>;
}

export type MlDiseaseResponse = MlDiseasePrediction | Record<string, unknown>;

export function isUsableModelPrediction(
  response: MlDiseaseResponse,
  threshold: number = DISEASE_MODEL_CONFIDENCE_THRESHOLD
): response is MlDiseasePrediction {
  const r = response as Partial<MlDiseasePrediction>;
  return (
    typeof r.predicted_class === "string" &&
    typeof r.confidence === "number" &&
    Number.isFinite(r.confidence) &&
    r.confidence >= threshold &&
    typeof r.treatment === "object" &&
    r.treatment !== null
  );
}

export function formatMlPrediction(prediction: MlDiseasePrediction): string {
  const { treatment, confidence } = prediction;
  const confidencePct = Math.round(confidence * 100);
  return [
    `🌿 Plant analysed (${confidencePct}% confidence)`,
    `🦠 Disease/Issue detected: ${treatment.disease}`,
    `📋 Cause: ${treatment.cause}`,
    `💊 Treatment: ${treatment.treatment}`,
    `🛡️ Prevention tips: ${treatment.prevention}`,
  ].join("\n\n");
}

// Strips a "data:image/png;base64,..." prefix down to the raw base64 payload
// the Python service's image_b64 field expects — the Next.js route validates
// and forwards the full data URL to Groq (which wants it), but the ML
// service's base64.b64decode() call would choke on the "data:...," prefix.
export function toRawBase64(dataUrl: string): string {
  const commaIndex = dataUrl.indexOf(",");
  return commaIndex === -1 ? dataUrl : dataUrl.slice(commaIndex + 1);
}
