"use client";

import { Eye, ListPlus, PenIcon, Trash } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";

type Category = {
  _id: string;
  name: string;
};

type ActivityItem = {
  _id: string;
  name: string;
  status: number;
  createdAt: string;
  scheduleDate: string;
  video: string;
  taggedCategoriesData: Category[];
};

/**
 * Admin Activities List Page Component
 * Allows admin to list, filter by date range, search, toggle status, and delete activities.
 */
export default function AdminActivitiesListPage() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [limit] = useState(10);

  /**
   * Fetches list of activities from the API.
   */
  const fetchActivity = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        search,
        startDate,
        endDate,
        page: String(page),
        sortBy,
        sortOrder,
        limit: String(limit),
      });

      const res = await fetch(`/api/admin/activities?${params.toString()}`);
      const data = await res.json();
      setActivities(data.data || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err) {
      console.error("Failed to fetch activities:", err);
      toast.error("Failed to load activities data.");
    }
  }, [search, startDate, endDate, page, sortBy, sortOrder, limit]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  /**
   * Toggles active/blocked status of an activity.
   */
  const toggleBlock = async (id: string, currentStatus: number) => {
    const newStatus = currentStatus === 1 ? 0 : 1;
    toast.dismiss();
    toast.clearWaitingQueue();
    try {
      const res = await fetch(`/api/admin/activities/status/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        toast.success("Activity status updated successfully");
        fetchActivity();
      } else {
        const data = await res.json();
        toast.error(data?.message || "Failed to update activity status");
      }
    } catch (err) {
      toast.error("Something went wrong while updating activity status");
      console.error(err);
    }
  };

  /**
   * Deletes an activity record.
   */
  const deleteActivity = async (id: string) => {
    toast.dismiss();
    toast.clearWaitingQueue();
    try {
      const res = await fetch(`/api/admin/activities/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Activity deleted successfully");
        fetchActivity();
      } else {
        const data = await res.json();
        toast.error(data?.message || "Failed to delete activity");
      }
    } catch (err) {
      toast.error("Something went wrong while deleting activity");
      console.error(err);
    }
  };

  return (
    <div className="container">
      <div className="row">
        <div className="col-lg-12">
          <div className="top-flex-wrapper">
            <div className="heading-blk">
              <h2>Activities</h2>
            </div>
            <div className="side-content-blk">
              <Link href="/admin/activities/create">
                <button className="primary-btn">
                  <ListPlus />
                  <span className="btntext">Add Activity</span>
                </button>
              </Link>
            </div>
          </div>
        </div>
        <div className="col-lg-12">
          <div className="common-table-wrapper pt-0">
            <div className="tab-content" id="nav-tabContent">
              <div
                className="tab-pane fade show active"
                id="nav-main-1"
                role="tabpanel"
                aria-labelledby="nav-main-1-tab"
                tabIndex={0}
              >
                <div className="common-table-filter-wrapper">
                  <div className="common-left-blk">
                    <div className="common-sort-blk">
                      <select
                        className="form-select"
                        onChange={(e) => {
                          const [field, order] = e.target.value.split("|");
                          setSortBy(field);
                          setSortOrder(order);
                          setPage(1);
                        }}
                      >
                        <option value="createdAt|desc">Newest First</option>
                        <option value="createdAt|asc">Oldest First</option>
                        <option value="name|asc">Name A-Z</option>
                        <option value="name|desc">Name Z-A</option>
                      </select>
                    </div>
                    <div className="common-search-blk">
                      <input
                        type="search"
                        className="form-control"
                        placeholder="Search by name"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                      <span className="search-icon">
                        <i className="bi bi-search" />
                      </span>
                    </div>
                  </div>
                  <div className="common-right-blk">
                    <div className="common-calander-blk">
                      <form onSubmit={(e) => e.preventDefault()}>
                        <fieldset className="custom-fieldset">
                          <legend className="custom-legend w-auto">
                            Select Date
                          </legend>
                          <div id="reportrange" className="selectdate">
                            <input
                              type="date"
                              className="form-control"
                              value={startDate}
                              onChange={(e) => setStartDate(e.target.value)}
                            />
                            <input
                              type="date"
                              className="form-control"
                              value={endDate}
                              min={startDate || undefined}
                              max={new Date().toISOString().split("T")[0]}
                              onChange={(e) => setEndDate(e.target.value)}
                            />
                          </div>
                        </fieldset>
                      </form>
                    </div>
                  </div>
                </div>
                <div className="table-blk table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Action</th>
                        <th>Sr No.</th>
                        <th>Activity Name</th>
                        <th>Video</th>
                        <th>Schedule Date</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activities.map((activity) => (
                        <tr key={activity._id}>
                          <td>
                            <span className="td-action">
                              <Link href={`/admin/activities/${activity._id}/view`}>
                                <button className="td-view-btn" title="View Activity">
                                  <Eye />
                                </button>
                              </Link>
                              <Link href={`/admin/activities/${activity._id}/edit`}>
                                <button className="td-view-btn" title="Edit Activity">
                                  <PenIcon />
                                </button>
                              </Link>
                              <button
                                className="td-delete-btn"
                                onClick={() => deleteActivity(activity._id)}
                                title="Delete Activity"
                              >
                                <Trash />
                              </button>
                              <span className="td-toggle-box">
                                <input
                                  type="checkbox"
                                  className="d-none"
                                  id={`toggle_${activity._id}`}
                                  checked={activity.status === 1}
                                  onChange={() =>
                                    toggleBlock(activity._id, activity.status)
                                  }
                                />
                                <label htmlFor={`toggle_${activity._id}`} />
                              </span>
                            </span>
                          </td>
                          <td>{activity._id.slice(-6)}</td>
                          <td>{activity.name}</td>
                          <td>{activity.video}</td>
                          <td>{activity.scheduleDate}</td>
                          <td>
                            <span
                              className={`td-status ${
                                activity.status === 0
                                  ? "st-inactive"
                                  : "st-active"
                              }`}
                            >
                              {activity.status === 0 ? "Blocked" : "Active"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="table-pagination mt-3">
                  <nav aria-label="Pagination">
                    <ul className="pagination justify-content-center gap-2 mb-0">
                      <li
                        className={`page-item ${page <= 1 ? "disabled" : ""}`}
                      >
                        <button
                          className="page-link"
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                        >
                          Previous
                        </button>
                      </li>
                      {Array.from({ length: totalPages }, (_, i) => (
                        <li
                          key={i}
                          className={`page-item ${
                            page === i + 1 ? "active" : ""
                          }`}
                        >
                          <button
                            className="page-link"
                            onClick={() => setPage(i + 1)}
                          >
                            {i + 1}
                          </button>
                        </li>
                      ))}
                      <li
                        className={`page-item ${
                          page >= totalPages ? "disabled" : ""
                        }`}
                      >
                        <button
                          className="page-link"
                          onClick={() =>
                            setPage((p) => Math.min(totalPages || 1, p + 1))
                          }
                        >
                          Next
                        </button>
                      </li>
                    </ul>
                  </nav>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
