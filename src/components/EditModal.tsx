// components/EditModal.tsx
"use client";

import { useState } from "react";
import Popup from "reactjs-popup";
import "reactjs-popup/dist/index.css";
import type { ReactNode } from "react";
import { toast } from "react-toastify";

type EditModalProps = {
  faq: { _id: string; question: string; answer: string };
  onSave: (updated: { _id: string; question: string; answer: string }) => void;
};

export default function EditModal({ faq, onSave }: EditModalProps) {
  const [question, setQuestion] = useState(faq.question);
  const [answer, setAnswer] = useState(faq.answer);

  const [errors, setErrors] = useState({
    question: false,
    answer: false,
  });

  const handleSave = (close: () => void) => {
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

    onSave({
      _id: faq._id,
      question: question.trim(),
      answer: answer.trim(),
    });

    setErrors({ question: false, answer: false });
    close();
  };

  return (
    <Popup
      trigger={
        <button className="td-view-btn" title="Edit">
          ✏️
        </button>
      }
      modal
      nested
    >
      {((close: () => void) => (
        <div className="p-4">
          <h4 className="mb-3">Edit FAQ</h4>

          <div className="mb-3">
            <label className="form-label">Question</label>
            <input
              type="text"
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
            <button className="btn btn-secondary" onClick={close}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={() => handleSave(close)}
            >
              Save
            </button>
          </div>
        </div>
      )) as unknown as ReactNode}
    </Popup>
  );
}
