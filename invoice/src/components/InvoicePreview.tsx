import React from "react";

/**
 * InvoicePreview
 * Displays invoice table and totals for given items, tax, discount, etc.
 * Used both in main card and export modal.
 */
interface InvoicePreviewProps {
  items: { description: string; quantity: number; price: number }[];
  subtotal: number;
  taxValue: number;
  discountValue: number;
  total: number;
  tax: number;
  discount: number;
  currency: "USD" | "EUR" | "INR";
  title: string;
  invoiceNumber: string;
  date: string;
}

const InvoicePreview: React.FC<InvoicePreviewProps> = ({
  items,
  subtotal,
  taxValue,
  discountValue,
  total,
  tax,
  discount,
  currency,
  title,
  invoiceNumber,
  date,
}) => {
  // Map currency codes to symbols
  const currencySymbols: { [key: string]: string } = {
    USD: "$",
    EUR: "€",
    INR: "₹",
  };

  // Get the currency symbol, default to "$" if currency is not recognized
  const currencySymbol = currencySymbols[currency] || "$";

  return (
    <div className="bg-white border-2 border-black/20 rounded-xl w-[320px] text-black px-6 py-6 drop-shadow-md flex flex-col gap-2">
      <div className="font-bold text-lg mb-2 text-[#cb60b6]">{title}</div>
      <div className="text-sm mb-2">
        <div>Invoice #: {invoiceNumber}</div>
        <div>Date: {date}</div>
      </div>
      <table className="w-full mb-2 text-sm">
        <thead>
          <tr>
            <th className="text-left">Description</th>
            <th className="w-10 text-center">Qty</th>
            <th className="w-14 text-right">Price</th>
            <th className="w-16 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx} className="odd:bg-[#f8f3e7]">
              <td>{item.description || <span className="text-gray-300">—</span>}</td>
              <td className="text-center">{item.quantity}</td>
              <td className="text-right">
                {currencySymbol}
                {(Number.parseFloat(String(item.price)) || 0).toFixed(2)}
              </td>
              <td className="text-right">
                {currencySymbol}
                {(
                  (Number.parseFloat(String(item.price)) || 0) *
                  (Number.parseInt(String(item.quantity)) || 1)
                ).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex justify-between border-t pt-1 text-sm">
        <span>Subtotal</span>
        <span>
          {currencySymbol}
          {subtotal.toFixed(2)}
        </span>
      </div>
      <div className="flex justify-between text-sm">
        <span>Tax ({tax || 0}%)</span>
        <span>
          {currencySymbol}
          {taxValue.toFixed(2)}
        </span>
      </div>
      <div className="flex justify-between text-sm">
        <span>Discount ({discount || 0}%)</span>
        <span>
          -{currencySymbol}
          {discountValue.toFixed(2)}
        </span>
      </div>
      <div className="flex justify-between text-base border-t pt-2 font-bold">
        <span>Total</span>
        <span>
          {currencySymbol}
          {total.toFixed(2)}
        </span>
      </div>
    </div>
  );
};

export default InvoicePreview;