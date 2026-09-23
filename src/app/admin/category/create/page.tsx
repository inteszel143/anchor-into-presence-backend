"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

export default function CreateActivityPage() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    toast.dismiss();
      toast.clearWaitingQueue();
    if (!name || !description) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/admin/category/create", {
      method: "POST",
      body: JSON.stringify({ name, description }),
      headers: { "Content-Type": "application/json" },
    });

    if (res.ok) {
      toast.success("Category created successfully");
      router.push("/admin/category"); // Redirect to list page
    } else {
      const data = await res.json();
      toast.error(
        data.message || "Something went wrong while updating category status"
      );
    }

    setLoading(false);
  };

  return (
    <>
      <div className="row justify-content-center">
        <div className="col-lg-6">
          <div className="common-content-wrapper">
            <div className="sub-heading">
              <h2>Create Category</h2>
            </div>
            <div className="row gy-4">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium">
                    Category Name
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium">
                    Description
                  </label>
                  <textarea
                    className="form-control"
                    rows={4}
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
                    {loading ? "Submitting..." : "Create Category"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
