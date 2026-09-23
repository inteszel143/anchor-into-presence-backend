"use client";

import { Eye } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";

type Support = {
  description: string;
  _id: string;
  title: string;
  createdAt: string;
  status: number;
  userName: string;
};

export default function AdminSupportListPage() {
  const [supports, setSupports] = useState<Support[]>([]);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [limit, setLimit] = useState(10);

  const fetchSupport = useCallback(async () => {
    const params = new URLSearchParams({
      search,
      startDate,
      endDate,
      page: String(page),
      sortBy,
      sortOrder,
      limit: String(limit),
    });

    const res = await fetch(`/api/admin/support?${params.toString()}`);
    const data = await res.json();

    if (res.ok) {
      setSupports(data.support);
      setTotalPages(data.totalPages);
    } else {
      toast.error(data?.message || "Failed to load support tickets");
    }
  }, [search, startDate, endDate, page, sortBy, sortOrder, limit]);

  useEffect(() => {
    fetchSupport();
  }, [fetchSupport]);

  const updateStatus = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/support/${id}`, {
        method: "PATCH",
      });

      if (!res.ok) {
        const error = await res.json();
        alert(error.message || "Failed to update");
        return;
      }

      // ✅ Success
      const data = await res.json();
      alert(data.message);

      // Optional: refresh the list
      window.location.reload();
      // or update state instead of reload
    } catch (err) {
      console.error("Error updating support status:", err);
    }
  };

  return (
    <div className="container">
      <div className="row">
        <div className="col-lg-12">
          <div className="top-flex-wrapper">
            <div className="heading-blk">
              <h2>Support Tickets</h2>
            </div>
          </div>
        </div>
        <div className="col-lg-12">
          <div className="common-table-wrapper pt-0">
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
                    <option value="title|asc">Title A-Z</option>
                    <option value="title|desc">Title Z-A</option>
                  </select>
                </div>
                <div className="common-search-blk">
                  <input
                    type="search"
                    className="form-control"
                    placeholder="Search by title"
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
                  <form>
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

            {/* Table */}
            <div className="table-blk table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Sr No.</th>
                    <th>Title</th>
                    <th>User</th>
                    <th>Details</th>
                    <th>Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {supports.length > 0 ? (
                    supports.map((support, index) => (
                      <tr key={support._id}>

                        <td>
                          <span className="td-action">
                            {support.status === 0 ? (
                              <button
                                className="btn btn-sm btn-outline-success py-1 px-3"
                                onClick={() => updateStatus(support._id)}
                              >
                                Resolve
                              </button>
                            ) : (
                              <button
                                className="btn btn-sm btn-outline-success py-1 px-3 active pointer-none"
                              >
                                Resolved
                              </button>
                            )}
                          </span>
                        </td>
                        <td>{(page - 1) * limit + index + 1}</td>
                        <td>{support.title}</td>
                        <td>{support.userName?? 'Unknown'}</td>
                        <td className="desc-cell position-relative">
                          <span
                            className="desc-text"
                            // data-fulltext={support.description || ""}
                          >
                            {support.description || "-"}
                          </span>
                                <span className="hover-text" data-fulltext={support.description || ""}></span>
                        </td>
                        <td>{new Date(support.createdAt).toLocaleString()}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center">
                        No support tickets found
                      </td>
                    </tr>
                   )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="table-pagination mt-3">
              <nav aria-label="Pagination">
                <ul className="pagination justify-content-center gap-2 mb-0">
                  <li className={`page-item ${page <= 1 ? "disabled" : ""}`}>
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
                      className={`page-item ${page === i + 1 ? "active" : ""}`}
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
                    className={`page-item ${page >= totalPages ? "disabled" : ""
                      }`}
                  >
                    <button
                      className="page-link"
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
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
  );
}
