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

  const [fetching, setFetching] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Fetch existing data
  useEffect(() => {
    const fetchActivity = async () => {
      setFetching(true);
      setLoadError("");
      try {
      const res = await fetch(`/api/admin/category/${id}`);
      if (!res.ok) throw new Error("Category could not load");
      const data = await res.json();
      const act = data.category;

      setName(act.name);
      setDescription(act.description);
      } catch {
        setLoadError("Couldn’t load this category. Reload the page to try again.");
      } finally { setFetching(false); }
    };

    fetchActivity();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || fetching || loadError) return;
          toast.dismiss()
      toast.clearWaitingQueue();
    toast.dismiss();
    if (!name || !description) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    try {



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
      toast.error(data.message || "Failed to update category.");
    }

    } catch {
      toast.error("Unable to save. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <p role="status">Loading category…</p>;
  if (loadError) return <p role="alert">{loadError}</p>;

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
                    {loading ? "Updating..." : "Update Category"}
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
