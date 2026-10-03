// components/EditModal.tsx
"use client";

import { useId, useState } from "react";
import Popup from "reactjs-popup";
import "reactjs-popup/dist/index.css";
import type { ReactNode } from "react";
import { Pencil } from "lucide-react";
import { toast } from "react-toastify";
import styles from "./FaqModal.module.css";

type EditModalProps = {
  faq: { _id: string; question: string; answer: string };
  onSave: (updated: { _id: string; question: string; answer: string }) => Promise<boolean>;
};

export default function EditModal({ faq, onSave }: EditModalProps) {
  const fieldId = useId();
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
            <span className={styles.icon}><Pencil size={22} aria-hidden="true" /></span>
            <div>
              <p className={styles.eyebrow}>Help center</p>
              <h2>Edit FAQ</h2>
              <p className={styles.subtitle}>Update the question and answer for your users.</p>
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
