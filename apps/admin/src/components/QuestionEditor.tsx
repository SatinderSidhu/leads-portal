"use client";

import { useState } from "react";

export type QuestionType = "short_text" | "long_text" | "single_choice" | "yes_no";

export interface Question {
  id: string;
  label: string;
  type: QuestionType;
  required: boolean;
  options?: string[];
  helpText?: string;
}

interface QuestionEditorProps {
  questions: Question[];
  onChange: (next: Question[]) => void;
}

const TYPE_LABELS: Record<QuestionType, string> = {
  short_text: "Short answer",
  long_text: "Long answer",
  single_choice: "Multiple choice",
  yes_no: "Yes / No",
};

function makeId() {
  // Don't depend on crypto.randomUUID — older mobile browsers in trade-show kiosks lack it
  return `q_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

export default function QuestionEditor({ questions, onChange }: QuestionEditorProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  function update(idx: number, patch: Partial<Question>) {
    const next = questions.slice();
    next[idx] = { ...next[idx], ...patch };
    onChange(next);
  }

  function addQuestion() {
    const newQ: Question = {
      id: makeId(),
      label: "",
      type: "long_text",
      required: false,
    };
    onChange([...questions, newQ]);
    setExpanded(newQ.id);
  }

  function remove(idx: number) {
    const next = questions.slice();
    next.splice(idx, 1);
    onChange(next);
  }

  function move(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= questions.length) return;
    const next = questions.slice();
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  }

  return (
    <div className="space-y-3">
      {questions.length === 0 && (
        <div className="text-center py-10 px-6 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">No questions yet.</p>
          <button
            onClick={addQuestion}
            className="px-4 py-2 bg-[#01358d] text-white rounded-lg text-sm font-medium hover:bg-[#012a70] transition"
          >
            Add first question
          </button>
        </div>
      )}

      {questions.map((q, idx) => {
        const isOpen = expanded === q.id;
        return (
          <div
            key={q.id}
            className="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800"
          >
            <div className="px-4 py-3 flex items-center gap-3">
              <span className="text-xs font-mono text-gray-400 flex-shrink-0">{idx + 1}.</span>
              <input
                type="text"
                value={q.label}
                onChange={(e) => update(idx, { label: e.target.value })}
                placeholder="Type your question…"
                className="flex-1 px-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-[#01358d] focus:border-[#01358d] text-gray-900 dark:text-white"
              />
              <span className="text-xs text-gray-400 hidden sm:inline">{TYPE_LABELS[q.type]}</span>
              {q.required && (
                <span className="text-[10px] font-bold text-red-500 px-1.5 py-0.5 bg-red-50 dark:bg-red-950/30 rounded-full">REQ</span>
              )}
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <button
                  onClick={() => move(idx, -1)}
                  disabled={idx === 0}
                  className="p-1.5 text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-default rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                  title="Move up"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" /></svg>
                </button>
                <button
                  onClick={() => move(idx, 1)}
                  disabled={idx === questions.length - 1}
                  className="p-1.5 text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-default rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                  title="Move down"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
                </button>
                <button
                  onClick={() => setExpanded(isOpen ? null : q.id)}
                  className="p-1.5 text-gray-400 hover:text-[#01358d] rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                  title={isOpen ? "Collapse" : "Edit options"}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 0 1 1.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.894.149c-.424.07-.764.383-.929.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 0 1-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.398.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 0 1-.12-1.45l.527-.737c.25-.35.272-.806.108-1.204-.165-.397-.506-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 0 1 .12-1.45l.773-.773a1.125 1.125 0 0 1 1.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894Z" /></svg>
                </button>
                <button
                  onClick={() => remove(idx)}
                  className="p-1.5 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30"
                  title="Delete"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                </button>
              </div>
            </div>

            {isOpen && (
              <div className="border-t border-gray-100 dark:border-gray-700 p-4 space-y-3 bg-gray-50/50 dark:bg-gray-900/20">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="block">
                    <span className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Question type</span>
                    <select
                      value={q.type}
                      onChange={(e) => update(idx, { type: e.target.value as QuestionType, options: e.target.value === "single_choice" ? q.options || ["", ""] : undefined })}
                      className="w-full px-3 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-[#01358d] text-gray-900 dark:text-white"
                    >
                      <option value="short_text">Short answer (one line)</option>
                      <option value="long_text">Long answer (paragraph)</option>
                      <option value="single_choice">Multiple choice</option>
                      <option value="yes_no">Yes / No</option>
                    </select>
                  </label>
                  <label className="flex items-center gap-2 mt-5 sm:mt-7">
                    <input
                      type="checkbox"
                      checked={q.required}
                      onChange={(e) => update(idx, { required: e.target.checked })}
                      className="w-4 h-4 text-[#01358d] rounded border-gray-300 focus:ring-[#01358d]"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Required</span>
                  </label>
                </div>

                <label className="block">
                  <span className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Help text (optional)</span>
                  <input
                    type="text"
                    value={q.helpText || ""}
                    onChange={(e) => update(idx, { helpText: e.target.value || undefined })}
                    placeholder="Shown under the question to clarify what you're asking"
                    className="w-full px-3 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-[#01358d] text-gray-900 dark:text-white"
                  />
                </label>

                {q.type === "single_choice" && (
                  <div>
                    <span className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Choices</span>
                    <div className="space-y-1.5">
                      {(q.options || []).map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => {
                              const opts = [...(q.options || [])];
                              opts[optIdx] = e.target.value;
                              update(idx, { options: opts });
                            }}
                            placeholder={`Option ${optIdx + 1}`}
                            className="flex-1 px-3 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-[#01358d] text-gray-900 dark:text-white"
                          />
                          <button
                            onClick={() => {
                              const opts = [...(q.options || [])];
                              opts.splice(optIdx, 1);
                              update(idx, { options: opts });
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => update(idx, { options: [...(q.options || []), ""] })}
                        className="text-xs text-[#01358d] hover:text-[#012a70] font-semibold"
                      >
                        + Add choice
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {questions.length > 0 && (
        <button
          onClick={addQuestion}
          className="w-full px-4 py-2.5 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:border-[#01358d] hover:text-[#01358d] transition"
        >
          + Add question
        </button>
      )}
    </div>
  );
}
