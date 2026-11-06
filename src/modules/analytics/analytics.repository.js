
const PageVisit = require("../../models/PageVisit");
const Order = require("../../models/Order");
const User = require("../../models/User");
const Product = require("../../models/Product");

async function recordVisit(pageName, visitDate) {
  return PageVisit.findOneAndUpdate(
    { pageName, visitDate },
    { $inc: { views: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
}

function getSummary(startDate, endDate) {
  return PageVisit.aggregate([
    {
      $match: {
        visitDate: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: "$pageName",
        totalViews: { $sum: "$views" }
      }
    },
    { $sort: { totalViews: -1 } }
  ]);
}

function getDailySummary(startDate, endDate) {
  return PageVisit.aggregate([
    {
      $match: {
        visitDate: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: "$visitDate",
        totalViews: { $sum: "$views" }
      }
    },
    { $sort: { _id: 1 } }
  ]);
}

async function getDashboardCounts() {
  const [
    totalRevenue,
    totalOrders,
    totalCustomers,
    totalProducts,
    orderStatuses
  ] = await Promise.all([
    Order.aggregate([
      {
        $match: {
          paymentStatus: "paid",
          status: { $ne: "cancelled" }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$totalAmountAUD" }
        }
      }
    ]),
    Order.countDocuments(),
    User.countDocuments(),
    Product.countDocuments(),
    Order.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ])
  ]);

  const statuses = Object.fromEntries(
    orderStatuses.map(item => [item._id, item.count])
  );

  return {
    totalRevenue: totalRevenue[0]?.total || 0,
    totalOrders,
    totalCustomers,
    totalProducts,
    pendingOrders: statuses.pending || 0,
    confirmedOrders: statuses.confirmed || 0,
    processingOrders: statuses.processing || 0,
    shippedOrders: statuses.shipped || 0,
    deliveredOrders: statuses.delivered || 0,
    cancelledOrders: statuses.cancelled || 0
  };
}

async function getPeriodCounts(startDate, endDate) {
  const [orders, customers, products, revenue] = await Promise.all([
    Order.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate }
    }),
    User.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate }
    }),
    Product.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate }
    }),
    Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          paymentStatus: "paid",
          status: { $ne: "cancelled" }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$totalAmountAUD" }
        }
      }
    ])
  ]);

  return {
    orders,
    customers,
    products,
    revenue: revenue[0]?.total || 0
  };
}

async function getSalesOverview(startDate, endDate) {
  return Order.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
        paymentStatus: "paid",
        status: { $ne: "cancelled" }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: "%Y-%m-%d",
            date: "$createdAt"
          }
        },
        revenue: { $sum: "$totalAmountAUD" }
      }
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        _id: 0,
        date: "$_id",
        revenue: 1
      }
    }
  ]);
}

function getRecentOrders(limit = 5) {
  return Order.find()
    .select("orderNumber customerName customerEmail totalAmountAUD status createdAt")
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
}

module.exports = {
  recordVisit,
  getSummary,
  getDailySummary,
  getDashboardCounts,
  getPeriodCounts,
  getSalesOverview,
  getRecentOrders
};
