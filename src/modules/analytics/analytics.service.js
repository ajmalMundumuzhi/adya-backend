
const repository = require("./analytics.repository");

function getDateRange(from, to) {
  const startDate = from ? new Date(from) : new Date();
  const endDate = to ? new Date(to) : new Date();

  if (
    Number.isNaN(startDate.getTime()) ||
    Number.isNaN(endDate.getTime())
  ) {
    const error = new Error("Invalid date format");
    error.statusCode = 400;
    throw error;
  }

  if (!from) startDate.setDate(startDate.getDate() - 6);

  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  if (startDate > endDate) {
    const error = new Error("Start date must be before end date");
    error.statusCode = 400;
    throw error;
  }

  return { startDate, endDate };
}

async function trackPageVisit(pageName) {
  const visitDate = new Date();
  visitDate.setHours(0, 0, 0, 0);

  return repository.recordVisit(pageName, visitDate);
}

async function getAnalytics(from, to) {
  const { startDate, endDate } = getDateRange(from, to);

  const [pages, daily] = await Promise.all([
    repository.getSummary(startDate, endDate),
    repository.getDailySummary(startDate, endDate)
  ]);

  const totalViews = pages.reduce(
    (sum, page) => sum + page.totalViews,
    0
  );

  return { totalViews, pages, daily, startDate, endDate };
}

function calculateChange(current, previous) {
  if (previous === 0) return current > 0 ? 100 : 0;

  return Number(
    (((current - previous) / previous) * 100).toFixed(2)
  );
}

async function getDashboard() {
  const { startDate, endDate } = getDateRange();

  const periodLength = endDate.getTime() - startDate.getTime() + 1;

  const previousEndDate = new Date(startDate.getTime() - 1);
  const previousStartDate = new Date(
    previousEndDate.getTime() - periodLength + 1
  );

  const [
    totals,
    currentPeriod,
    previousPeriod,
    salesOverview,
    recentOrders
  ] = await Promise.all([
    repository.getDashboardCounts(),
    repository.getPeriodCounts(startDate, endDate),
    repository.getPeriodCounts(previousStartDate, previousEndDate),
    repository.getSalesOverview(startDate, endDate),
    repository.getRecentOrders(5)
  ]);

  const salesMap = new Map(
    salesOverview.map(item => [item.date, item.revenue])
  );

  const completeSalesOverview = [];

  for (
    let date = new Date(startDate);
    date <= endDate;
    date.setDate(date.getDate() + 1)
  ) {
    const dateString = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")
    ].join("-");

    completeSalesOverview.push({
      date: dateString,
      label: date.toLocaleDateString("en-AU", {
        day: "2-digit",
        month: "short"
      }),
      revenue: salesMap.get(dateString) || 0
    });
  }

  return {
    ...totals,
    revenueChange: calculateChange(
      currentPeriod.revenue,
      previousPeriod.revenue
    ),
    ordersChange: calculateChange(
      currentPeriod.orders,
      previousPeriod.orders
    ),
    customersChange: calculateChange(
      currentPeriod.customers,
      previousPeriod.customers
    ),
    productsChange: calculateChange(
      currentPeriod.products,
      previousPeriod.products
    ),
    salesOverview: completeSalesOverview,
    recentOrders
  };
}

module.exports = {
  trackPageVisit,
  getAnalytics,
  getDashboard
};
