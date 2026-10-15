import type { OfferCustomer } from "@/lib/offerCustomers";
import shared from "../users/users.module.css";

export default function OfferCustomerCell({ customer }: { customer?: OfferCustomer }) {
  return <td><span className={shared.name}>{customer?.status === "matched" ? customer.name || "Unnamed customer" : customer?.status === "conflict" ? "Multiple accounts recorded" : "No account matched"}</span>
    <span className={shared.email}>{customer?.status === "matched" ? customer.email || "No email available" : "Requires review"}</span></td>;
}
