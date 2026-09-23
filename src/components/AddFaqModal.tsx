"use client";

import { useState } from "react";
import Popup from "reactjs-popup";
import "reactjs-popup/dist/index.css";
import { ListPlus } from "lucide-react";
import { toast } from "react-toastify";

type Props = {
  onAdd: (faq: { question: string; answer: string }) => void;
};

export default function AddFaqModal({ onAdd }: Props) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [errors, setErrors] = useState<{ question: boolean; answer: boolean }>({
    question: false,
    answer: false,
  });

  const handleAdd = (close: () => void) => {
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

    onAdd({ question: question.trim(), answer: answer.trim() });
    setQuestion("");
    setAnswer("");
    setErrors({ question: false, answer: false });
    close();
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
      >
        {((close: () => void) => (
          <div className="p-4">
            <h4 className="mb-3">Add New FAQ</h4>

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
                onClick={() => handleAdd(close)}
              >
                Add
              </button>
            </div>
          </div>
        )) as unknown as React.ReactNode}
      </Popup>

    </>
  );
}
