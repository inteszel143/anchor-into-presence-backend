"use client";

import { useState } from "react";
import Popup from "reactjs-popup";
import "reactjs-popup/dist/index.css";
import { ListPlus } from "lucide-react";
import { toast } from "react-toastify";

type Props = {
  onAdd: (faq: { question: string; answer: string }) => Promise<boolean>;
};

export default function AddFaqModal({ onAdd }: Props) {
  const [saving, setSaving] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [errors, setErrors] = useState<{ question: boolean; answer: boolean }>({
    question: false,
    answer: false,
  });

  const handleAdd = async (close: () => void) => {
    if (saving) return;
    const isQuestionValid = question.trim().length > 0;
    const isAnswerValid = answer.trim().length > 0;

    if (!isQuestionValid || !isAnswerValid) {
      setErrors({
        question: !isQuestionValid,
        answer: !isAnswerValid,
      });
      toast.dismiss()
      toast.clearWaitingQueue();
      toast.error("Please enter all required fields.");
      return;
    }

    setSaving(true);
    try {
      if (!await onAdd({ question: question.trim(), answer: answer.trim() })) return;
      setQuestion("");
      setAnswer("");
      setErrors({ question: false, answer: false });
      close();
    } finally { setSaving(false); }
  };

  return (
    <>
      <Popup
        trigger={
          <button className="primary-btn">
            <ListPlus />
            <span className="btntext">Add FAQ</span>
          </button>
        }
        modal
        nested
        closeOnDocumentClick={!saving}
        closeOnEscape={!saving}
      >
        {((close: () => void) => (
          <div className="p-4">
            <h4 className="mb-3">Add New FAQ</h4>

            <div className="mb-3">
              <label className="form-label">Question</label>
              <input
                type="text"
                disabled={saving}
                className={`form-control ${errors.question ? "is-invalid" : ""}`}
                value={question}
                onChange={(e) => {
                  setQuestion(e.target.value);
                  if (errors.question) {
                    setErrors((prev) => ({ ...prev, question: false }));
                  }
                }}
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Answer</label>
              <textarea
                disabled={saving}
                className={`form-control ${errors.answer ? "is-invalid" : ""}`}
                rows={3}
                value={answer}
                onChange={(e) => {
                  setAnswer(e.target.value);
                  if (errors.answer) {
                    setErrors((prev) => ({ ...prev, answer: false }));
                  }
                }}
              />
            </div>

            <div className="d-flex justify-content-end gap-2">
              <button className="btn btn-secondary" disabled={saving} onClick={close}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                disabled={saving}
                onClick={() => handleAdd(close)}
              >
                {saving ? "Saving…" : "Add FAQ"}
              </button>
            </div>
          </div>
        )) as unknown as React.ReactNode}
      </Popup>

    </>
  );
}
