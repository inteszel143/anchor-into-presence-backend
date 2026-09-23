"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [errors, setErrors] = useState({
    email: false,
    password: false,
    passwordLength: false,
  });

  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    toast.dismiss();

    const isEmailValid = email.trim().length > 0;
    const isPasswordValid = password.trim().length > 0;
    const isPasswordLengthValid = password.trim().length >= 8;

    if (!isEmailValid || !isPasswordValid || !isPasswordLengthValid) {
      setErrors({
        email: !isEmailValid,
        password: !isPasswordValid,
        passwordLength: isPasswordValid && !isPasswordLengthValid,
      });

      if (!isPasswordLengthValid && isPasswordValid) {
        toast.error("Password must be at least 8 characters long.");
      } else {
        toast.error("Please enter email and password.");
      }

      return;
    }

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim(),
          password: password.trim(),
        }),
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("token", data.token);
        localStorage.setItem("name", data.admin.name);
        localStorage.setItem("email", data.admin.email);
        localStorage.setItem("image", data.admin.image);

        toast.success("Login successful!");
        router.push("/admin/users");
      } else {
        const errorData = await res.json();
        toast.error(errorData?.message || "Login failed. Please try again.");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
  };

  return (
    <>
      <div className="credential_main_wrapper">
        <div className="credential_form_wrapper">
          <div className="credential_form_card">
            <h2>Admin Login</h2>

            <form onSubmit={handleLogin} noValidate>
              <div className="form_field_wrapper">
                <div className="form_field">
                  <label htmlFor="email">Email</label>
                  <div className="input_field">
                    <input
                      type="email"
                      id="email"
                      className={`form-control ${errors.email ? "is-invalid" : ""
                        }`}
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (errors.email) {
                          setErrors((prev) => ({ ...prev, email: false }));
                        }
                      }}
                    />
                  </div>
                  <p className="text-danger">{errors.email ? 'Enter valid email' : ''}</p>
                </div>

                <div className="form_field n-pass">
                  <label htmlFor="loginPassword">Password</label>
                  <div className="input_field">
                    <input
                      type={showPassword ? "text" : "password"}
                      id="loginPassword"
                      className={`form-control ${errors.password ? "is-invalid" : ""
                        }`}
                      value={password}
                      onChange={(e) => {
                        const value = e.target.value;
                        setPassword(value);

                        setErrors((prev) => ({
                          ...prev,
                          password: value.trim().length === 0,
                          passwordLength: value.trim().length > 0 && value.trim().length < 8,
                        }));
                      }}
                    />

                    <span
                      className="eye-icon"
                      onClick={() => setShowPassword((prev) => !prev)}
                      role="button"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      <i
                        className={`fa-regular ${showPassword ? "fa-eye" : "fa-eye-slash"
                          }`}
                      />
                    </span>

                  </div>
                  <p className="text-danger">
                    {errors.password && 'Enter Password'}
                    {errors.passwordLength && 'Password must be at least 8 characters'}
                  </p>

                </div>
              </div>

              <div className="form-btn-blk">
                <button
                  type="submit"
                  className="form-btn w-100 fw-medium text-white text-capitalize"
                >
                  Login
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
