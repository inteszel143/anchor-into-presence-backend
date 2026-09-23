"use client";

import { Trash2Icon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";

/**
 * User record shape for admin users dashboard table.
 */
type User = {
  _id: string;
  name: string;
  email: string;
  isBlocked: boolean;
  createdAt: string;
};

/**
 * Admin User Management Page Component
 * Allows admin users to list registered users, search by name/email, filter by date,
 * toggle block status, and delete user records.
 */
export default function AdminUserListPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit, setLimit] = useState(10);

  /**
   * Fetches paginated user data from API based on filter parameters.
   */
  const fetchUsers = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        search,
        startDate,
        endDate,
        page: String(page),
        limit: String(limit),
      });
      const res = await fetch(`/api/admin/users?${params.toString()}`);
      const data = await res.json();
      setUsers(data.users || []);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error("Failed to fetch users:", err);
      toast.error("Failed to load user list.");
    }
  }, [search, startDate, endDate, page, limit]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  /**
   * Toggles active/blocked status of a user.
   */
  const toggleBlock = async (id: string) => {
    try {
      toast.dismiss();
      const res = await fetch(`/api/admin/users/${id}`, { method: "PATCH" });
      if (res.ok) {
        toast.success("User status updated successfully");
        fetchUsers();
      } else {
        const data = await res.json();
        toast.error(data?.message || "Failed to update user status");
      }
    } catch (err) {
      toast.error("Something went wrong while updating user status");
      console.error(err);
    }
  };

  /**
   * Permanently deletes a user account.
   */
  const deleteUser = async (id: string) => {
    try {
      toast.dismiss();
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });

      if (res.ok) {
        toast.success("User deleted successfully");
        fetchUsers();
      } else {
        const data = await res.json();
        toast.error(data?.message || "Failed to delete user");
      }
    } catch (err) {
      toast.error("Something went wrong while deleting user");
      console.error(err);
    }
  };

  return (
    <div className="container">
      <div className="row">
        <div className="col-lg-12">
          <div className="top-flex-wrapper">
            <div className="heading-blk">
              <h2>User Management</h2>
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
                        value={limit}
                        onChange={(e) => setLimit(Number(e.target.value))}
                      >
                        <option value="10">10</option>
                        <option value="25">25</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                      </select>
                    </div>
                    <div className="common-search-blk">
                      <input
                        type="search"
                        className="form-control"
                        placeholder="Search by name/email"
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
                        <th>User ID</th>
                        <th>User Name</th>
                        <th>Email Address</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user._id}>
                          <td>
                            <span className="td-action">
                              <button
                                className="td-delete-btn"
                                onClick={() => deleteUser(user._id)}
                                title="Delete User"
                              >
                                <Trash2Icon />
                              </button>
                              <span className="td-toggle-box">
                                <input
                                  type="checkbox"
                                  className="d-none"
                                  id={`toggle_${user._id}`}
                                  checked={!user.isBlocked}
                                  onChange={() => toggleBlock(user._id)}
                                />
                                <label htmlFor={`toggle_${user._id}`} title={user.isBlocked ? "Unblock User" : "Block User"} />
                              </span>
                            </span>
                          </td>
                          <td>{user._id.slice(-6)}</td>
                          <td>{user.name}</td>
                          <td>{user.email}</td>
                          <td>
                            <span
                              className={`td-status ${
                                user.isBlocked ? "st-inactive" : "st-active"
                              }`}
                            >
                              {user.isBlocked ? "Blocked" : "Active"}
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
                      <li className={`page-item ${page <= 1 ? "disabled" : ""}`}>
                        <button className="page-link" onClick={() => setPage(page - 1)}>
                          Previous
                        </button>
                      </li>

                      {Array.from({ length: Math.min(3, totalPages) }, (_, i) => i + 1).map(
                        (num) => (
                          <li
                            key={num}
                            className={`page-item ${page === num ? "active" : ""}`}
                          >
                            <button className="page-link" onClick={() => setPage(num)}>
                              {num}
                            </button>
                          </li>
                        )
                      )}

                      {totalPages > 5 && (
                        <li className="page-item disabled">
                          <span className="page-link">...</span>
                        </li>
                      )}

                      {totalPages > 3 &&
                        [totalPages - 1, totalPages].map((num) => (
                          num > 3 && (
                            <li
                              key={num}
                              className={`page-item ${page === num ? "active" : ""}`}
                            >
                              <button className="page-link" onClick={() => setPage(num)}>
                                {num}
                              </button>
                            </li>
                          )
                        ))}

                      <li className={`page-item ${page >= totalPages ? "disabled" : ""}`}>
                        <button className="page-link" onClick={() => setPage(page + 1)}>
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
