"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

export default function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    toast.dismiss();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("All fields are required.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");

      return;
    }

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters.");

      return;
    }

    try {
      const token = localStorage.getItem("token"); // Or use cookies/session

      const res = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok)
        throw new Error(data.message || toast.error("Password update failed."));

      toast.success("Password updated successfully.");

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        router.push("/admin/dashboard");
      }, 2000);
    } catch (err: any) {
      toast.error(err.message || "Something went wrong.");
    }
  };

  return (
    <>
      <div className="credential_form_wrapper">
        <div className="credential_form_card">
          <h2>Change Password</h2>
          <p>Enter your current and new password</p>
          <form onSubmit={handleSubmit}>
            <div className="form_field_wrapper">
              {/* Current Password */}
              <div className="form_field">
                <label htmlFor="currentPassword">Current Password</label>
                <div className="input_field">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    className="form-control"
                    id="currentPassword"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                  <span
                    className="eye-icon"
                    onClick={() => setShowCurrentPassword((prev) => !prev)}
                    role="button"
                    aria-label={
                      showCurrentPassword ? "Hide password" : "Show password"
                    }
                  >
                    <i
                      className={`fa-regular ${showCurrentPassword ? "fa-eye" : "fa-eye-slash"
                        }`}
                    /></span>
                </div>
              </div>

              {/* New Password */}
              <div className="form_field">
                <label htmlFor="newPassword">New Password</label>
                <div className="input_field">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    className="form-control"
                    id="newPassword"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                  <span
                    className="eye-icon"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    role="button"
                    aria-label={
                      showNewPassword ? "Hide password" : "Show password"
                    }
                  >
                    <i
                      className={`fa-regular ${showNewPassword ? "fa-eye" : "fa-eye-slash"
                        }`}
                    />
                  </span>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="form_field">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <div className="input_field">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    className="form-control"
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  <span
                    className="eye-icon"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    role="button"
                    aria-label={
                      showConfirmPassword ? "Hide password" : "Show password"
                    }
                  >
                    <i
                      className={`fa-regular ${showConfirmPassword ? "fa-eye" : "fa-eye-slash"
                        }`}
                    />
                  </span>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="form-btn-blk">
              <button
                type="submit"
                className="form-btn fw-medium text-white text-capitalize"
              >
                Submit
              </button>
              <Link
                href="/admin/dashboard"
                className="form-btn bg-white-outline-btn fw-medium text-white text-capitalize"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
