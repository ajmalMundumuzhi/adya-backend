const PageVisit = require("../../models/PageVisit");
const mongoose = require("mongoose");

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

module.exports = { recordVisit, getSummary, getDailySummary };
