"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";

// Dynamically import Quill only on client
const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });
import "react-quill-new/dist/quill.snow.css";
import { toast } from "react-toastify";

export default function TermsPrivacyEditor() {
  const [terms, setTerms] = useState("");
  const [privacy, setPrivacy] = useState("");
  const [termsId, setTermsId] = useState("");
  const [privacyId, setPrivacyId] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"terms" | "privacy">("terms");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [termsRes, privacyRes] = await Promise.all([
        fetch("/api/admin/content/terms"),
        fetch("/api/admin/content/privacy"),
      ]);

      const termsData = await termsRes.json();
      const privacyData = await privacyRes.json();

      setTerms(termsData?.data?.description || "");
      setPrivacy(privacyData?.data?.description || "");
      setTermsId(termsData?.data?._id || "");
      setPrivacyId(privacyData?.data?._id || "");
    } catch (error) {
      console.error("Fetch error:", error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage("");
    toast.dismiss();
    const currentData = activeTab === "terms" ? terms : privacy;
    const currentId = activeTab === "terms" ? termsId : privacyId;

    try {
      const res = await fetch(`/api/admin/content/${currentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: currentData }),
      });

      if (res.ok) {
        // setMessage(
        //   `${activeTab === "terms" ? "Terms" : "Privacy"} updated successfully!`
        // );
        toast.success(
          `${activeTab === "terms" ? "Terms" : "Privacy"} updated successfully!`
        );
      } else {
        // setMessage("Failed to update content.");
        toast.error("Failed to update content.");
      }
    } catch (error) {
      console.error("Save error:", error);
      // setMessage("Error occurred during save.");
      toast.error("Error occurred during save.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (value: string) => {
    if (activeTab === "terms") {
      setTerms(value);
    } else {
      setPrivacy(value);
    }
  };

  return (
    <>
      <div className="container mt-5">
        <h2 className="mb-4">Edit Legal Documents</h2>

        {/* Tabs */}
        <ul className="nav nav-pills mb-3">
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === "terms" ? "active" : ""}`}
              onClick={() => setActiveTab("terms")}
            >
              Terms & Conditions
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === "privacy" ? "active" : ""}`}
              onClick={() => setActiveTab("privacy")}
            >
              Privacy Policy
            </button>
          </li>
        </ul>

        {/* Single Editor */}
        <ReactQuill
          theme="snow"
          value={activeTab === "terms" ? terms : privacy}
          onChange={handleChange}
        />

        {/* Feedback */}
        {message && (
          <div
            className={`alert mt-3 ${
              message.includes("successfully")
                ? "alert-success"
                : "alert-danger"
            }`}
            role="alert"
          >
            {message}
          </div>
        )}

        {/* Save Button */}
        <button
          className="btn btn-primary mt-3"
          onClick={handleSave}
          disabled={loading}
        >
          {loading
            ? "Saving..."
            : `Save ${activeTab === "terms" ? "Terms" : "Privacy"}`}
        </button>
      </div>
    </>
  );
}
