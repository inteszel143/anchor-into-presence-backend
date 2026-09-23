"use client";

import { Eye, PenIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";

/**
 * Category data structure used in admin management tables.
 */
type Category = {
  _id: string;
  name: string;
  description: string;
  status: number;
};

/**
 * Admin Category List Page Component
 * Allows admin users to list, search, filter, and navigate to view/edit category details.
 */
export default function AdminCategoryListPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [limit] = useState(10);

  /**
   * Fetches category list from API with current pagination and sorting criteria.
   */
  const fetchCategory = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        search,
        page: String(page),
        sortBy,
        sortOrder,
        limit: String(limit),
      });

      const res = await fetch(`/api/admin/category?${params.toString()}`);
      const data = await res.json();
      setCategories(data.data || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err) {
      console.error("Failed to fetch categories:", err);
      toast.error("Failed to load category data.");
    }
  }, [search, page, sortBy, sortOrder, limit]);

  useEffect(() => {
    fetchCategory();
  }, [fetchCategory]);

  return (
    <div className="container">
      <div className="row">
        <div className="col-lg-12">
          <div className="top-flex-wrapper">
            <div className="heading-blk">
              <h2>Category List</h2>
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
                </div>
                <div className="table-blk table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Action</th>
                        <th>Sr No.</th>
                        <th>Category Name</th>
                        <th>Description</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map((category) => (
                        <tr key={category._id}>
                          <td>
                            <span className="td-action">
                              <Link
                                href={`/admin/category/${category._id}/view`}
                              >
                                <button className="td-view-btn" title="View Details">
                                  <Eye />
                                </button>
                              </Link>
                              <Link
                                href={`/admin/category/${category._id}/edit`}
                              >
                                <button className="td-view-btn" title="Edit Category">
                                  <PenIcon />
                                </button>
                              </Link>
                            </span>
                          </td>
                          <td>{category._id.slice(-6)}</td>
                          <td>{category.name}</td>
                          <td>
                            <span className="text-wrap">
                              {category.description}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`td-status ${
                                category.status === 0
                                  ? "st-inactive"
                                  : "st-active"
                              }`}
                            >
                              {category.status === 0 ? "Inactive" : "Active"}
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
                          page >= (totalPages || 1) ? "disabled" : ""
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
