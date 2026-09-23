"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Bell, LogOut, User, KeyRound } from "lucide-react";
import { getImageUrl } from "@/lib/getImageUrl";

const AdminHeader = () => {
  const router = useRouter();
  const [showDropdown, setShowDropdown] = useState(false);

  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const loadAdmin = () => {
    setAdminName(localStorage.getItem("name") || "Admin");
    setAdminEmail(localStorage.getItem("email") || "admin@example.com");
    setImageUrl(localStorage.getItem("image") || "");
  };

  loadAdmin();

  // 🔔 listen for profile updates
  window.addEventListener("storage", loadAdmin);

  return () => {
    window.removeEventListener("storage", loadAdmin);
  };

  }, []);

  // 🔑 Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDropdown]);

  const handleLogout = () => {
    localStorage.clear();
    router.push("/admin/login");
  };

  return (
    <>
      <header>
        <div className="container">
          <div className="row justify-content-between align-items-center">
            <div className="col-5 col-md-5" />
            <div className="col-7 col-md-7">
              <div className="header-menu">
                <ul className="header-menu-list">
                  <li className="nav-item">
                    {/* notification bell */}
                  </li>

                  <li className="nav-item">
                    <div
                      className="profile-nav-wrapper position-relative"
                      ref={dropdownRef}
                    >
                      <button
                        className="header-link-btn profile_btn"
                        onClick={() => setShowDropdown((prev) => !prev)}
                      >
                        <Image
                          src={getImageUrl(imageUrl) || "/assets/images/default-avatar.png"}
                          alt="user"
                          width={32}
                          height={32}
                          className="rounded-circle"
                          unoptimized
                        />
                      </button>

                      {showDropdown && (
                        <div className="profile-list-dropdown profile-drop">
                          <ul className="list-unstyled mb-0">
                            <li>
                              <div className="profile-list-preview">
                                <span className="profile-img">
                                  <Image
                                    src={
                                      getImageUrl(imageUrl) ||
                                      "/assets/images/default-avatar.png"
                                    }
                                    alt="Profile"
                                    width={40}
                                    height={40}
                                    className="rounded-circle"
                                    unoptimized
                                  />
                                </span>
                                <span className="profile-detail">
                                  <span className="profile-name">
                                    {adminName}
                                  </span>
                                  <span className="profile-email">
                                    {adminEmail}
                                  </span>
                                </span>
                              </div>
                            </li>

                            <li>
                              <Link
                                href="/admin/profile"
                                className="profile-links-list"
                              >
                                <span className="navicon">
                                  <User />
                                </span>
                                Profile Details
                              </Link>

                              <Link
                                href="/admin/reset-password"
                                className="profile-links-list"
                              >
                                <span className="navicon">
                                  <KeyRound />
                                </span>
                                Reset Password
                              </Link>
                            </li>

                            <li>
                              <a type="button" className="profile-links-list" onClick={handleLogout}>
                                <span className="navicon"><LogOut /></span>
                                Logout
                              </a>
                            </li>
                          </ul>
                        </div>
                      )}
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </header>
    </>
  );
};

export default AdminHeader;
