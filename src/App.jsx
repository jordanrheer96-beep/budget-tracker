import { useState, useEffect, useRef } from "react";

const STORAGE_KEY = "ca-budget-core-v1";

const DEFAULT_ACCOUNTS = [
  { id: "acc-default", name: "Main Chequing", institution: "TD Canada Trust", type: "chequing" },
];

const DEFAULT_CATEGORIES = [
  { id: "mortgage", name: "Mortgage", type: "spend", budget: 0, color: "#4A90D9" },
  { id: "condofees", name: "Condo Fees", type: "spend", budget: 0, color: "#6FA8DC" },
  { id: "insurance", name: "Insurance", type: "spend", budget: 0, color: "#8E7CC3" },
  { id: "phoneinternet", name: "Phone & Internet", type: "spend", budget: 0, color: "#76A5AF" },
  { id: "groceries", name: "Groceries", type: "spend", budget: 0, color: "#5BA85A" },
  { id: "transport", name: "Transport", type: "spend", budget: 0, color: "#E8A838" },
  { id: "utilities", name: "Utilities", type: "spend", budget: 0, color: "#9B6BB5" },
  { id: "subscriptions", name: "Subscriptions", type: "spend", budget: 0, color: "#E05C5C" },
  { id: "personal", name: "Personal / Misc", type: "spend", budget: 0, color: "#3AAEA4" },
  { id: "emergency", name: "Emergency Fund", type: "save", budget: 0, color: "#2E7D9A" },
  { id: "cc", name: "Credit Card", type: "debt", budget: 0, color: "#C0392B", balance: 0, rate: 19.99, priority: 2 },
  { id: "loan", name: "Loan / LOC", type: "debt", budget: 0, color: "#922B21", balance: 0, rate: 8, priority: 3 },
];

function formatMoney(amount) {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(amount || 0);
}

function percentOf(value, max) {
  if (!max || max <= 0) return 0;
  return Math.min(100, Math.round((value / max) * 100));
}

function monthlyAmount(amount, frequency) {
  const periodsPerYear = frequency === "biweekly" ? 26 : frequency === "weekly" ? 52 : frequency === "semimonthly" ? 24 : 12;
  return (amount * periodsPerYear) / 12;
}

function yearlyAmount(amount, frequency) {
  const periodsPerYear = frequency === "biweekly" ? 26 : frequency === "weekly" ? 52 : frequency === "semimonthly" ? 24 : 12;
  return amount * periodsPerYear;
}

function todayString() {
  return new Date().toISOString().split("T")[0];
}

const colors = {
  background: "#0F1117",
  surface: "#161A26",
  border: "#252A3A",
  amber: "#F59E0B",
  blue: "#60A5FA",
  green: "#34D399",
  red: "#F87171",
  purple: "#A78BFA",
  text: "#E8EAF0",
  muted: "#6B7280",
  dim: "#374151",
};

const inputStyle = {
  width: "100%",
  background: colors.background,
  border: `1px solid ${colors.border}`,
  borderRadius: 7,
  padding: "9px 11px",
  fontSize: 14,
  color: colors.text,
  boxSizing: "border-box",
};

const cardStyle = {
  background: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: 10,
  padding: "14px 16px",
};

function buttonStyle(textColor, backgroundColor, borderColor) {
  return {
    background: backgroundColor || "#1E3A5F",
    color: textColor || colors.blue,
    border: `1px solid ${borderColor || "#2D5A8E"}`,
    borderRadius: 8,
    padding: "9px 15px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  };
}

function ProgressBar({ value, max, color }) {
  const percent = percentOf(value, max);
  return (
    <div style={{ height: 6, background: colors.border, borderRadius: 3, marginTop: 5 }}>
      <div style={{ height: "100%", width: `${percent}%`, background: percent > 90 ? "#EF4444" : color, borderRadius: 3 }} />
    </div>
  );
}

function FieldLabel({ children }) {
  return <div style={{ fontSize: 11, color: colors.muted, marginBottom: 4, marginTop: 12 }}>{children}</div>;
}

function SectionHeading({ children }) {
  return (
    <div style={{ fontSize: 10, color: colors.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10, paddingBottom: 7, borderBottom: `1px solid ${colors.border}` }}>
      {children}
    </div>
  );
}

export default function BudgetTracker() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [income, setIncome] = useState({ netPay: 0, frequency: "biweekly", nextPayDate: "" });
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [accounts, setAccounts] = useState(DEFAULT_ACCOUNTS);
  const [transactions, setTransactions] = useState([]);
  const [modal, setModal] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const fileInputRef = useRef();

  const [incomeForm, setIncomeForm] = useState({ netPay: "", frequency: "biweekly", nextPayDate: "" });
  const [transactionForm, setTransactionForm] = useState({ date: todayString(), description: "", amount: "", categoryId: "", accountId: "" });
  const [accountForm, setAccountForm] = useState({ name: "", institution: "", type: "chequing" });
  const [categoryForm, setCategoryForm] = useState({ name: "", type: "spend", budget: "", color: "#4A90D9", balance: "", rate: "" });
  const [csvRows, setCsvRows] = useState([]);
  const [csvError, setCsvError] = useState("");
  const [aiInsights, setAiInsights] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    loadFromStorage();
  }, []);

  async function loadFromStorage() {
    try {
      const result = await window.storage.get(STORAGE_KEY);
      if (result && result.value) {
        const data = JSON.parse(result.value);
        if (data.income) setIncome(data.income);
        if (data.categories) setCategories(data.categories);
        if (data.transactions) setTransactions(data.transactions);
        if (data.accounts) setAccounts(data.accounts);
      }
    } catch (err) {
      console.error("Failed to load saved data", err);
    }
    setIsReady(true);
  }

  async function saveToStorage(nextState) {
    try {
      const payload = JSON.stringify({
        income: nextState.income !== undefined ? nextState.income : income,
        categories: nextState.categories !== undefined ? nextState.categories : categories,
        transactions: nextState.transactions !== undefined ? nextState.transactions : transactions,
        accounts: nextState.accounts !== undefined ? nextState.accounts : accounts,
      });
      await window.storage.set(STORAGE_KEY, payload);
    } catch (err) {
      console.error("Failed to save data", err);
    }
  }

  function showToast(message) {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  }

  const monthlyNet = monthlyAmount(income.netPay || 0, income.frequency);

  const now = new Date();
  const thisMonthTransactions = transactions.filter((t) => {
    const d = new Date(t.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const spentByCategory = {};
  thisMonthTransactions.forEach((t) => {
    spentByCategory[t.categoryId] = (spentByCategory[t.categoryId] || 0) + t.amount;
  });

  const spendingCategories = categories.filter((c) => c.type === "spend");
  const savingsCategories = categories.filter((c) => c.type === "save");
  const debtCategories = categories.filter((c) => c.type === "debt").sort((a, b) => (a.priority || 9) - (b.priority || 9));

  const totalSpent = spendingCategories.reduce((sum, c) => sum + (spentByCategory[c.id] || 0), 0);
  const totalBudgeted = categories.reduce((sum, c) => sum + (c.budget || 0), 0);
  const unallocated = monthlyNet - totalBudgeted;

  function handleSaveIncome() {
    const nextIncome = {
      netPay: parseFloat(incomeForm.netPay) || 0,
      frequency: incomeForm.frequency,
      nextPayDate: incomeForm.nextPayDate,
    };
    setIncome(nextIncome);
    saveToStorage({ income: nextIncome });
    setModal(null);
    showToast("Income saved");
  }

  function handleAddTransaction() {
    if (!transactionForm.description || !transactionForm.amount || !transactionForm.categoryId) return;
    const category = categories.find((c) => c.id === transactionForm.categoryId);
    const transactionType = category && category.type === "save" ? "save" : category && category.type === "debt" ? "debtpay" : "expense";
    const newTransaction = {
      ...transactionForm,
      id: Date.now().toString(),
      amount: parseFloat(transactionForm.amount),
      type: transactionType,
    };

    let nextCategories = categories;
    if (transactionType === "debtpay") {
      nextCategories = categories.map((c) =>
        c.id === transactionForm.categoryId ? { ...c, balance: Math.max(0, (c.balance || 0) - newTransaction.amount) } : c
      );
      setCategories(nextCategories);
    }

    const nextTransactions = [newTransaction, ...transactions];
    setTransactions(nextTransactions);
    saveToStorage({ categories: nextCategories, transactions: nextTransactions });
    setTransactionForm({ date: todayString(), description: "", amount: "", categoryId: "", accountId: transactionForm.accountId });
    setModal(null);
    showToast("Transaction added");
  }

  function handleDeleteTransaction(id) {
    const nextTransactions = transactions.filter((t) => t.id !== id);
    setTransactions(nextTransactions);
    saveToStorage({ transactions: nextTransactions });
  }

  function handleUpdateCategoryField(categoryId, field, value) {
    const nextCategories = categories.map((c) => (c.id === categoryId ? { ...c, [field]: parseFloat(value) || 0 } : c));
    setCategories(nextCategories);
    saveToStorage({ categories: nextCategories });
  }

  function handleAddCategory() {
    if (!categoryForm.name) return;
    const newCategory = {
      id: Date.now().toString(),
      name: categoryForm.name,
      type: categoryForm.type,
      budget: parseFloat(categoryForm.budget) || 0,
      color: categoryForm.color,
      ...(categoryForm.type === "debt"
        ? { balance: parseFloat(categoryForm.balance) || 0, rate: parseFloat(categoryForm.rate) || 0, priority: 5 }
        : {}),
    };
    const nextCategories = [...categories, newCategory];
    setCategories(nextCategories);
    saveToStorage({ categories: nextCategories });
    setCategoryForm({ name: "", type: "spend", budget: "", color: "#4A90D9", balance: "", rate: "" });
    setModal(null);
    showToast("Category added");
  }

  function handleAddAccount() {
    if (!accountForm.name) return;
    const newAccount = {
      id: Date.now().toString(),
      name: accountForm.name,
      institution: accountForm.institution || "Other",
      type: accountForm.type,
    };
    const nextAccounts = [...accounts, newAccount];
    setAccounts(nextAccounts);
    saveToStorage({ accounts: nextAccounts });
    setAccountForm({ name: "", institution: "", type: "chequing" });
    setModal(null);
    showToast("Account added");
  }

  function handleDeleteAccount(id) {
    const nextAccounts = accounts.filter((a) => a.id !== id);
    setAccounts(nextAccounts);
    saveToStorage({ accounts: nextAccounts });
    showToast("Account removed");
  }

  function handleCsvFileSelected(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (loadEvent) => parseCsvText(loadEvent.target.result);
    reader.readAsText(file);
    event.target.value = "";
  }

  function parseCsvText(text) {
    setCsvError("");
    setCsvRows([]);
    const lines = text.trim().split("\n").filter(Boolean);
    if (lines.length < 2) {
      setCsvError("File appears empty.");
      return;
    }
    const headerCells = lines[0].toLowerCase().split(",").map((h) => h.replace(/"/g, "").trim());
    const dateIndex = headerCells.findIndex((cell) => cell.includes("date"));
    const descriptionIndex = headerCells.findIndex((cell) =>
      ["desc", "narr", "memo", "detail", "transaction", "name"].some((keyword) => cell.includes(keyword))
    );
    const amountIndex = headerCells.findIndex((cell) =>
      ["amount", "debit", "credit", "cad"].some((keyword) => cell.includes(keyword))
    );
    if (dateIndex < 0 || descriptionIndex < 0 || amountIndex < 0) {
      setCsvError("Couldn't detect columns. Found: " + headerCells.join(", "));
      return;
    }
    const rows = lines
      .slice(1)
      .map((line, index) => {
        const cells = line.split(",").map((cell) => cell.replace(/"/g, "").trim());
        const rawAmount = cells[amountIndex] || "0";
        const amount = Math.abs(parseFloat(rawAmount.replace(/[$,]/g, "")) || 0);
        return {
          id: "csv-" + index,
          date: cells[dateIndex] || "",
          description: cells[descriptionIndex] || "Row " + (index + 1),
          amount,
          categoryId: "",
          accountId: "",
          selected: true,
        };
      })
      .filter((row) => row.amount > 0);
    setCsvRows(rows);
  }

  function handleImportCsv() {
    const rowsToImport = csvRows.filter((row) => row.selected && row.categoryId);
    if (rowsToImport.length === 0) {
      setCsvError("Select at least one row and assign a category.");
      return;
    }
    const mappedTransactions = rowsToImport.map((row) => {
      const category = categories.find((c) => c.id === row.categoryId);
      const transactionType = category && category.type === "save" ? "save" : category && category.type === "debt" ? "debtpay" : "expense";
      const rest = { id: row.id, date: row.date, description: row.description, amount: row.amount, categoryId: row.categoryId, accountId: row.accountId };
      return { ...rest, type: transactionType };
    });
    const nextTransactions = [...mappedTransactions, ...transactions];
    setTransactions(nextTransactions);
    saveToStorage({ transactions: nextTransactions });
    setCsvRows([]);
    setModal(null);
    showToast(mappedTransactions.length + " transactions imported");
  }

  async function generateInsights() {
    setAiLoading(true);
    setAiInsights(null);

    const context = {
      monthlyNetIncome: monthlyNet.toFixed(2),
      totalDebt: debtCategories.reduce((sum, c) => sum + (c.balance || 0), 0).toFixed(2),
      budgetCategories: categories.map((c) => ({
        name: c.name,
        type: c.type,
        monthlyBudget: c.budget,
        spentThisMonth: spentByCategory[c.id] || 0,
        overBudget: c.budget > 0 && (spentByCategory[c.id] || 0) > c.budget,
        balance: c.type === "debt" ? c.balance : undefined,
        rate: c.type === "debt" ? c.rate : undefined,
      })),
      unallocatedMonthly: unallocated.toFixed(2),
      recentTransactions: transactions.slice(0, 25).map((t) => ({
        date: t.date,
        description: t.description,
        amount: t.amount,
        category: (categories.find((c) => c.id === t.categoryId) || {}).name || "Unknown",
        type: t.type,
      })),
    };

    const systemPrompt =
      "You are a sharp, empathetic Canadian personal finance advisor helping a household (shared between partners) manage their budget. Analyze their data and return ONLY valid JSON, no markdown, no backticks, no extra text, in this exact structure: " +
      '{"score": <number 1-100>, "scoreLabel": "Poor|Fair|Good|Strong", "summary": "2-sentence honest snapshot", "insights": [{"type": "warning|tip|win", "title": "short title", "detail": "specific actionable detail using their real numbers"}], "debtSteps": ["step1 with real numbers", "step2", "step3"], "monthsToDebtFree": <number or null>, "savingsTips": ["tip1 using their numbers", "tip2", "tip3"]}' +
      " Use actual CAD dollar amounts from their data. Be specific and direct. Maximum 4 insights.";

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1200,
          system: systemPrompt,
          messages: [{ role: "user", content: "My financial data: " + JSON.stringify(context) }],
        }),
      });
      const data = await response.json();
      const textBlock = (data.content || []).find((block) => block.type === "text");
      const rawText = textBlock ? textBlock.text : "";
      const cleaned = rawText.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      setAiInsights(parsed);
    } catch (err) {
      console.error("AI insights failed", err);
      setAiInsights({ error: "Couldn't generate insights right now. Make sure you've entered income and some budget data, then try again." });
    }
    setAiLoading(false);
  }

  if (!isReady) {
    return (
      <div style={{ background: colors.background, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: colors.muted, fontFamily: "system-ui" }}>
        Loading…
      </div>
    );
  }

  const tabs = [
    { id: "dashboard", label: "Dashboard" },
    { id: "budget", label: "Budget" },
    { id: "accounts", label: "Accounts" },
    { id: "transactions", label: "Transactions" },
    { id: "import", label: "Import CSV" },
    { id: "insights", label: "AI Insights" },
  ];

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", background: colors.background, minHeight: "100vh", color: colors.text }}>
      <div style={{ background: colors.surface, borderBottom: "1px solid " + colors.border, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 9, color: colors.muted, textTransform: "uppercase", letterSpacing: "0.12em" }}>Canadian Budget Tracker</div>
          <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>
            {income.netPay ? formatMoney(monthlyNet) + "/mo net" : "Set up income →"}
          </div>
        </div>
        <button
          onClick={() => {
            setIncomeForm({ netPay: income.netPay || "", frequency: income.frequency, nextPayDate: income.nextPayDate || "" });
            setModal("income");
          }}
          style={{ ...buttonStyle(), fontSize: 12, padding: "7px 12px" }}
        >
          Edit Income
        </button>
      </div>

      <div style={{ display: "flex", overflowX: "auto", background: colors.surface, borderBottom: "1px solid " + colors.border }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "11px 14px",
              fontSize: 11,
              fontWeight: activeTab === tab.id ? 700 : 400,
              cursor: "pointer",
              border: "none",
              borderBottom: activeTab === tab.id ? "2px solid " + colors.amber : "2px solid transparent",
              background: "transparent",
              color: activeTab === tab.id ? colors.amber : colors.muted,
              whiteSpace: "nowrap",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "18px 14px" }}>
        {activeTab === "dashboard" && (
          <DashboardTab
            monthlyNet={monthlyNet}
            income={income}
            totalSpent={totalSpent}
            spendingCategories={spendingCategories}
            savingsCategories={savingsCategories}
            debtCategories={debtCategories}
            spentByCategory={spentByCategory}
            unallocated={unallocated}
          />
        )}

        {activeTab === "budget" && (
          <BudgetTab
            categories={categories}
            onUpdateCategoryField={handleUpdateCategoryField}
            onOpenAddCategory={() => setModal("category")}
            totalBudgeted={totalBudgeted}
            monthlyNet={monthlyNet}
            unallocated={unallocated}
          />
        )}

        {activeTab === "accounts" && (
          <AccountsTab
            accounts={accounts}
            onOpenAdd={() => setModal("account")}
            onDelete={handleDeleteAccount}
          />
        )}

        {activeTab === "transactions" && (
          <TransactionsTab
            transactions={transactions}
            categories={categories}
            accounts={accounts}
            thisMonthCount={thisMonthTransactions.length}
            onOpenAdd={() => setModal("transaction")}
            onDelete={handleDeleteTransaction}
            now={now}
          />
        )}

        {activeTab === "import" && (
          <ImportTab
            fileInputRef={fileInputRef}
            onFileSelected={handleCsvFileSelected}
            csvError={csvError}
            csvRows={csvRows}
            setCsvRows={setCsvRows}
            categories={categories}
            onImport={handleImportCsv}
          />
        )}

        {activeTab === "insights" && (
          <InsightsTab
            aiInsights={aiInsights}
            aiLoading={aiLoading}
            onGenerate={generateInsights}
          />
        )}
      </div>

      {modal && (
        <Modal onClose={() => setModal(null)}>
          {modal === "income" && (
            <IncomeForm form={incomeForm} setForm={setIncomeForm} onCancel={() => setModal(null)} onSave={handleSaveIncome} />
          )}
          {modal === "transaction" && (
            <TransactionForm
              form={transactionForm}
              setForm={setTransactionForm}
              spendingCategories={spendingCategories}
              savingsCategories={savingsCategories}
              debtCategories={debtCategories}
              accounts={accounts}
              onCancel={() => setModal(null)}
              onSave={handleAddTransaction}
            />
          )}
          {modal === "category" && (
            <CategoryForm form={categoryForm} setForm={setCategoryForm} onCancel={() => setModal(null)} onSave={handleAddCategory} />
          )}
          {modal === "account" && (
            <AccountForm form={accountForm} setForm={setAccountForm} onCancel={() => setModal(null)} onSave={handleAddAccount} />
          )}
        </Modal>
      )}

      {toastMessage && (
        <div style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", background: "#1A4731", border: "1px solid #2D6A4F", borderRadius: 8, padding: "9px 16px", color: colors.green, fontSize: 13, zIndex: 100, whiteSpace: "nowrap" }}>
          ✓ {toastMessage}
        </div>
      )}
    </div>
  );
}

function DashboardTab(props) {
  const summaryCards = [
    { label: "Net Pay / Month", value: formatMoney(props.monthlyNet), color: colors.blue, sub: props.income.frequency || "—" },
    { label: "Spent This Month", value: formatMoney(props.totalSpent), color: colors.red, sub: "of " + formatMoney(props.spendingCategories.reduce((s, c) => s + c.budget, 0)) + " budget" },
  ];

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))", gap: 9, marginBottom: 16 }}>
        {summaryCards.map((card) => (
          <div key={card.label} style={cardStyle}>
            <div style={{ fontSize: 9, color: colors.muted, textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 5 }}>{card.label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: card.color }}>{card.value}</div>
            <div style={{ fontSize: 10, color: colors.dim, marginTop: 3 }}>{card.sub}</div>
          </div>
        ))}
      </div>

      {props.income.netPay > 0 && (
        <div style={{ background: props.unallocated >= 0 ? "#0D2818" : "#2D1111", border: "1px solid " + (props.unallocated >= 0 ? "#1A4731" : "#5C1A1A"), borderRadius: 9, padding: "10px 14px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: props.unallocated >= 0 ? colors.green : colors.red }}>
            {props.unallocated >= 0 ? "Unallocated this month" : "Over-budgeted by"}
          </span>
          <span style={{ fontWeight: 700, fontSize: 15, color: props.unallocated >= 0 ? colors.green : colors.red }}>{formatMoney(Math.abs(props.unallocated))}</span>
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <SectionHeading>Spending This Month</SectionHeading>
        {props.spendingCategories.map((category) => {
          const spent = props.spentByCategory[category.id] || 0;
          return (
            <div key={category.id} style={{ marginBottom: 11 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 3 }}>
                <span>{category.name}</span>
                <span style={{ color: percentOf(spent, category.budget) > 90 ? colors.red : colors.muted }}>
                  {formatMoney(spent)} / {formatMoney(category.budget)}
                </span>
              </div>
              <ProgressBar value={spent} max={category.budget} color={category.color} />
            </div>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <SectionHeading>Savings</SectionHeading>
          {props.savingsCategories.map((category) => (
            <div key={category.id} style={{ ...cardStyle, marginBottom: 8, padding: "11px 13px" }}>
              <div style={{ fontSize: 12, color: colors.muted, marginBottom: 3 }}>{category.name}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: colors.green }}>{formatMoney(props.spentByCategory[category.id] || 0)}</div>
              {category.currentBalance > 0 && <div style={{ fontSize: 11, color: colors.blue, marginTop: 3 }}>Balance: {formatMoney(category.currentBalance)}</div>}
            </div>
          ))}
        </div>
        <div>
          <SectionHeading>Debt</SectionHeading>
          {props.debtCategories.map((category) => (
            <div key={category.id} style={{ ...cardStyle, marginBottom: 8, padding: "11px 13px" }}>
              <div style={{ fontSize: 12, color: colors.muted, marginBottom: 3 }}>{category.name}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#FBBF24" }}>{formatMoney(category.balance || 0)}</div>
              <div style={{ fontSize: 10, color: colors.dim }}>{category.rate}% interest</div>
              {props.spentByCategory[category.id] > 0 && <div style={{ fontSize: 11, color: colors.green, marginTop: 3 }}>Paid: {formatMoney(props.spentByCategory[category.id])}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


function BudgetTab(props) {
  const typeLabels = { spend: "Spending", save: "Savings", debt: "Debt Payments" };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: colors.muted }}>Set monthly targets. Debt payments reduce balance automatically.</div>
        <button onClick={props.onOpenAddCategory} style={{ ...buttonStyle(), fontSize: 12, padding: "7px 11px" }}>+ Add</button>
      </div>

      {["spend", "save", "debt"].map((type) => (
        <div key={type} style={{ marginBottom: 22 }}>
          <SectionHeading>{typeLabels[type]}</SectionHeading>
          {props.categories
            .filter((c) => c.type === type)
            .sort((a, b) => (a.priority || 9) - (b.priority || 9))
            .map((category) => (
              <div key={category.id} style={{ display: "flex", alignItems: "center", gap: 9, ...cardStyle, marginBottom: 7, padding: "11px 13px" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: category.color, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: colors.text }}>{category.name}</div>
                  {type === "debt" && (
                    <div style={{ fontSize: 10, color: colors.muted }}>
                      {category.rate + "% · " + formatMoney(category.balance || 0) + " left"}
                    </div>
                  )}
                </div>
                {type === "debt" ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                      <span style={{ fontSize: 10, color: colors.muted }}>Balance $</span>
                      <input
                        type="number"
                        value={category.balance || ""}
                        onChange={(e) => props.onUpdateCategoryField(category.id, "balance", e.target.value)}
                        placeholder="0"
                        style={{ ...inputStyle, width: 80, padding: "5px 7px", fontSize: 12 }}
                      />
                    </div>
                    <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                      <span style={{ fontSize: 10, color: colors.muted }}>Pay $</span>
                      <input
                        type="number"
                        value={category.budget || ""}
                        onChange={(e) => props.onUpdateCategoryField(category.id, "budget", e.target.value)}
                        placeholder="0"
                        style={{ ...inputStyle, width: 80, padding: "5px 7px", fontSize: 12 }}
                      />
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ fontSize: 11, color: colors.muted }}>$</span>
                    <input
                      type="number"
                      value={category.budget || ""}
                      onChange={(e) => props.onUpdateCategoryField(category.id, "budget", e.target.value)}
                      placeholder="0"
                      style={{ ...inputStyle, width: 85, textAlign: "right" }}
                    />
                    <span style={{ fontSize: 11, color: colors.muted }}>/mo</span>
                  </div>
                )}
              </div>
            ))}
        </div>
      ))}

      <div style={{ ...cardStyle, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 13, color: colors.muted }}>Budgeted vs net income</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: props.unallocated >= 0 ? colors.green : colors.red }}>
          {formatMoney(props.totalBudgeted)} / {formatMoney(props.monthlyNet)}
        </span>
      </div>
    </div>
  );
}

const ACCOUNT_TYPE_LABELS = {
  chequing: "Chequing",
  savings: "Savings",
  credit: "Credit Card",
  other: "Other",
};

function AccountsTab(props) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: colors.muted }}>Add the bank and credit accounts you want to log transactions against.</div>
        <button onClick={props.onOpenAdd} style={{ ...buttonStyle(), fontSize: 12, padding: "7px 11px" }}>+ Add</button>
      </div>

      {props.accounts.length === 0 && (
        <div style={{ ...cardStyle, textAlign: "center", padding: "40px", color: colors.muted }}>
          No accounts yet. Add your first bank or credit card account.
        </div>
      )}

      {props.accounts.map((account) => (
        <div key={account.id} style={{ display: "flex", alignItems: "center", gap: 9, ...cardStyle, marginBottom: 7, padding: "11px 13px" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: colors.text }}>{account.name}</div>
            <div style={{ fontSize: 10, color: colors.muted }}>{account.institution} · {ACCOUNT_TYPE_LABELS[account.type] || account.type}</div>
          </div>
          <button onClick={() => props.onDelete(account.id)} style={{ background: "none", border: "none", color: colors.muted, cursor: "pointer", fontSize: 14, padding: 3 }}>✕</button>
        </div>
      ))}
    </div>
  );
}

function TransactionsTab(props) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: colors.muted }}>{props.thisMonthCount} this month · {props.transactions.length} total</div>
        <button onClick={props.onOpenAdd} style={{ ...buttonStyle(), fontSize: 12, padding: "7px 11px" }}>+ Add</button>
      </div>

      {props.transactions.length === 0 && (
        <div style={{ ...cardStyle, textAlign: "center", padding: "40px", color: colors.muted }}>No transactions yet.</div>
      )}

      {props.transactions.map((transaction) => {
        const category = props.categories.find((c) => c.id === transaction.categoryId);
        const transactionDate = new Date(transaction.date);
        const isThisMonth = transactionDate.getMonth() === props.now.getMonth() && transactionDate.getFullYear() === props.now.getFullYear();
        return (
          <div key={transaction.id} style={{ display: "flex", alignItems: "center", gap: 9, ...cardStyle, marginBottom: 6, padding: "10px 12px", opacity: isThisMonth ? 1 : 0.55 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: category ? category.color : colors.muted, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13 }}>{transaction.description}</div>
              <div style={{ fontSize: 10, color: colors.muted, marginTop: 2 }}>{transaction.date} · {category ? category.name : "?"} · {(props.accounts.find((a) => a.id === transaction.accountId) || {}).name || "No account"}</div>
            </div>
            <div style={{ fontWeight: 600, fontSize: 13, color: transaction.type === "save" ? colors.green : transaction.type === "debtpay" ? "#FBBF24" : colors.red }}>
              {transaction.type === "save" ? "+" : "-"}{formatMoney(transaction.amount)}
            </div>
            <button onClick={() => props.onDelete(transaction.id)} style={{ background: "none", border: "none", color: colors.muted, cursor: "pointer", fontSize: 14, padding: 3 }}>✕</button>
          </div>
        );
      })}
    </div>
  );
}

function ImportTab(props) {
  const bankInstructions = [
    ["TD Canada Trust", "EasyWeb → Accounts → Download → CSV"],
    ["CIBC", "Online Banking → Accounts → Download Transactions → CSV"],
    ["Simplii Financial", "Online Banking → Account History → Export → CSV"],
    ["Wealthsimple", "App → Activity → Export (top right) → CSV"],
  ];

  return (
    <div>
      <div style={{ ...cardStyle, marginBottom: 12 }}>
        <SectionHeading>How to export CSV from your banks</SectionHeading>
        {bankInstructions.map((pair) => (
          <div key={pair[0]} style={{ display: "flex", gap: 9, marginBottom: 6, fontSize: 12 }}>
            <span style={{ color: colors.blue, width: 148, flexShrink: 0 }}>{pair[0]}</span>
            <span style={{ color: colors.muted }}>{pair[1]}</span>
          </div>
        ))}
      </div>

      <input type="file" ref={props.fileInputRef} accept=".csv" onChange={props.onFileSelected} style={{ display: "none" }} />
      <button
        onClick={() => props.fileInputRef.current.click()}
        style={{ width: "100%", background: "#1A2035", border: "2px dashed " + colors.border, borderRadius: 10, padding: "24px", fontSize: 14, color: colors.blue, cursor: "pointer", marginBottom: 12 }}
      >
        Upload CSV file
      </button>

      {props.csvError && (
        <div style={{ background: "#2D1111", border: "1px solid #5C1A1A", borderRadius: 8, padding: "10px 13px", color: colors.red, fontSize: 12, marginBottom: 12 }}>
          {props.csvError}
        </div>
      )}

      {props.csvRows.length > 0 && (
        <div>
          <div style={{ fontSize: 12, color: colors.muted, marginBottom: 9 }}>{props.csvRows.length} rows found — assign categories then import.</div>
          <div style={{ maxHeight: 340, overflowY: "auto" }}>
            {props.csvRows.map((row, index) => (
              <div key={row.id} style={{ display: "flex", alignItems: "center", gap: 7, ...cardStyle, marginBottom: 5, padding: "9px 11px", opacity: row.selected ? 1 : 0.4 }}>
                <input
                  type="checkbox"
                  checked={row.selected}
                  onChange={() => props.setCsvRows((prev) => prev.map((r, i) => (i === index ? { ...r, selected: !r.selected } : r)))}
                />
                <div style={{ flex: 1, fontSize: 12 }}>
                  <div style={{ color: colors.text }}>{row.description}</div>
                  <div style={{ color: colors.muted }}>{row.date}</div>
                </div>
                <div style={{ color: colors.red, fontWeight: 600, fontSize: 12, width: 68, textAlign: "right" }}>{formatMoney(row.amount)}</div>
                <select
                  value={row.categoryId}
                  onChange={(e) => props.setCsvRows((prev) => prev.map((r, i) => (i === index ? { ...r, categoryId: e.target.value } : r)))}
                  style={{ ...inputStyle, width: 128, padding: "4px 7px", fontSize: 12 }}
                >
                  <option value="">Category…</option>
                  {props.categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <button onClick={props.onImport} style={{ ...buttonStyle(), marginTop: 10, width: "100%" }}>
            Import {props.csvRows.filter((r) => r.selected && r.categoryId).length} Transactions
          </button>
        </div>
      )}
    </div>
  );
}

function InsightsTab(props) {
  const ai = props.aiInsights;

  return (
    <div>
      <button
        onClick={props.onGenerate}
        disabled={props.aiLoading}
        style={{ ...buttonStyle(), width: "100%", padding: "13px", fontSize: 14, marginBottom: 6, opacity: props.aiLoading ? 0.6 : 1 }}
      >
        {props.aiLoading ? "Analyzing your finances…" : "Generate AI Insights"}
      </button>
      <div style={{ fontSize: 11, color: colors.muted, textAlign: "center", marginBottom: 18 }}>
        Analyzes your income, spending, savings, and debt
      </div>

      {ai && ai.error && (
        <div style={{ background: "#2D1111", border: "1px solid #5C1A1A", borderRadius: 10, padding: 16, color: colors.red }}>{ai.error}</div>
      )}

      {ai && !ai.error && (
        <div>
          <div style={{ ...cardStyle, marginBottom: 12, display: "flex", alignItems: "center", gap: 14, background: "#0D1829" }}>
            <div
              style={{
                width: 58,
                height: 58,
                borderRadius: "50%",
                border: "3px solid " + (ai.score >= 70 ? colors.green : ai.score >= 50 ? "#FBBF24" : colors.red),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                flexShrink: 0,
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1 }}>{ai.score}</div>
              <div style={{ fontSize: 8, color: colors.muted }}>/100</div>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: ai.score >= 70 ? colors.green : ai.score >= 50 ? "#FBBF24" : colors.red, marginBottom: 4 }}>
                {ai.scoreLabel} Financial Health
              </div>
              <div style={{ fontSize: 12, color: colors.muted, lineHeight: 1.5 }}>{ai.summary}</div>
            </div>
          </div>

          {ai.insights && ai.insights.length > 0 && (
            <div>
              <SectionHeading>Insights</SectionHeading>
              {ai.insights.map((insight, index) => (
                <div
                  key={index}
                  style={{
                    ...cardStyle,
                    marginBottom: 9,
                    borderLeft: "3px solid " + (insight.type === "warning" ? colors.red : insight.type === "win" ? colors.green : colors.blue),
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: insight.type === "warning" ? colors.red : insight.type === "win" ? colors.green : colors.blue,
                      marginBottom: 4,
                    }}
                  >
                    {insight.title}
                  </div>
                  <div style={{ fontSize: 12, color: colors.muted, lineHeight: 1.55 }}>{insight.detail}</div>
                </div>
              ))}
            </div>
          )}

          {ai.debtSteps && ai.debtSteps.length > 0 && (
            <div>
              <SectionHeading>Debt Payoff Plan</SectionHeading>
              <div style={{ ...cardStyle, marginBottom: 12, background: "#150A05" }}>
                {ai.monthsToDebtFree && (
                  <div style={{ background: "#1A1005", borderRadius: 7, padding: "8px 12px", fontSize: 12, color: "#FCD34D", marginBottom: 10 }}>
                    Clear debt in ~{ai.monthsToDebtFree} months at current payment rate
                  </div>
                )}
                {ai.debtSteps.map((step, index) => (
                  <div key={index} style={{ display: "flex", gap: 9, marginBottom: 8 }}>
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        background: colors.border,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 10,
                        color: "#FBBF24",
                        flexShrink: 0,
                        marginTop: 1,
                      }}
                    >
                      {index + 1}
                    </div>
                    <div style={{ fontSize: 12, color: colors.text, lineHeight: 1.5 }}>{step}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {ai.savingsTips && ai.savingsTips.length > 0 && (
            <div>
              <SectionHeading>Ways to Save More</SectionHeading>
              {ai.savingsTips.map((tip, index) => (
                <div key={index} style={{ ...cardStyle, marginBottom: 7, padding: "11px 14px", borderLeft: "3px solid #5BA85A" }}>
                  <div style={{ fontSize: 12, color: colors.muted, lineHeight: 1.5 }}>{tip}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!ai && !props.aiLoading && (
        <div style={{ ...cardStyle, textAlign: "center", padding: "40px 20px", color: colors.muted }}>
          <div style={{ fontSize: 13 }}>Enter income and budget data, then hit Generate for personalized advice.</div>
        </div>
      )}
    </div>
  );
}

function Modal(props) {
  return (
    <div onClick={props.onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.78)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 14 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: colors.surface, border: "1px solid " + colors.border, borderRadius: 14, padding: 20, width: "100%", maxWidth: 420, maxHeight: "88vh", overflowY: "auto" }}>
        {props.children}
      </div>
    </div>
  );
}

function IncomeForm(props) {
  const form = props.form;
  const setForm = props.setForm;
  const previewMonthly = form.netPay ? monthlyAmount(parseFloat(form.netPay) || 0, form.frequency) : 0;

  return (
    <div>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Household Income</div>
      <div style={{ fontSize: 12, color: colors.muted, marginBottom: 14 }}>
        Enter the combined net pay that lands in your bank account.
      </div>
      <FieldLabel>Net pay per cheque ($) — what hits your bank</FieldLabel>
      <input type="number" value={form.netPay} onChange={(e) => setForm((p) => ({ ...p, netPay: e.target.value }))} placeholder="e.g. 2200" style={inputStyle} />
      <FieldLabel>Pay frequency</FieldLabel>
      <select value={form.frequency} onChange={(e) => setForm((p) => ({ ...p, frequency: e.target.value }))} style={inputStyle}>
        <option value="weekly">Weekly (52×/yr)</option>
        <option value="biweekly">Bi-weekly (26×/yr)</option>
        <option value="semimonthly">Semi-monthly (24×/yr)</option>
        <option value="monthly">Monthly (12×/yr)</option>
      </select>
      <FieldLabel>Next pay date (optional)</FieldLabel>
      <input type="date" value={form.nextPayDate} onChange={(e) => setForm((p) => ({ ...p, nextPayDate: e.target.value }))} style={inputStyle} />
      {form.netPay && (
        <div style={{ background: "#0D2818", border: "1px solid #1A4731", borderRadius: 7, padding: "9px 11px", marginTop: 11, fontSize: 12, color: colors.green }}>
          Monthly net: {formatMoney(previewMonthly)}
        </div>
      )}
      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button onClick={props.onCancel} style={{ ...buttonStyle(colors.muted, "#252A3A", "#252A3A"), flex: 1 }}>Cancel</button>
        <button onClick={props.onSave} style={{ ...buttonStyle(), flex: 2 }}>Save</button>
      </div>
    </div>
  );
}

function TransactionForm(props) {
  const form = props.form;
  const setForm = props.setForm;
  return (
    <div>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Add Transaction</div>
      <FieldLabel>Date</FieldLabel>
      <input type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} style={inputStyle} />
      <FieldLabel>Description</FieldLabel>
      <input type="text" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="e.g. Loblaws groceries" style={inputStyle} />
      <FieldLabel>Amount ($)</FieldLabel>
      <input type="number" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} placeholder="0.00" style={inputStyle} />
      <FieldLabel>Category</FieldLabel>
      <select value={form.categoryId} onChange={(e) => setForm((p) => ({ ...p, categoryId: e.target.value }))} style={inputStyle}>
        <option value="">Select…</option>
        <optgroup label="Spending">
          {props.spendingCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </optgroup>
        <optgroup label="Savings">
          {props.savingsCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </optgroup>
        <optgroup label="Debt">
          {props.debtCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </optgroup>
      </select>
      <FieldLabel>Account</FieldLabel>
      {props.accounts.length === 0 ? (
        <div style={{ fontSize: 12, color: colors.muted, background: colors.background, borderRadius: 6, padding: "9px 11px" }}>
          No accounts yet. Add one in the Accounts tab first.
        </div>
      ) : (
        <select value={form.accountId} onChange={(e) => setForm((p) => ({ ...p, accountId: e.target.value }))} style={inputStyle}>
          <option value="">Select…</option>
          {props.accounts.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.institution})</option>)}
        </select>
      )}
      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button onClick={props.onCancel} style={{ ...buttonStyle(colors.muted, "#252A3A", "#252A3A"), flex: 1 }}>Cancel</button>
        <button onClick={props.onSave} style={{ ...buttonStyle(), flex: 2 }}>Add</button>
      </div>
    </div>
  );
}

function CategoryForm(props) {
  const form = props.form;
  const setForm = props.setForm;
  return (
    <div>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>New Category</div>
      <FieldLabel>Name</FieldLabel>
      <input type="text" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Dining Out" style={inputStyle} />
      <FieldLabel>Type</FieldLabel>
      <select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))} style={inputStyle}>
        <option value="spend">Spending</option>
        <option value="save">Savings</option>
        <option value="debt">Debt Payment</option>
      </select>
      {form.type === "debt" && (
        <div>
          <FieldLabel>Current balance ($)</FieldLabel>
          <input type="number" value={form.balance} onChange={(e) => setForm((p) => ({ ...p, balance: e.target.value }))} placeholder="0" style={inputStyle} />
          <FieldLabel>Interest rate (%)</FieldLabel>
          <input type="number" value={form.rate} onChange={(e) => setForm((p) => ({ ...p, rate: e.target.value }))} placeholder="e.g. 19.99" style={inputStyle} />
        </div>
      )}
      <FieldLabel>Monthly {form.type === "debt" ? "payment" : "budget"} ($)</FieldLabel>
      <input type="number" value={form.budget} onChange={(e) => setForm((p) => ({ ...p, budget: e.target.value }))} placeholder="0" style={inputStyle} />
      <FieldLabel>Colour</FieldLabel>
      <input type="color" value={form.color} onChange={(e) => setForm((p) => ({ ...p, color: e.target.value }))} style={{ ...inputStyle, padding: 4, height: 38 }} />
      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button onClick={props.onCancel} style={{ ...buttonStyle(colors.muted, "#252A3A", "#252A3A"), flex: 1 }}>Cancel</button>
        <button onClick={props.onSave} style={{ ...buttonStyle(), flex: 2 }}>Add Category</button>
      </div>
    </div>
  );
}

function AccountForm(props) {
  const form = props.form;
  const setForm = props.setForm;
  return (
    <div>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>New Account</div>
      <FieldLabel>Account name</FieldLabel>
      <input type="text" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Joint Chequing" style={inputStyle} />
      <FieldLabel>Institution</FieldLabel>
      <input type="text" value={form.institution} onChange={(e) => setForm((p) => ({ ...p, institution: e.target.value }))} placeholder="e.g. TD Canada Trust" style={inputStyle} />
      <FieldLabel>Account type</FieldLabel>
      <select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))} style={inputStyle}>
        <option value="chequing">Chequing</option>
        <option value="savings">Savings</option>
        <option value="credit">Credit Card</option>
        <option value="other">Other</option>
      </select>
      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button onClick={props.onCancel} style={{ ...buttonStyle(colors.muted, "#252A3A", "#252A3A"), flex: 1 }}>Cancel</button>
        <button onClick={props.onSave} style={{ ...buttonStyle(), flex: 2 }}>Add Account</button>
      </div>
    </div>
  );
}
