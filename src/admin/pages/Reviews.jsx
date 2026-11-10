import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Check, X, Plus } from "lucide-react";
import {
  createProductReview,
  getAllProducts,
  getProductReviews,
  moderateProductReview,
} from "./Products/api.js";
import {
  EmptyState,
  LoadingState,
  ListPagination,
  PageHeading,
  StatusPill,
} from "../components/AdminPrimitives.jsx";
import AdminPortal from "../components/AdminPortal.jsx";

export default function Reviews({ onNotify }) {
  const [params] = useSearchParams();
  const productId = params.get("productId") || "";
  const [page, setPage] = useState(1);
  const [records, setRecords] = useState(20);
  const [status, setStatus] = useState("pending");
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [createOpen, setCreateOpen] = useState(false);

  const load = () => {
    setLoading(true);
    getProductReviews(page, records, status, productId)
      .then(setResponse)
      .finally(() => setLoading(false));
  };
  useEffect(load, [page, records, status, productId]);
  useEffect(() => {
    getAllProducts(1, 100).then((result) =>
      setProducts(result.data?.data || []),
    );
  }, []);

  const moderate = async (id, nextStatus) => {
    const result = await moderateProductReview(id, nextStatus);
    if (!result.success)
      return onNotify(result.message || "Could not update review.");
    load();
    onNotify(`Review ${nextStatus}.`);
  };
  const create = async (event) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const result = await createProductReview(Object.fromEntries(values));
    if (!result.success)
      return onNotify(result.message || "Could not create review.");
    setCreateOpen(false);
    load();
    onNotify("Review created and queued for approval.");
  };

  if (loading && !response)
    return <LoadingState label="Loading product reviews" />;
  const rows = response?.data?.data || [];
  return (
    <div className="admin-page-content">
      <PageHeading
        eyebrow="CUSTOMER FEEDBACK"
        title="Product reviews"
        description="Review customer ratings, approve storefront reviews, or disapprove submissions."
        action={
          <button
            className="admin-button admin-button-dark"
            onClick={() => setCreateOpen(true)}
          >
            <Plus size={15} /> New review
          </button>
        }
      />
      {createOpen && (
        <AdminPortal>
          <div
            className="admin-modal-backdrop"
            role="presentation"
            onMouseDown={(event) =>
              event.target === event.currentTarget && setCreateOpen(false)
            }
          >
            <form className="admin-modal" onSubmit={create}>
              <div className="admin-modal-header">
                <div>
                  <span className="admin-eyebrow">CUSTOMER FEEDBACK</span>
                  <h2>Add a review</h2>
                  <p>New reviews are held for approval.</p>
                </div>
                <button
                  type="button"
                  className="admin-icon-button"
                  onClick={() => setCreateOpen(false)}
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>
              <label>
                Product
                <select name="productId" required defaultValue={productId}>
                  <option value="" disabled>
                    Select a product
                  </option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="admin-form-row">
                <label>
                  Customer name
                  <input name="customerName" required />
                </label>
                <label>
                  Rating
                  <select name="rating" required defaultValue="5">
                    {[5, 4, 3, 2, 1].map((rating) => (
                      <option key={rating} value={rating}>
                        {rating} stars
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label>
                Review title
                <input name="title" />
              </label>
              <label>
                Review
                <textarea name="body" required rows="4" />
              </label>
              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="admin-button admin-button-secondary"
                  onClick={() => setCreateOpen(false)}
                >
                  Cancel
                </button>
                <button className="admin-button admin-button-dark">
                  Create review
                </button>
              </div>
            </form>
          </div>
        </AdminPortal>
      )}
      <section className="admin-panel admin-table-panel">
        <div className="admin-list-toolbar">
          <select
            className="admin-select"
            value={status}
            onChange={(event) => {
              setPage(1);
              setStatus(event.target.value);
            }}
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="disapproved">Disapproved</option>
          </select>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>PRODUCT</th>
                <th>CUSTOMER</th>
                <th>RATING</th>
                <th>REVIEW</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((review) => (
                <tr key={review.id}>
                  <td>{review.product?.name || "Product"}</td>
                  <td>{review.customerName}</td>
                  <td>
                    {"★".repeat(review.rating)} ({review.rating}/5)
                  </td>
                  <td>
                    {review.title && (
                      <strong>
                        {review.title}
                        <br />
                      </strong>
                    )}
                    {review.body}
                  </td>
                  <td>
                    <StatusPill>{review.status}</StatusPill>
                  </td>
                  <td>
                    {review.status !== "approved" && (
                      <button
                        className="admin-icon-button"
                        title="Approve review"
                        onClick={() => moderate(review.id, "approved")}
                      >
                        <Check size={15} />
                      </button>
                    )}
                    {review.status !== "disapproved" && (
                      <button
                        className="admin-icon-button"
                        title="Disapprove review"
                        onClick={() => moderate(review.id, "disapproved")}
                      >
                        <X size={15} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && (
            <EmptyState
              title="No reviews found"
              detail="New customer reviews appear here for moderation."
            />
          )}
        </div>
        <ListPagination
          meta={response?.data?.meta}
          page={page}
          records={records}
          onPageChange={setPage}
          onRecordsChange={(value) => {
            setPage(1);
            setRecords(value);
          }}
          label="reviews"
        />
      </section>
    </div>
  );
}
