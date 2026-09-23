"use client";

import { ListPlus, PenIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import Link from "next/link";
import EditModal from "@/components/EditModal";
import AddFaqModal from "@/components/AddFaqModal";

type Faq = {
  _id: string;
  question: string;
  answer: string;
};
type Props = {
  faq: { _id: string; question: string; answer: string };
  onSave: (updated: { _id: string; question: string; answer: string }) => void;
};

export default function AdminUserListPage() {
  const [faqs, setFaq] = useState<Faq[]>([]);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchFaqs = useCallback(async () => {
    const params = new URLSearchParams({
      search,
      startDate,
      endDate,
      page: String(page),
    });
    const res = await fetch(`/api/admin/faqs?${params.toString()}`);
    const data = await res.json();
    setFaq(data.data || []);
    setTotalPages(data.pagination?.totalPages || 1);
  }, [search, startDate, endDate, page]);

  useEffect(() => {
    fetchFaqs();
  }, [fetchFaqs]);

  const deleteFaq = async (id: string) => {
    try {
      toast.dismiss();
      const res = await fetch(`/api/admin/faqs/${id}`, { method: "DELETE" });

      if (res.ok) {
        toast.success("FAQ deleted successfully");
        fetchFaqs(); // Refresh user list
      } else {
        const data = await res.json();
        toast.error(data?.message || "Failed to delete FAQ");
      }
    } catch (err) {
      toast.error("Something went wrong while deleting FAQ");
      console.error(err);
    }
  };

  return (
    <>
      <div className="container">
        <div className="row">
          <div className="col-lg-12">
            <div className="top-flex-wrapper">
              <div className="heading-blk">
                <h2>FAQs</h2>
              </div>
              <div className="side-content-blk">
                <AddFaqModal
                  onAdd={async (faq) => {
                    try {
                      const res = await fetch("/api/admin/faqs/create", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(faq),
                      });

                      if (res.ok) {
                        toast.success("FAQ added successfully");
                        fetchFaqs(); // reload
                      } else {
                        toast.error("Failed to add FAQ");
                      }
                    } catch (err) {
                      console.error(err);
                      toast.error("Error adding FAQ");
                    }
                  }}
                />
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
                      <div className="common-search-blk">
                        <input
                          type="search"
                          className="form-control"
                          placeholder="Search by question/answer"
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
                  <div className="table-blk table-responsive">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Action</th>
                          <th>Faq ID</th>
                          <th>Question</th>
                          <th>Answers</th>
                        </tr>
                      </thead>
                      <tbody>
                        {faqs.map((faq) => (
                          <tr key={faq._id}>
                            <td>
                              <span className="td-action">
                                <button
                                  className="td-delete-btn"
                                  onClick={() => deleteFaq(faq._id)}
                                >
                                  🗑
                                </button>

                                <EditModal
                                  faq={faq}
                                  onSave={async (updated) => {
                                    try {
                                      const res = await fetch(
                                        `/api/admin/faqs/${updated._id}`,
                                        {
                                          method: "PATCH",
                                          headers: {
                                            "Content-Type": "application/json",
                                          },
                                          body: JSON.stringify({
                                            question: updated.question,
                                            answer: updated.answer,
                                          }),
                                        }
                                      );

                                      if (res.ok) {
                                        toast.success("FAQ updated");
                                        fetchFaqs();
                                      } else {
                                        toast.error("Failed to update FAQ");
                                      }
                                    } catch (err) {
                                      console.error(err);
                                      toast.error("Error updating FAQ");
                                    }
                                  }}
                                />
                              </span>
                            </td>
                            <td>{faq._id.slice(-6)}</td>
                            <td className="desc-cell">
                              <span
                                className="desc-text"
                                // data-fulltext={faq.question || ""}
                              >
                                {faq.question || "-"}
                              </span>
                                <span className="hover-text" data-fulltext={faq.question || ""}></span>

                            </td>
                            <td className="desc-cell">
                              <span
                                className="desc-text"
                                // data-fulltext={faq.answer || ""}
                              >
                                {faq.answer || "-"}
                              </span>
                                <span className="hover-text" data-fulltext={faq.answer || ""}></span>

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
                            className={`page-item ${page === i + 1 ? "active" : ""
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
                          className={`page-item ${page >= totalPages ? "disabled" : ""
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
    </>
  );
}
