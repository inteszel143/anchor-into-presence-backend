"use client";
import React, { useState } from "react";

export default function SupportPage() {
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setMessage("❌ Please enter a valid email address");
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/contact-support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, title, description }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Something went wrong");

      setMessage("✅ Support request sent successfully!");
      setEmail("");
      setTitle("");
      setDescription("");
    } catch (err: any) {
      setMessage(`❌ ${err.message || "Failed to send"}`);
    } finally {
      setLoading(false);
    }
  };

  const isSuccess = message.startsWith("✅");

  return (
    <main className="mx-width">
      <h1 className="top_heading">Support / Contact</h1>

      {message && (
        <div className={`message ${isSuccess ? "success" : "error"}`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="form">
        <div className="form_group">
          <label>Email</label>
          <input
            type="email"
            className="input_field"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="form_group">
          <label>Title</label>
          <input
            type="text"
            className="input_field"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div className="form_group">
          <label>Description</label>
          <textarea
            rows={6}
            className="input_field"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>

        <button type="submit" disabled={loading} className="button">
          {loading ? "Sending..." : "Send Support Request"}
        </button>
      </form>

      {/* styled-jsx must live inside the returned JSX (or use global) */}
      <style jsx>{`
        main.mx-width {
          max-width: 1500px;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 20px;
          margin: 0 auto;
          box-sizing: border-box;
          background: #fafafa;
        }

        .top_heading {
          font-size: 2rem;
          margin-bottom: 1rem;
          color: #111827;
        }

        .message {
          width: 100%;
          max-width: 600px;
          margin-bottom: 1rem;
          border-radius: 8px;
          padding: 0.75rem 1rem;
          font-size: 0.95rem;
          box-sizing: border-box;
          word-break: break-word;
        }
        .success {
          background: #ecfdf5;
          color: #065f46;
          border: 1px solid #bbf7d0;
        }
        .error {
          background: #fff1f2;
          color: #7f1d1d;
          border: 1px solid #fecaca;
        }

        form {
          width: 100%;
          max-width: 600px;
          margin: 0 auto;
        }

        .form_group {
          margin-bottom: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        label {
          font-weight: 600;
          font-size: 0.95rem;
          color: #374151;
        }

        .input_field {
          width: 100%;
          padding: 0.6rem 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 1rem;
          box-sizing: border-box;
          background: white;
          color: #111827;
        }

        textarea.input_field {
          min-height: 120px;
          resize: vertical;
        }

        .button {
          background: #4f46e5;
          color: white;
          padding: 0.6rem 1rem;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          display: inline-block;
        }
        .button:hover {
          background: #4338ca;
        }
        .button[disabled] {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* small screens adjustments */
        @media (max-width: 640px) {
          main.mx-width {
            padding: 16px;
          }
          .top_heading {
            font-size: 1.5rem;
          }
        }
      `}</style>
    </main>
  );
}
