// components/EditModal.tsx
"use client";

import { useState } from "react";
import Popup from "reactjs-popup";
import "reactjs-popup/dist/index.css";
import type { ReactNode } from "react";
import { Pencil } from "lucide-react";
import { toast } from "react-toastify";

type EditModalProps = {
  faq: { _id: string; question: string; answer: string };
  onSave: (updated: { _id: string; question: string; answer: string }) => Promise<boolean>;
};

export default function EditModal({ faq, onSave }: EditModalProps) {
  const [saving, setSaving] = useState(false);
  const [question, setQuestion] = useState(faq.question);
  const [answer, setAnswer] = useState(faq.answer);

  const [errors, setErrors] = useState({
    question: false,
    answer: false,
  });

  const handleSave = async (close: () => void) => {
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
      const success = await onSave({
        _id: faq._id,
        question: question.trim(),
        answer: answer.trim(),
      });

      if (!success) return;
      setErrors({ question: false, answer: false });
      close();
    } finally { setSaving(false); }
  };

  return (
    <Popup
      trigger={
        <button className="td-view-btn" title="Edit FAQ" aria-label={`Edit FAQ: ${faq.question}`}>
          <Pencil size={17} aria-hidden="true" />
        </button>
      }
      modal
      nested
      closeOnDocumentClick={!saving}
      closeOnEscape={!saving}
    >
      {((close: () => void) => (
        <div className="p-4">
          <h4 className="mb-3">Edit FAQ</h4>

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
              onClick={() => handleSave(close)}
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      )) as unknown as ReactNode}
    </Popup>
  );
}
