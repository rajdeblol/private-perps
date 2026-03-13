"use client";

import type { MpcState } from "@/types";

interface MpcStatusProps {
    state: MpcState;
}

const STAGE_ICONS: Record<string, string> = {
    encrypting: "🔐",
    submitting: "📡",
    computing: "⚡",
    decrypting: "🔓",
    complete: "✅",
    error: "❌",
};

const STAGE_PROGRESS: Record<string, number> = {
    encrypting: 25,
    submitting: 50,
    computing: 75,
    decrypting: 90,
    complete: 100,
    error: 0,
};

export function MpcStatus({ state }: MpcStatusProps) {
    if (state.stage === "idle") return null;

    const progress = STAGE_PROGRESS[state.stage] ?? 0;
    const icon = STAGE_ICONS[state.stage] ?? "⏳";

    return (
        <div
            className={`
        animate-slide-up
        bg-surface-800/60 backdrop-blur-xl border rounded-2xl p-5
        ${state.stage === "error"
                    ? "border-loss/30"
                    : state.stage === "complete"
                        ? "border-profit/30"
                        : "border-accent/20"
                }
      `}
        >
            <div className="flex items-center gap-3 mb-3">
                <span className="text-xl">{icon}</span>
                <p className="text-sm font-medium text-surface-100">{state.message}</p>
            </div>

            {/* Progress Bar */}
            {state.stage !== "error" && (
                <div className="relative h-1.5 bg-surface-700 rounded-full overflow-hidden">
                    <div
                        className={`
              absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out
              ${state.stage === "complete"
                                ? "bg-profit"
                                : "bg-gradient-to-r from-accent to-accent-hover"
                            }
              ${state.stage === "computing" ? "animate-shimmer bg-[length:200%_100%]" : ""}
            `}
                        style={{ width: `${progress}%` }}
                    />
                </div>
            )}

            {/* Stage Steps */}
            {state.stage !== "complete" && state.stage !== "error" && (
                <div className="flex justify-between mt-3">
                    {["encrypting", "submitting", "computing", "decrypting"].map(
                        (step) => {
                            const stepIndex = [
                                "encrypting",
                                "submitting",
                                "computing",
                                "decrypting",
                            ].indexOf(step);
                            const currentIndex = [
                                "encrypting",
                                "submitting",
                                "computing",
                                "decrypting",
                            ].indexOf(state.stage);
                            const isActive = step === state.stage;
                            const isDone = stepIndex < currentIndex;

                            return (
                                <div
                                    key={step}
                                    className={`
                    flex items-center gap-1 text-xs
                    ${isActive
                                            ? "text-accent font-medium"
                                            : isDone
                                                ? "text-surface-300"
                                                : "text-surface-600"
                                        }
                  `}
                                >
                                    <span
                                        className={`
                      w-1.5 h-1.5 rounded-full
                      ${isActive
                                                ? "bg-accent animate-pulse"
                                                : isDone
                                                    ? "bg-surface-400"
                                                    : "bg-surface-600"
                                            }
                    `}
                                    />
                                    {step === "encrypting"
                                        ? "Encrypt"
                                        : step === "submitting"
                                            ? "Submit"
                                            : step === "computing"
                                                ? "Compute"
                                                : "Decrypt"}
                                </div>
                            );
                        }
                    )}
                </div>
            )}
        </div>
    );
}
