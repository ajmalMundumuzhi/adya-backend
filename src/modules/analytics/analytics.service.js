const repository = require("./analytics.repository");

function getDateRange(from, to) {
  const startDate = from ? new Date(from) : new Date();
  const endDate = to ? new Date(to) : new Date();

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
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

  const totalViews = pages.reduce((sum, page) => sum + page.totalViews, 0);

  return { totalViews, pages, daily, startDate, endDate };
}

module.exports = { trackPageVisit, getAnalytics };
