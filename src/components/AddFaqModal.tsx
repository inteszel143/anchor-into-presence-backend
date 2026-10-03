"use client";

import { useId, useState } from "react";
import Popup from "reactjs-popup";
import "reactjs-popup/dist/index.css";
import { CircleHelp, ListPlus } from "lucide-react";
import { toast } from "react-toastify";
import styles from "./FaqModal.module.css";

type Props = {
  onAdd: (faq: { question: string; answer: string }) => Promise<boolean>;
};

export default function AddFaqModal({ onAdd }: Props) {
  const fieldId = useId();
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
        contentStyle={{ width: "min(640px, calc(100vw - 32px))", padding: 0, border: "none", borderRadius: 16, boxShadow: "0 24px 80px #14243b33" }}
        overlayStyle={{ background: "rgba(20, 36, 59, 0.48)", zIndex: 1050 }}
        lockScroll
        modal
        nested
        closeOnDocumentClick={!saving}
        closeOnEscape={!saving}
      >
        {((close: () => void) => (
          <div className={styles.dialog} aria-busy={saving}>
            <div className={styles.heading}>
              <span className={styles.icon}><CircleHelp size={22} aria-hidden="true" /></span>
              <div>
                <p className={styles.eyebrow}>Help center</p>
                <h2>Add FAQ</h2>
                <p className={styles.subtitle}>Help your users find a clear, helpful answer.</p>
              </div>
            </div>
            <div className={styles.body}>

              <div className={styles.field}>
                <label className={styles.label} htmlFor={`${fieldId}-question`}>Question<span>Required</span></label>
                <input
                  type="text"
                  disabled={saving}
                  id={`${fieldId}-question`}
                  className={`${styles.input} ${errors.question ? styles.invalid : ""}`}
                  aria-required="true"
                  aria-invalid={errors.question}
                  aria-describedby={errors.question ? `${fieldId}-question-error` : undefined}
                  value={question}
                  onChange={(e) => {
                    setQuestion(e.target.value);
                    if (errors.question) {
                      setErrors((prev) => ({ ...prev, question: false }));
                    }
                  }}
                />
                {errors.question && <p id={`${fieldId}-question-error`} className={styles.error}>Please enter a question.</p>}
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor={`${fieldId}-answer`}>Answer<span>Required</span></label>
                <textarea
                  disabled={saving}
                  id={`${fieldId}-answer`}
                  className={`${styles.input} ${errors.answer ? styles.invalid : ""}`}
                  aria-required="true"
                  aria-invalid={errors.answer}
                  aria-describedby={errors.answer ? `${fieldId}-answer-error` : undefined}
                  rows={6}
                  value={answer}
                  onChange={(e) => {
                    setAnswer(e.target.value);
                    if (errors.answer) {
                      setErrors((prev) => ({ ...prev, answer: false }));
                    }
                  }}
                />
                {errors.answer && <p id={`${fieldId}-answer-error`} className={styles.error}>Please enter an answer.</p>}
              </div>

            </div>
            <div className={styles.footer}>
              <button type="button" className={styles.cancel} disabled={saving} onClick={close}>
                Cancel
              </button>
              <button
                type="button" className={styles.submit}
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
