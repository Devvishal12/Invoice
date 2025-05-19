import React, { useState, useRef, useEffect, Component, ReactNode } from "react";
import { FileText } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import ReactGA from "react-ga";
import InvoicePreview from "./components/InvoicePreview";
import Modal from "./components/Modal";
import GSAPStickers from "./components/GSAPStickers";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// Error Boundary Component
interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#fffbe9] dark:bg-gray-900">
          <h1 className="text-2xl font-bold text-red-600">Something went wrong.</h1>
          <p className="text-gray-600 dark:text-gray-300">Please refresh the page or try again later.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

// Utility for empty invoice item
const emptyItem = { description: "", quantity: 1, price: 0 };

// Calculate invoice totals
function calcTotals(
  items: { description: string; quantity: number; price: number }[],
  tax: number,
  discount: number
) {
  const subtotal = items.reduce(
    (sum, item) => sum + (Number.parseFloat(String(item.price)) || 0) * (Number.parseInt(String(item.quantity)) || 1),
    0
  );
  const taxValue = ((tax || 0) / 100) * subtotal;
  const discountValue = ((discount || 0) / 100) * subtotal;
  const total = subtotal + taxValue - discountValue;
  return { subtotal, taxValue, discountValue, total };
}

const App: React.FC = () => {
  const [items, setItems] = useState([{ ...emptyItem }]);
  const [tax, setTax] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [currency, setCurrency] = useState<"USD" | "EUR" | "INR">("USD");
  const [title, setTitle] = useState("Invoice");
  const [invoiceNumber, setInvoiceNumber] = useState("INV-001");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [modalOpen, setModalOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  interface InvoiceHistory {
    items: { description: string; quantity: number; price: number }[];
    tax: number;
    discount: number;
  }
  const [history, setHistory] = useState<InvoiceHistory[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const previewRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const shareFeedbackRef = useRef<HTMLSpanElement>(null);
  const navButtonsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const serviceCardsRef = useRef<(HTMLDivElement | null)[]>([]);
  const formInputsRef = useRef<(HTMLInputElement | HTMLSelectElement | null)[]>([]);

  const { subtotal, taxValue, discountValue, total } = calcTotals(items, tax, discount);

  // Initialize analytics
  useEffect(() => {
    ReactGA.initialize("YOUR_TRACKING_ID");
    ReactGA.pageview(window.location.pathname);
  }, []);

  // Local Storage and URL Parsing
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const data = params.get("data");
    let initialData: {
      items: { description: string; quantity: number; price: number }[];
      tax: number;
      discount: number;
      currency: "USD" | "EUR" | "INR";
      title: string;
      invoiceNumber: string;
      date: string;
    } = {
      items: [{ ...emptyItem }],
      tax: 0,
      discount: 0,
      currency: "USD",
      title: "Invoice",
      invoiceNumber: "INV-001",
      date: new Date().toISOString().split("T")[0],
    };
    if (data) {
      try {
        initialData = JSON.parse(data);
      } catch (e) {
        console.error("Invalid URL data");
      }
    } else {
      const savedDataRaw = localStorage.getItem("invoiceData");
      const savedData = savedDataRaw ? JSON.parse(savedDataRaw) : null;
      if (savedData) initialData = savedData;
    }
    setItems(initialData.items);
    setTax(initialData.tax);
    setDiscount(initialData.discount);
    setCurrency(initialData.currency);
    setTitle(initialData.title);
    setInvoiceNumber(initialData.invoiceNumber);
    setDate(initialData.date);
    saveHistory(initialData.items, initialData.tax, initialData.discount);
  }, []);

  useEffect(() => {
    localStorage.setItem("invoiceData", JSON.stringify({ items, tax, discount, currency, title, invoiceNumber, date }));
  }, [items, tax, discount, currency, title, invoiceNumber, date]);

  // Theme Handling
  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "Enter") {
        addItem();
        ReactGA.event({ category: "Invoice", action: "Add Item via Shortcut" });
      }
      if (e.ctrlKey && e.key === "p") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("export-pdf"));
        ReactGA.event({ category: "Invoice", action: "Export PDF via Shortcut" });
      }
      if (e.ctrlKey && e.key === "m") {
        setModalOpen(true);
        ReactGA.event({ category: "Invoice", action: "Open Modal via Shortcut" });
      }
      if (e.ctrlKey && e.key === "z") {
        undo();
        ReactGA.event({ category: "Invoice", action: "Undo via Shortcut" });
      }
      if (e.ctrlKey && e.key === "y") {
        redo();
        ReactGA.event({ category: "Invoice", action: "Redo via Shortcut" });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [historyIndex, history]);

  // GSAP Animations for Navbar Buttons
  useEffect(() => {
    navButtonsRef.current.forEach((button, idx) => {
      if (button) {
        gsap.fromTo(
          button,
          { opacity: 0, y: -20 },
          {
            opacity: 1,
            y: 0,
            duration: 0.5,
            ease: "power2.out",
            delay: idx * 0.1,
          }
        );
      }
    });
  }, []);

  // GSAP Animations for Form Inputs
  useEffect(() => {
    formInputsRef.current.forEach((input, idx) => {
      if (input) {
        gsap.fromTo(
          input,
          { opacity: 0, x: -20 },
          {
            opacity: 1,
            x: 0,
            duration: 0.5,
            ease: "power2.out",
            delay: idx * 0.05,
          }
        );
      }
    });
  }, []);

  // GSAP Animations for Service Cards
  useEffect(() => {
    serviceCardsRef.current.forEach((card, idx) => {
      if (card) {
        gsap.fromTo(
          card,
          { opacity: 0, scale: 0.8 },
          {
            opacity: 1,
            scale: 1,
            duration: 0.6,
            ease: "back.out(1.7)",
            delay: idx * 0.15,
            scrollTrigger: {
              trigger: card,
              start: "top 80%",
            },
          }
        );
      }
    });
  }, []);

  // History Management
  const saveHistory = (
    newItems: { description: string; quantity: number; price: number }[],
    newTax: number,
    newDiscount: number
  ) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ items: newItems, tax: newTax, discount: newDiscount });
    setHistory(newHistory.length > 50 ? newHistory.slice(-50) : newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex((prev) => prev - 1);
      const prevState = history[historyIndex - 1];
      setItems(prevState.items);
      setTax(prevState.tax);
      setDiscount(prevState.discount);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex((prev) => prev + 1);
      const nextState = history[historyIndex + 1];
      setItems(nextState.items);
      setTax(nextState.tax);
      setDiscount(nextState.discount);
    }
  };

  // Item Management with Validation
  function updateItem(
    idx: number,
    field: "description" | "quantity" | "price",
    value: string | number
  ) {
    setItems((prev) => {
      const next = prev.slice();
      if (field === "description") {
        next[idx].description = value as string;
      } else if (field === "quantity") {
        next[idx].quantity = Number(value);
      } else if (field === "price") {
        next[idx].price = Number(value);
      }
      const newErrors = { ...errors };
      if (field === "quantity" && Number(value) < 1) {
        newErrors[`quantity-${idx}`] = "Quantity must be at least 1";
      } else {
        delete newErrors[`quantity-${idx}`];
      }
      if (field === "price" && Number(value) < 0) {
        newErrors[`price-${idx}`] = "Price cannot be negative";
      } else {
        delete newErrors[`price-${idx}`];
      }
      setErrors(newErrors);
      saveHistory(next, tax, discount);
      return next;
    });
  }

  function addItem() {
    setItems((prev) => {
      const newItems = [...prev, { ...emptyItem }];
      saveHistory(newItems, tax, discount);
      ReactGA.event({ category: "Invoice", action: "Add Item" });
      setTimeout(() => {
        const newItem = itemRefs.current[newItems.length - 1];
        if (newItem) {
          gsap.fromTo(
            newItem,
            { opacity: 0, y: 20 },
            { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }
          );
          const firstInput = newItem.querySelector("input");
          if (firstInput) firstInput.focus();
        }
      }, 0);
      return newItems;
    });
  }

  function removeItem(idx: number) {
    setItems((prev) => {
      if (prev.length <= 1) return prev;
      const newItems = prev.filter((_, i) => i !== idx);
      saveHistory(newItems, tax, discount);
      const newErrors = { ...errors };
      delete newErrors[`quantity-${idx}`];
      delete newErrors[`price-${idx}`];
      setErrors(newErrors);
      ReactGA.event({ category: "Invoice", action: "Remove Item" });
      return newItems;
    });
  }

  // Shareable Link
  const generateShareLink = () => {
    const params = new URLSearchParams({
      data: JSON.stringify({ items, tax, discount, currency, title, invoiceNumber, date }),
    });
    return `${window.location.origin}?${params.toString()}`;
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(generateShareLink());
    if (shareFeedbackRef.current) {
      gsap.to(shareFeedbackRef.current, {
        opacity: 1,
        duration: 0.3,
        onComplete: () => {
          gsap.to(shareFeedbackRef.current, { opacity: 0, delay: 2 });
        },
      });
    }
    ReactGA.event({ category: "Invoice", action: "Share Link" });
  };

  // Export as PDF
  async function handleExportPDF() {
    if (!modalOpen) {
      setModalOpen(true);
      await new Promise((resolve) => setTimeout(resolve, 350));
    }
    const input = previewRef.current;
    if (!input) return;
    const canvas = await html2canvas(input, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const ratio = pageWidth / canvas.width;
    const height = canvas.height * ratio;
    pdf.addImage(imgData, "PNG", 0, 0, pageWidth, height);
    pdf.save("invoice.pdf");
    ReactGA.event({ category: "Invoice", action: "Export PDF" });
  }

  // Print Handler
  const handlePrint = () => {
    window.print();
    ReactGA.event({ category: "Invoice", action: "Print Invoice" });
  };

  useEffect(() => {
    function openExportModal() {
      setModalOpen(true);
    }
    window.addEventListener("export-pdf", openExportModal);
    return () => window.removeEventListener("export-pdf", openExportModal);
  }, []);

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col items-center py-4 sm:py-6 font-sans bg-[#fffbe9] dark:bg-gray-900 transition-colors duration-300">
        {/* Navbar */}
        <nav className="flex flex-col sm:flex-row sm:justify-between sm:items-center w-full max-w-5xl py-2 px-2 sm:px-4 rounded-2xl border border-black/30 shadow-sm bg-white dark:bg-gray-800 dark:border-gray-700 gap-2 sm:gap-0">
          <div className="flex items-center gap-2 self-center sm:self-auto">
            <div className="h-6 w-6 bg-[#ffc201] border-2 border-black rounded-md mr-2 flex items-center justify-center font-bold text-xs">
              <span>★</span>
            </div>
            <span className="font-bold tracking-wide text-md text-black dark:text-white">InvoiceApp</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 justify-center relative">
              <button
                ref={(el) => { navButtonsRef.current[0] = el; }}
                className="px-3 py-1 rounded-full font-semibold border-2 border-black shadow-[2px_2px_0_0_#000] bg-[#fffbe9] dark:bg-gray-700 dark:text-white dark:border-gray-600 hover:scale-105 transition-transform"
              >
                home
              </button>
              <button
                ref={(el) => { navButtonsRef.current[1] = el; }}
                className="px-3 py-1 rounded-full font-semibold border-2 border-black shadow-[2px_2px_0_0_#000] bg-[#fffbe9] dark:bg-gray-700 dark:text-white dark:border-gray-600 hover:scale-105 transition-transform"
                onClick={() => {
                  toggleTheme();
                  ReactGA.event({ category: "Invoice", action: "Toggle Theme" });
                }}
              >
                {theme === "light" ? "Dark Mode" : "Light Mode"}
              </button>
              <button
                ref={(el) => { navButtonsRef.current[2] = el; }}
                className="px-3 py-1 rounded-full font-semibold border-2 border-black shadow-[2px_2px_0_0_#000] bg-[#fffbe9] dark:bg-gray-700 dark:text-white dark:border-gray-600 hover:scale-105 transition-transform"
                onClick={copyShareLink}
              >
                Share Invoice
              </button>
              <span
                ref={shareFeedbackRef}
                className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-xs text-green-600 dark:text-green-400 opacity-0"
              >
                Link copied!
              </span>
            </div>
            <div className="flex gap-2 items-center ml-0 sm:ml-4 mt-2 sm:mt-0 self-center sm:self-auto">
              <button
                ref={(el) => { navButtonsRef.current[3] = el; }}
                className="flex items-center gap-1 px-4 py-2 rounded-2xl bg-[#ebedf6] border-2 border-black shadow-[2px_2px_0_0_#000] font-semibold hover:bg-[#e7e3ff] dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:hover:bg-gray-600 transition hover:scale-105 transition-transform"
                onClick={() => window.dispatchEvent(new CustomEvent("export-pdf"))}
                aria-label="Export as PDF"
              >
                <FileText className="w-4 h-4" />
                Export PDF
              </button>
              <button
                ref={(el) => { navButtonsRef.current[4] = el; }}
                className="px-5 py-2 rounded-2xl bg-white border-2 border-black shadow-[2px_2px_0_0_#000] font-bold hover:bg-[#faf4e9] dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 hover:scale-105 transition-transform"
              >
                join us.
              </button>
            </div>
          </nav>
          {/* Export Preview Modal */}
          <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
            <div className="text-center mb-4">
              <div className="font-extrabold text-lg text-[#cb60b6] dark:text-[#d78bca] mb-2">
                Invoice - Print Preview
              </div>
              <div className="flex gap-2 justify-center">
                <button
                  className="px-5 py-2 rounded-lg bg-black text-white font-bold mb-3 shadow-lg hover:scale-105 transition dark:bg-gray-900 dark:hover:bg-gray-800"
                  onClick={handleExportPDF}
                >
                  Download PDF
                </button>
                <button
                  className="px-5 py-2 rounded-lg bg-black text-white font-bold mb-3 shadow-lg hover:scale-105 transition dark:bg-gray-900 dark:hover:bg-gray-800"
                  onClick={handlePrint}
                >
                  Print Invoice
                </button>
              </div>
            </div>
            <div className="flex justify-center">
              <div ref={previewRef}>
                <InvoicePreview
                  items={items}
                  tax={tax}
                  discount={discount}
                  subtotal={subtotal}
                  taxValue={taxValue}
                  discountValue={discountValue}
                  total={total}
                  currency={currency}
                  title={title}
                  invoiceNumber={invoiceNumber}
                  date={date}
                />
              </div>
            </div>
          </Modal>
          {/* Main hero: Card with Invoice Builder + preview */}
          <section className="mt-6 sm:mt-8 w-full max-w-5xl rounded-3xl border-2 border-black/20 bg-[#eee3d2] dark:bg-gray-800 dark:border-gray-700 relative overflow-visible flex flex-col md:flex-row p-4 sm:p-6 md:p-8 gap-4 md:gap-8 shadow-[3px_3px_0_0_#cfbfa5] dark:shadow-[3px_3px_0_0_#4b5563]">
            {/* Dimensional file sticker */}
            <div className="absolute -left-3 sm:-left-7 top-2 sm:top-4 bg-[#fff] border-2 border-black px-3 sm:px-4 py-1 rounded-lg rotate-[-8deg] shadow-md text-xs font-bold text-[#cb60b6] dark:bg-gray-700 dark:text-[#d78bca] dark:border-gray-600 select-none z-10">
              dimensional '13 file
            </div>
            {/* Left: Invoice form */}
            <div className="flex flex-col justify-center gap-3 md:gap-6 w-full md:max-w-[48%] flex-1">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-black dark:text-white mb-2">
                Invoice Builder
              </h1>
              <form className="flex flex-col gap-2">
                <div className="flex flex-col gap-2">
                  <input
                    ref={el => { formInputsRef.current[0] = el; }}
                    className="border border-black/10 rounded px-2 py-1 text-sm dark:bg-gray-800 dark:text-white dark:border-gray-600 hover:scale-[1.02] transition-transform"
                    placeholder="Invoice Title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    aria-label="Invoice title"
                  />
                  <div className="flex gap-2">
                    <input
                      ref={(el) => { formInputsRef.current[1] = el; }}
                      className="border border-black/10 rounded px-2 py-1 text-sm dark:bg-gray-800 dark:text-white dark:border-gray-600 hover:scale-[1.02] transition-transform"
                      placeholder="Invoice Number"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      aria-label="Invoice number"
                    />
                    <input
                      ref={(el) => { formInputsRef.current[2] = el; }}
                      className="border border-black/10 rounded px-2 py-1 text-sm dark:bg-gray-800 dark:text-white dark:border-gray-600 hover:scale-[1.02] transition-transform"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      aria-label="Invoice date"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-3 mt-2">
                  {items.map((item, idx) => (
                    <div
                      className="flex flex-wrap gap-2 items-center bg-white/70 dark:bg-gray-700/70 border border-black/20 dark:border-gray-600 rounded-lg px-2 py-1"
                      key={idx}
                      ref={(el) => { itemRefs.current[idx] = el; }}
                    >
                      <div className="flex-1 min-w-[120px]">
                        <input
                          className={`border rounded px-2 py-1 w-full text-sm dark:bg-gray-800 dark:text-white dark:border-gray-600 hover:scale-[1.02] transition-transform border-black/10`}
                          placeholder="Description"
                          value={item.description}
                          onChange={(e) => updateItem(idx, "description", e.target.value)}
                          aria-label={`Item ${idx + 1} description`}
                        />
                      </div>
                      <div className="flex-1 min-w-[60px]">
                        <input
                          className={`border rounded px-2 py-1 w-14 sm:w-16 text-sm dark:bg-gray-800 dark:text-white dark:border-gray-600 hover:scale-[1.02] transition-transform ${
                            errors[`quantity-${idx}`] ? "border-red-500" : "border-black/10"
                          }`}
                          placeholder="Qty"
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                          aria-label={`Item ${idx + 1} quantity`}
                        />
                        {errors[`quantity-${idx}`] && (
                          <span className="text-xs text-red-500">{errors[`quantity-${idx}`]}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-[70px]">
                        <input
                          className={`border rounded px-2 py-1 w-full text-sm dark:bg-gray-800 dark:text-white dark:border-gray-600 hover:scale-[1.02] transition-transform ${
                            errors[`price-${idx}`] ? "border-red-500" : "border-black/10"
                          }`}
                          placeholder="Price"
                          type="number"
                          min={0}
                          step="0.01"
                          value={item.price}
                          onChange={(e) => updateItem(idx, "price", e.target.value)}
                          aria-label={`Item ${idx + 1} price`}
                        />
                        {errors[`price-${idx}`] && (
                          <span className="text-xs text-red-500">{errors[`price-${idx}`]}</span>
                        )}
                      </div>
                      <button
                        type="button"
                        className="text-[#ee6969] text-xs font-bold ml-2 hover:underline dark:text-[#f87171] hover:scale-105 transition-transform"
                        style={{ visibility: items.length === 1 ? "hidden" : "visible" }}
                        onClick={() => removeItem(idx)}
                        aria-label={`Remove item ${idx + 1}`}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    className="w-fit px-4 py-1 border border-black rounded-lg bg-[#ffc201] font-semibold shadow-[1px_1px_0_0_#000] hover:bg-yellow-300 dark:bg-yellow-500 dark:hover:bg-yellow-600 dark:border-gray-600 hover:scale-105 transition-transform"
                    onClick={addItem}
                    aria-label="Add new item"
                  >
                    + Add Item
                  </button>
                  <button
                    type="button"
                    className="px-4 py-1 border border-black rounded-lg bg-[#ebedf6] font-semibold dark:bg-gray-700 dark:text-white dark:border-gray-600 hover:scale-105 transition-transform"
                    onClick={undo}
                    disabled={historyIndex <= 0}
                    aria-label="Undo last action"
                  >
                    Undo
                  </button>
                  <button
                    type="button"
                    className="px-4 py-1 border border-black rounded-lg bg-[#ebedf6] font-semibold dark:bg-gray-700 dark:text-white dark:border-gray-600 hover:scale-105 transition-transform"
                    onClick={redo}
                    disabled={historyIndex >= history.length - 1}
                    aria-label="Redo last action"
                  >
                    Redo
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 mt-4 items-center">
                  <label className="text-sm font-semibold text-black dark:text-white" htmlFor="tax">
                    Tax %
                  </label>
                  <input
                    ref={el => { formInputsRef.current[3] = el; }}
                    id="tax"
                    className="border border-black/10 rounded px-2 py-1 w-14 sm:w-16 dark:bg-gray-800 dark:text-white dark:border-gray-600 hover:scale-[1.02] transition-transform"
                    type="number"
                    min={0}
                    max={100}
                    step="0.1"
                    value={tax}
                    onChange={(e) => {
                      setTax(Number(e.target.value));
                      saveHistory(items, Number(e.target.value), discount);
                    }}
                    aria-label="Tax percentage"
                  />
                  <label
                    className="text-sm font-semibold ml-2 sm:ml-4 text-black dark:text-white"
                    htmlFor="discount"
                  >
                    Discount %
                  </label>
                  <input
                    ref={(el) => { formInputsRef.current[4] = el; }}
                    id="discount"
                    className="border border-black/10 rounded px-2 py-1 w-14 sm:w-16 dark:bg-gray-800 dark:text-white dark:border-gray-600 hover:scale-[1.02] transition-transform"
                    type="number"
                    min={0}
                    max={100}
                    step="0.1"
                    value={discount}
                    onChange={(e) => {
                      setDiscount(Number(e.target.value));
                      saveHistory(items, tax, Number(e.target.value));
                    }}
                    aria-label="Discount percentage"
                  />
                  <label
                    className="text-sm font-semibold ml-2 sm:ml-4 text-black dark:text-white"
                    htmlFor="currency"
                  >
                    Currency
                  </label>
                  <select
                    ref={(el) => { formInputsRef.current[5] = el; }}
                    id="currency"
                    className="border border-black/10 rounded px-2 py-1 w-20 text-sm dark:bg-gray-800 dark:text-white dark:border-gray-600 hover:scale-[1.02] transition-transform"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as "USD" | "EUR" | "INR")}
                    aria-label="Select currency"
                  >
                    <option value="USD">$ USD</option>
                    <option value="EUR">€ EUR</option>
                    <option value="INR">₹ INR</option>
                  </select>
                </div>
              </form>
              <div className="mt-2">
                <button
                  className="px-6 py-2 rounded-xl bg-black text-white font-bold shadow-lg mt-2 dark:bg-gray-900 dark:hover:bg-gray-800 hover:scale-105 transition-transform"
                  onClick={() => setModalOpen(true)}
                  aria-label="Open export preview"
                >
                  Export Preview
                </button>
              </div>
            </div>
            {/* Right: Invoice Preview */}
            <div className="flex-1 flex items-center justify-center relative min-h-[250px] md:min-h-[320px] mt-4 md:mt-0 w-full">
              <div className="w-full sm:w-[340px] md:w-[350px] bg-white dark:bg-gray-800 border-2 border-black/10 dark:border-gray-700 rounded-2xl px-4 sm:px-7 py-4 sm:py-8 drop-shadow-md flex flex-col gap-3 invoice-preview">
                <InvoicePreview
                  items={items}
                  tax={tax}
                  discount={discount}
                  subtotal={subtotal}
                  taxValue={taxValue}
                  discountValue={discountValue}
                  total={total}
                  currency={currency}
                  title={title}
                  invoiceNumber={invoiceNumber}
                  date={date}
                />
              </div>
              <div className="absolute left-2 sm:left-3 top-2 sm:top-3 pointer-events-none select-none z-10">
                <GSAPStickers />
              </div>
            </div>
          </section>
          {/* Services Cards */}
          <section className="mt-6 sm:mt-8 w-full max-w-5xl">
            <h2 className="text-lg sm:text-xl font-bold mb-4 pl-1 text-black dark:text-white">
              services we offer
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5">
              <div
                ref={(el) => { serviceCardsRef.current[0] = el; }}
                className="rounded-2xl border-2 border-black p-6 bg-[#ffe6b9] dark:bg-[#4b3f2a] dark:border-gray-600 shadow-[2px_2px_0_0_rgba(0,0,0,0.6)] hover:scale-[1.03] transition-transform"
              >
                <span className="font-bold">📑</span>
                <div className="mt-2 font-semibold text-black dark:text-white">Customize Invoice</div>
                <div className="text-xs text-gray-600 dark:text-gray-300">Fully flexible layout and fields</div>
              </div>
              <div
                ref={(el) => { serviceCardsRef.current[1] = el; }}
                className="rounded-2xl border-2 border-black p-6 bg-[#f3fcc9] dark:bg-[#3f4b2a] dark:border-gray-600 shadow-[2px_2px_0_0_rgba(0,0,0,0.6)] hover:scale-[1.03] transition-transform"
              >
                <span className="font-bold">⚡️</span>
                <div className="mt-2 font-semibold text-black dark:text-white">Auto Calculation</div>
                <div className="text-xs text-gray-600 dark:text-gray-300">Handle tax & discounts instantly</div>
              </div>
              <div
                ref={(el) => { serviceCardsRef.current[2] = el; }}
                className="rounded-2xl border-2 border-black p-6 bg-[#dac9fc] dark:bg-[#3f2a4b] dark:border-gray-600 shadow-[2px_2px_0_0_rgba(0,0,0,0.6)] hover:scale-[1.03] transition-transform"
              >
                <span className="font-bold">🎨</span>
                <div className="mt-2 font-semibold text-black dark:text-white">Modern Preview</div>
                <div className="text-xs text-gray-600 dark:text-gray-300">Export styled like your brand</div>
              </div>
              <div
                ref={(el) => { serviceCardsRef.current[3] = el; }}
                className="rounded-2xl border-2 border-black p-6 bg-[#fff] dark:bg-gray-800 dark:border-gray-600 shadow-[2px_2px_0_0_rgba(0,0,0,0.6)] hover:scale-[1.03] transition-transform"
              >
                <span className="font-bold">🖨️</span>
                <div className="mt-2 font-semibold text-black dark:text-white">Easy Export</div>
                <div className="text-xs text-gray-600 dark:text-gray-300">
                  One click export to PDF/ New feature Print the Invoice
                </div>
              </div>
            </div>
          </section>
        </div>
      </ErrorBoundary>
    );
};

export default App;