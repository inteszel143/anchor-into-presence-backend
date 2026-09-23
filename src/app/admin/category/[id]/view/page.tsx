"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import clsx from "clsx";
import { getImageUrl } from "@/lib/getImageUrl";

type Category = {
  _id: string;
  name: string;
};

type Activity = {
  _id: string;
  name: string;
  description: string;
  video: string;
  taggedCategories: Category[];
  createdAt: string;
  status: number;
};

export default function ActivityDetailsPage() {
  const { id } = useParams();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const res = await fetch(`/api/admin/category/${id}`);
        const data = await res.json();
        console.log(data);
        setActivity(data.category);
      } catch (err) {
        console.error("Failed to fetch activity", err);
      } finally {
        setLoading(false);
      }
    };

    fetchActivity();
  }, [id]);

  if (loading) return <div className="p-6">Loading...</div>;
  if (!activity) return <div className="p-6">Activity not found.</div>;

  return (
    <>
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <div className="bg-white rounded-2xl shadow-md p-5">
            <div className="mb-4">
              <h1 className="mb-2 fs-14"> Activity Name:</h1>
              <p className="fs-16 text-gray-900 mb-0">{activity.name}</p>
            </div>

            <div className="mb-4">
              <h2 className="fs-12 mb-2">Description:</h2>
              <p className="mb-0">{activity.description}</p>
            </div>

            {activity.video && (
              <div className="mb-4">
                <h2 className="fs-14 mb-2">Video:</h2>
                <div className="relative overflow-hidden rounded-lg border">
                  <video
                    src={getImageUrl(activity.video)}
                    controls
                    className="w-full max-h-[400px] rounded-lg"
                  />
                </div>
              </div>
            )}

            <section className="hstack flex-wrap justify-content-between mt-8 border-top pt-3">
              <div>
                <span className="font-medium fs-12">Created At:</span>{" "}
                {new Date(activity.createdAt).toLocaleString()}
              </div>
              <div>
                <span className="font-medium fs-12">Status:</span>{" "}
                <span
                  className={clsx(
                    "fs-12",
                    activity.status === 1 ? "text-success" : "text-danger"
                  )}
                >
                  {activity.status === 1 ? "Active" : "Inactive"}
                </span>
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
