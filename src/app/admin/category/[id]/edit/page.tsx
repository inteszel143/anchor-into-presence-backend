"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "react-toastify";

export default function EditActivityPage() {
  const { id } = useParams();
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch existing data
  useEffect(() => {
    const fetchActivity = async () => {
      const res = await fetch(`/api/admin/category/${id}`);
      const data = await res.json();
      const act = data.category;

      setName(act.name);
      setDescription(act.description);
    };

    fetchActivity();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
          toast.dismiss()
      toast.clearWaitingQueue();
    toast.dismiss();
    if (!name || !description) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setLoading(true);


    const res = await fetch(`/api/admin/category/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ name, description }),
      headers: { "Content-Type": "application/json" },
    });

    if (res.ok) {
      toast.success("Category updated successfully");
      router.push("/admin/category");
    } else {
      const data = await res.json();
      toast.error(data.message || "Failed to update activity.");
    }

    setLoading(false);
  };

  return (
    <>
      <div className="row justify-content-center">
        <div className="col-lg-6">
          <div className="common-content-wrapper">
            <div className="sub-heading">
              <h2>Edit Category</h2>
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
                  />
                </div>

                <div className="hstack justify-content-end mt-3">
                  <button
                    type="submit"
                    className="btn btn-primary px-5 py-2 rounded"
                    disabled={loading}
                  >
                    {loading ? "Updating..." : "Update Activity"}
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
