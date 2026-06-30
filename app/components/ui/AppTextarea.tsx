"use client";
import { TextareaHTMLAttributes, useId } from "react";

interface AppTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export default function AppTextarea({ label, error, id, style, ...rest }: AppTextareaProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div>
      {label && (
        <label htmlFor={inputId} style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginBottom: "6px", display: "block" }}>
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        aria-invalid={error ? true : undefined}
        {...rest}
        style={{
          width: "100%",
          background: "rgba(255,255,255,0.05)",
          border: error ? "1px solid var(--color-danger)" : "1px solid rgba(255,255,255,0.1)",
          borderRadius: "var(--radius-control)",
          padding: "10px 14px",
          fontSize: "13px",
          color: "white",
          outline: "none",
          fontFamily: "'Segoe UI', sans-serif",
          resize: "vertical",
          ...style,
        }}
      />
      {error && <div style={{ fontSize: "11px", color: "var(--color-danger)", marginTop: "4px" }}>{error}</div>}
    </div>
  );
}
