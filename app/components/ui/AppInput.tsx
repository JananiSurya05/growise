"use client";
import { InputHTMLAttributes, useId } from "react";

interface AppInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export default function AppInput({ label, error, helperText, id, style, ...rest }: AppInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const describedBy = error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined;

  return (
    <div>
      {label && (
        <label htmlFor={inputId} style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginBottom: "6px", display: "block" }}>
          {label}
        </label>
      )}
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
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
          opacity: rest.disabled ? 0.5 : 1,
          ...style,
        }}
      />
      {error && (
        <div id={`${inputId}-error`} style={{ fontSize: "11px", color: "var(--color-danger)", marginTop: "4px" }}>
          {error}
        </div>
      )}
      {!error && helperText && (
        <div id={`${inputId}-helper`} style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", marginTop: "4px" }}>
          {helperText}
        </div>
      )}
    </div>
  );
}
