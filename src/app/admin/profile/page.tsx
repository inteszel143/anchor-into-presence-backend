"use client";

import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { getImageUrl } from "@/lib/getImageUrl";

export default function AdminProfilePage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);

  // Load profile on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("token");

        const res = await fetch("/api/admin/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();

        if (res.ok) {
          setName(data.name);
          setEmail(data.email);
          setImageUrl(data.image || ""); // could be empty
        } else {
          toast.error(
            data.message || "An error occurred while loading profile."
          );
        }
      } catch (err) {
        toast.error("An error occurred while loading profile.");
      }
    };

    fetchProfile();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    toast.dismiss();
    try {
      const token = localStorage.getItem("token");

      const formData = new FormData();
      formData.append("name", name);
      formData.append("email", email);
      if (imageFile) {
        formData.append("image", imageFile);
      }

      const res = await fetch("/api/admin/profile", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Profile updated successfully.");

        localStorage.setItem("name", name);
        if (data.image) {
          setImageUrl(data.image); // update preview
          localStorage.setItem("image", data.image);
        }
        window.dispatchEvent(new Event("storage"));

        setImageFile(null);
      } else {
        toast.error(data?.message || "Failed to delete user.");
      }
    } catch (err) {
      toast.error("An error occurred while updating profile.");
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImageUrl(URL.createObjectURL(file)); // preview
    }
  };

  return (
    <div className="container my-5" style={{ maxWidth: "600px" }}>
      <h2 className="mb-4">Admin Profile</h2>
      <form onSubmit={handleSubmit} encType="multipart/form-data">
        <div className="mb-3">
          <label className="form-label">Profile Image</label>
          <div className="mb-2">
            <img
              src={getImageUrl(imageUrl) || "/assets/images/default-avatar.png"}
              alt="Profile"
              style={{
                width: 100,
                height: 100,
                borderRadius: "50%",
                objectFit: "cover",
              }}
            />
          </div>
          <input
            type="file"
            className="form-control"
            accept="image/*"
            onChange={handleImageChange}
          />
        </div>

        <div className="mb-3">
          <label className="form-label">Name</label>
          <input
            type="text"
            className="form-control"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="mb-3">
          <label className="form-label">Email</label>
          <input
            type="email"
            className="form-control bg-secondary-subtle"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            readOnly
          />
        </div>

        <button type="submit" className="btn btn-primary">
          Update Profile
        </button>
      </form>
    </div>
  );
}
