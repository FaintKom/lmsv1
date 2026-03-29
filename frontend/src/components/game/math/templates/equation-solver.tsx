"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import type { MathTemplateProps } from "../template-registry";

interface Step {
  id: string;
  action: string;       // "subtract 5 from both sides"
  actionLabel: string;   // display label
  resultLeft: string;    // "2x"
  resultRight: string;   // "12"
}

interface EquationConfig {
  initial_left: string;   // "2x + 5"
  initial_right: string;  // "17"
  steps: Step[];
  final_answer: string;   // "x = 6"
}

const DEFAULT_CONFIG: EquationConfig = {
  initial_left: "2x + 5",
  initial_right: "17",
  steps: [
    { id: "s1", action: "subtract_5", actionLabel: "Subtract 5 from both sides", resultLeft: "2x", resultRight: "12" },
    { id: "s2", action: "divide_2", actionLabel: "Divide both sides by 2", resultLeft: "x", resultRight: "6" },
  ],
  final_answer: "x = 6",
};

export default function EquationSolver({ config, onComplete }: MathTemplateProps) {
  const cfg: EquationConfig = {
    ...DEFAULT_CONFIG,
    ...((config.equation_config || config) as Partial<EquationConfig>),
  };

  const [currentStep, setCurrentStep] = useState(0);
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [wrongChoice, setWrongChoice] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  const totalSteps = cfg.steps.length;

  // Current equation state
  const currentLeft = currentStep === 0 ? cfg.initial_left : cfg.steps[currentStep - 1].resultLeft;
  const currentRight = currentStep === 0 ? cfg.initial_right : cfg.steps[currentStep - 1].resultRight;

  // Generate choices for current step (correct + distractors)
  const getChoices = useCallback((): { label: string; id: string; correct: boolean }[] => {
    if (currentStep >= totalSteps) return [];
    const correctStep = cfg.steps[currentStep];

    // Build distractors based on step type
    const distractors = [
      "Add 1 to both sides",
      "Multiply both sides by 2",
      "Subtract from left side only",
      "Add to right side only",
      "Multiply left side by x",
      "Divide both sides by x",
    ].filter((d) => d !== correctStep.actionLabel);

    // Pick 2 random distractors
    const shuffled = distractors.sort(() => Math.random() - 0.5);
    const choices = [
      { label: correctStep.actionLabel, id: correctStep.id, correct: true },
      { label: shuffled[0], id: "d1", correct: false },
      { label: shuffled[1], id: "d2", correct: false },
    ];

    // Shuffle choices
    return choices.sort(() => Math.random() - 0.5);
  }, [currentStep, cfg.steps, totalSteps]);

  const [choices] = useState(() => getChoices());
  const [stepChoices, setStepChoices] = useState(choices);

  const handleChoice = (choiceId: string, correct: boolean) => {
    if (correct) {
      setSelectedActions([...selectedActions, cfg.steps[currentStep].actionLabel]);
      setWrongChoice(null);
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);

      if (nextStep >= totalSteps) {
        setCompleted(true);
        const score = 1 - (selectedActions.length > totalSteps ? 0.2 : 0); // Penalize wrong attempts
        onComplete(true, Math.max(0.5, score));
      } else {
        // Generate new choices for next step
        const correctStep = cfg.steps[nextStep];
        const distractors = [
          "Add 1 to both sides",
          "Multiply both sides by 2",
          "Subtract from left side only",
          "Add to right side only",
          "Square both sides",
          "Take square root of both sides",
        ].filter((d) => d !== correctStep.actionLabel);
        const shuffled = distractors.sort(() => Math.random() - 0.5);
        setStepChoices([
          { label: correctStep.actionLabel, id: correctStep.id, correct: true },
          { label: shuffled[0], id: "d1", correct: false },
          { label: shuffled[1], id: "d2", correct: false },
        ].sort(() => Math.random() - 0.5));
      }
    } else {
      setWrongChoice(choiceId);
      setTimeout(() => setWrongChoice(null), 800);
    }
  };

  return (
    <div className="flex flex-col items-center gap-5">
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Solve the equation step by step. Choose the correct operation at each step.
      </p>

      {/* Equation display */}
      <div className="w-full max-w-md space-y-3">
        {/* Initial equation */}
        <div className="rounded-xl border-2 border-indigo-200 bg-indigo-50 px-6 py-4 text-center dark:border-indigo-500/30 dark:bg-indigo-500/10">
          <span className="font-mono text-2xl font-bold text-indigo-700 dark:text-indigo-300">
            {cfg.initial_left} = {cfg.initial_right}
          </span>
        </div>

        {/* Completed steps */}
        {selectedActions.map((action, i) => (
          <div key={i} className="space-y-2">
            <div className="text-center text-xs font-medium text-emerald-600 dark:text-emerald-400">
              ↓ {action}
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-6 py-3 text-center dark:border-emerald-500/30 dark:bg-emerald-500/10">
              <span className="font-mono text-xl font-bold text-emerald-700 dark:text-emerald-300">
                {cfg.steps[i].resultLeft} = {cfg.steps[i].resultRight}
              </span>
            </div>
          </div>
        ))}

        {/* Current step — choose action */}
        {!completed && (
          <div className="space-y-2 pt-2">
            <p className="text-center text-xs font-medium text-slate-500 dark:text-slate-400">
              Step {currentStep + 1} of {totalSteps}: What should you do next?
            </p>
            <div className="flex flex-col gap-2">
              {stepChoices.map((choice) => (
                <button
                  key={choice.id}
                  onClick={() => handleChoice(choice.id, choice.correct)}
                  className={`rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all ${
                    wrongChoice === choice.id
                      ? "border-red-400 bg-red-50 text-red-700 animate-pulse dark:border-red-500 dark:bg-red-500/10 dark:text-red-300"
                      : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-indigo-500 dark:hover:bg-indigo-500/10"
                  }`}
                >
                  {choice.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Final answer */}
        {completed && (
          <div className="rounded-xl border-2 border-amber-300 bg-amber-50 px-6 py-4 text-center dark:border-amber-500/30 dark:bg-amber-500/10">
            <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-1">Answer</p>
            <span className="font-mono text-2xl font-bold text-amber-700 dark:text-amber-300">
              {cfg.final_answer}
            </span>
          </div>
        )}
      </div>

      {/* Progress */}
      <div className="flex gap-1.5">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div
            key={i}
            className={`h-2 w-8 rounded-full transition-colors ${
              i < currentStep
                ? "bg-emerald-400"
                : i === currentStep
                  ? "bg-indigo-400"
                  : "bg-slate-200 dark:bg-slate-700"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
