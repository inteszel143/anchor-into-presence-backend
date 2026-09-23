"use client";

import { useState } from "react";
import { toast } from "react-toastify";

export default function SendNotificationPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    toast.dismiss();
    if (!title || !description) {
      toast.error("Please fill in both title and description.");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/admin/notification/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title, description }),
    });

    const data = await res.json();
    if (res.ok) {
      toast.success(data.message);
      setTitle("");
      setDescription("");
    } else {
      toast.error(data.message || "Failed to send notification");
    }

    setLoading(false);
  };

  return (
    <>
      <div className="row justify-content-center">
        <div className="col-lg-6">
          <div className="common-content-wrapper">
            <div className="sub-heading">
              <h2>Send Notification</h2>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="mb-3">
                <label className="block text-sm font-medium">
                  Notification Title
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Enter title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="block text-sm font-medium">Description</label>
                <textarea
                  rows={4}
                  className="form-control"
                  placeholder="Enter description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                ></textarea>
              </div>

              <div className="hstack justify-content-end mt-3">
                <button
                  type="submit"
                  className="btn btn-primary px-5 py-2 rounded"
                  disabled={loading}
                >
                  {loading ? "Sending..." : "Send Notification"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
