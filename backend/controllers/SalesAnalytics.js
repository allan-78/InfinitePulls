// backend/controllers/SalesAnalyticsController.js
const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");

const moment = require('moment');

// Get monthly sales data - FIXED VERSION
exports.getMonthlySales = async (req, res) => {
  try {
    const { year, month, type = 'monthly' } = req.query;

    // Set default year to current year if not provided
    const currentYear = parseInt(year) || moment().year();
    const selectedMonth = month ? parseInt(month) : null;

    console.log(`📊 Fetching ${type} sales data for year: ${currentYear}, month: ${selectedMonth}`);

    if (type === 'yearly') {
      // Yearly data - last 6 years including current
      const startYear = currentYear - 5;
      
      // Get yearly sales data using aggregation - FIXED QUERY
      const yearlyData = await Order.aggregate([
        {
          $match: {
            orderStatus: "Delivered",
            createdAt: {
              $gte: new Date(`${startYear}-01-01T00:00:00.000Z`),
              $lte: new Date(`${currentYear}-12-31T23:59:59.999Z`)
            }
          }
        },
        {
          $group: {
            _id: { $year: "$createdAt" },
            totalSales: { $sum: "$totalPrice" },
            orderCount: { $sum: 1 }
          }
        },
        {
          $sort: { "_id": 1 }
        }
      ]);

      console.log('📈 Yearly aggregation result:', yearlyData);

      // Fill in missing years with zero values
      const allYears = [];
      for (let y = startYear; y <= currentYear; y++) {
        const existingData = yearlyData.find(item => item._id === y);
        allYears.push({
          period: y.toString(),
          totalSales: existingData ? existingData.totalSales : 0,
          orderCount: existingData ? existingData.orderCount : 0
        });
      }

      // Calculate summary
      const totalRevenue = allYears.reduce((sum, item) => sum + item.totalSales, 0);
      const totalOrders = allYears.reduce((sum, item) => sum + item.orderCount, 0);

      res.status(200).json({
        success: true,
        data: {
          sales: allYears,
          summary: {
            totalRevenue,
            totalOrders,
            averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0
          }
        }
      });

    } else {
      // Monthly data - FIXED to show all months
      const startDate = new Date(`${currentYear}-01-01T00:00:00.000Z`);
      const endDate = new Date(`${currentYear}-12-31T23:59:59.999Z`);

      // Get monthly sales data using aggregation
      const monthlyData = await Order.aggregate([
        {
          $match: {
            orderStatus: "Delivered",
            createdAt: {
              $gte: startDate,
              $lte: endDate
            }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" }
            },
            totalSales: { $sum: "$totalPrice" },
            orderCount: { $sum: 1 }
          }
        },
        {
          $sort: { "_id.year": 1, "_id.month": 1 }
        }
      ]);

      console.log('📈 Monthly aggregation result:', monthlyData);

      // Fill in ALL months with zero values for months with no data
      const allMonths = [];
      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];

      for (let m = 1; m <= 12; m++) {
        const monthName = `${monthNames[m-1]}`;
        const existingData = monthlyData.find(item => 
          item._id.year === currentYear && item._id.month === m
        );
        
        allMonths.push({
          period: monthName,
          totalSales: existingData ? existingData.totalSales : 0,
          orderCount: existingData ? existingData.orderCount : 0,
          monthNumber: m,
          year: currentYear
        });
      }

      // Filter by specific month if provided
      let filteredData = allMonths;
      if (selectedMonth) {
        filteredData = allMonths.filter(month => month.monthNumber === selectedMonth);
      }

      // Calculate summary
      const totalRevenue = filteredData.reduce((sum, item) => sum + item.totalSales, 0);
      const totalOrders = filteredData.reduce((sum, item) => sum + item.orderCount, 0);

      res.status(200).json({
        success: true,
        data: {
          sales: filteredData,
          summary: {
            totalRevenue,
            totalOrders,
            averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0
          }
        }
      });
    }

  } catch (error) {
    console.error("❌ Error fetching sales data:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch sales data.",
      error: error.message 
    });
  }
};

// Get sales data with date range filter - IMPROVED VERSION
exports.getSalesWithDateRange = async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'daily' } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Start date and end date are required."
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Set time to beginning and end of day for complete coverage
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    if (start > end) {
      return res.status(400).json({
        success: false,
        message: "Start date cannot be after end date."
      });
    }

    console.log(`📊 Fetching sales data from ${start} to ${end}, grouped by: ${groupBy}`);

    let salesData;

    if (groupBy === 'daily') {
      // Daily aggregation
      salesData = await Order.aggregate([
        {
          $match: {
            orderStatus: "Delivered",
            createdAt: { 
              $gte: start, 
              $lte: end 
            }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
              day: { $dayOfMonth: "$createdAt" }
            },
            totalSales: { $sum: "$totalPrice" },
            orderCount: { $sum: 1 },
            date: { $first: "$createdAt" }
          }
        },
        {
          $addFields: {
            period: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$date"
              }
            }
          }
        },
        {
          $sort: { "period": 1 }
        }
      ]);
    } else if (groupBy === 'monthly') {
      // Monthly aggregation
      salesData = await Order.aggregate([
        {
          $match: {
            orderStatus: "Delivered",
            createdAt: { 
              $gte: start, 
              $lte: end 
            }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" }
            },
            totalSales: { $sum: "$totalPrice" },
            orderCount: { $sum: 1 }
          }
        },
        {
          $addFields: {
            period: {
              $concat: [
                { $toString: "$_id.year" },
                "-",
                { 
                  $cond: {
                    if: { $lt: ["$_id.month", 10] },
                    then: { $concat: ["0", { $toString: "$_id.month" }] },
                    else: { $toString: "$_id.month" }
                  }
                }
              ]
            }
          }
        },
        {
          $sort: { "_id.year": 1, "_id.month": 1 }
        }
      ]);
    } else {
      // Yearly aggregation
      salesData = await Order.aggregate([
        {
          $match: {
            orderStatus: "Delivered",
            createdAt: { 
              $gte: start, 
              $lte: end 
            }
          }
        },
        {
          $group: {
            _id: { $year: "$createdAt" },
            totalSales: { $sum: "$totalPrice" },
            orderCount: { $sum: 1 }
          }
        },
        {
          $addFields: {
            period: { $toString: "$_id" }
          }
        },
        {
          $sort: { "_id": 1 }
        }
      ]);
    }

    console.log('📈 Date range sales data:', salesData);

    // Calculate summary
    const totalRevenue = salesData.reduce((sum, item) => sum + item.totalSales, 0);
    const totalOrders = salesData.reduce((sum, item) => sum + item.orderCount, 0);

    res.status(200).json({
      success: true,
      data: {
        sales: salesData,
        summary: {
          totalRevenue,
          totalOrders,
          averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0
        }
      }
    });

  } catch (error) {
    console.error("❌ Error fetching sales with date range:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch sales data.",
      error: error.message
    });
  }
};

// NEW: Get product sales analytics for pie chart
exports.getProductSales = async (req, res) => {
  try {
    const { startDate, endDate, limit = 10 } = req.query;

    const matchStage = {
      orderStatus: "Delivered"
    };

    // Add date range if provided
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      
      matchStage.createdAt = { 
        $gte: start, 
        $lte: end 
      };
    }

    const productSales = await Order.aggregate([
      {
        $match: matchStage
      },
      { $unwind: "$orderItems" },
      {
        $group: {
          _id: "$orderItems.product",
          productName: { $first: "$orderItems.name" },
          totalQuantity: { $sum: "$orderItems.quantity" },
          totalRevenue: { $sum: { $multiply: ["$orderItems.quantity", "$orderItems.price"] } },
          orderCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "productDetails"
        }
      },
      {
        $unwind: {
          path: "$productDetails",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          productId: "$_id",
          productName: {
            $cond: {
              if: { $eq: ["$productName", ""] },
              then: "$productDetails.name",
              else: "$productName"
            }
          },
          totalQuantity: 1,
          totalRevenue: 1,
          orderCount: 1,
          image: "$productDetails.images.url"
        }
      },
      {
        $sort: { totalRevenue: -1 }
      },
      {
        $limit: parseInt(limit)
      }
    ]);

    // Calculate total for percentages
    const totalRevenue = productSales.reduce((sum, item) => sum + item.totalRevenue, 0);

    // Add percentage to each product
    const productSalesWithPercentage = productSales.map(item => ({
      ...item,
      percentage: totalRevenue > 0 ? (item.totalRevenue / totalRevenue) * 100 : 0
    }));

    res.status(200).json({
      success: true,
      data: {
        products: productSalesWithPercentage,
        summary: {
          totalRevenue,
          totalProducts: productSales.length
        }
      }
    });

  } catch (error) {
    console.error("❌ Error fetching product sales:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch product sales data.",
      error: error.message
    });
  }
};

// NEW: Get sales statistics for dashboard
exports.getSalesStatistics = async (req, res) => {
  try {
    const today = new Date();
    const startOfToday = new Date(today.setHours(0, 0, 0, 0));
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    const [
      todaySales,
      weekSales,
      monthSales,
      yearSales,
      totalSales
    ] = await Promise.all([
      // Today's sales
      Order.aggregate([
        {
          $match: {
            orderStatus: "Delivered",
            createdAt: { $gte: startOfToday }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$totalPrice" },
            count: { $sum: 1 }
          }
        }
      ]),
      // This week's sales
      Order.aggregate([
        {
          $match: {
            orderStatus: "Delivered",
            createdAt: { $gte: startOfWeek }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$totalPrice" },
            count: { $sum: 1 }
          }
        }
      ]),
      // This month's sales
      Order.aggregate([
        {
          $match: {
            orderStatus: "Delivered",
            createdAt: { $gte: startOfMonth }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$totalPrice" },
            count: { $sum: 1 }
          }
        }
      ]),
      // This year's sales
      Order.aggregate([
        {
          $match: {
            orderStatus: "Delivered",
            createdAt: { $gte: startOfYear }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$totalPrice" },
            count: { $sum: 1 }
          }
        }
      ]),
      // All-time sales
      Order.aggregate([
        {
          $match: {
            orderStatus: "Delivered"
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$totalPrice" },
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    const statistics = {
      today: {
        revenue: todaySales[0]?.total || 0,
        orders: todaySales[0]?.count || 0
      },
      week: {
        revenue: weekSales[0]?.total || 0,
        orders: weekSales[0]?.count || 0
      },
      month: {
        revenue: monthSales[0]?.total || 0,
        orders: monthSales[0]?.count || 0
      },
      year: {
        revenue: yearSales[0]?.total || 0,
        orders: yearSales[0]?.count || 0
      },
      allTime: {
        revenue: totalSales[0]?.total || 0,
        orders: totalSales[0]?.count || 0
      }
    };

    res.status(200).json({
      success: true,
      data: statistics
    });

  } catch (error) {
    console.error("❌ Error fetching sales statistics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch sales statistics"
    });
  }
};

// NEW: Get recent buyers with their purchase details
exports.getRecentBuyers = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const recentBuyers = await Order.aggregate([
      {
        $match: {
          orderStatus: "Delivered"
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $limit: parseInt(limit)
      },
      {
        $unwind: "$orderItems"
      },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "userDetails"
        }
      },
      {
        $unwind: {
          path: "$userDetails",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          orderId: "$_id",
          userName: {
            $cond: {
              if: { $and: ["$userDetails", "$userDetails.name"] },
              then: "$userDetails.name",
              else: "Guest User"
            }
          },
          userEmail: {
            $cond: {
              if: { $and: ["$userDetails", "$userDetails.email"] },
              then: "$userDetails.email",
              else: "No Email"
            }
          },
          productName: "$orderItems.name",
          productPrice: "$orderItems.price",
          quantity: "$orderItems.quantity",
          totalPrice: { $multiply: ["$orderItems.quantity", "$orderItems.price"] },
          purchaseDate: "$createdAt",
          orderStatus: 1
        }
      },
      {
        $group: {
          _id: "$orderId",
          userName: { $first: "$userName" },
          userEmail: { $first: "$userEmail" },
          purchaseDate: { $first: "$purchaseDate" },
          items: {
            $push: {
              productName: "$productName",
              productPrice: "$productPrice",
              quantity: "$quantity",
              totalPrice: "$totalPrice"
            }
          },
          orderTotal: { $first: "$totalPrice" }
        }
      },
      {
        $sort: { purchaseDate: -1 }
      },
      {
        $limit: parseInt(limit)
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        recentBuyers,
        total: recentBuyers.length
      }
    });

  } catch (error) {
    console.error("❌ Error fetching recent buyers:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch recent buyers data.",
      error: error.message
    });
  }
};