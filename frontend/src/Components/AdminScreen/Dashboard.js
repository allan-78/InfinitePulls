import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { BarChart, LineChart, PieChart } from "react-native-chart-kit";
import axios from "axios";
import { MaterialIcons as Icon } from "@expo/vector-icons";
import { getToken } from "../../utils/helper";
import AdminDrawer from "./AdminDrawer";
import { adminColors, adminFonts, adminShadow } from "./adminTheme";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [salesData, setSalesData] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [productSales, setProductSales] = useState(null);
  const [recentBuyers, setRecentBuyers] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState("monthly");
  const [selectedYear] = useState(new Date().getFullYear());
  const [dateRangeData, setDateRangeData] = useState(null);

  const fetchDashboardData = async () => {
    try {
      const token = await getToken();
      const headers = { Authorization: `Bearer ${token}` };
      const [
        salesResponse,
        statisticsResponse,
        productSalesResponse,
        recentBuyersResponse,
        dateRangeResponse,
      ] = await Promise.all([
        axios.get(
          `${BACKEND_URL}/api/v1/sales/monthly?type=${selectedPeriod}&year=${selectedYear}`,
          { headers }
        ),
        axios.get(`${BACKEND_URL}/api/v1/sales/statistics`, { headers }),
        axios.get(`${BACKEND_URL}/api/v1/sales/products?limit=5`, { headers }),
        axios.get(`${BACKEND_URL}/api/v1/sales/recent-buyers?limit=6`, {
          headers,
        }),
        axios.get(
          `${BACKEND_URL}/api/v1/sales/date-range?startDate=${getLast30Days()}&endDate=${getToday()}&groupBy=daily`,
          { headers }
        ),
      ]);

      if (salesResponse.data.success) setSalesData(salesResponse.data.data);
      if (statisticsResponse.data.success)
        setStatistics(statisticsResponse.data.data);
      if (productSalesResponse.data.success)
        setProductSales(productSalesResponse.data.data);
      if (recentBuyersResponse.data.success) {
        setRecentBuyers(recentBuyersResponse.data.data.recentBuyers || []);
      }
      if (dateRangeResponse.data.success)
        setDateRangeData(dateRangeResponse.data.data);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [selectedPeriod]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const lineChartData = useMemo(() => {
    if (!salesData?.sales?.length) return null;
    return {
      labels: salesData.sales.map((item) =>
        selectedPeriod === "monthly" ? item.period.substring(0, 3) : item.period
      ),
      datasets: [
        {
          data: salesData.sales.map((item) => item.totalSales),
          color: (opacity = 1) => `rgba(240, 154, 134, ${opacity})`,
          strokeWidth: 3,
        },
      ],
    };
  }, [salesData, selectedPeriod]);

  const barChartData = useMemo(() => {
    if (!dateRangeData?.sales?.length) return null;
    const last7Days = dateRangeData.sales.slice(-7);
    return {
      labels: last7Days.map((item) =>
        new Date(item.period).toLocaleDateString("en-US", { weekday: "short" })
      ),
      datasets: [{ data: last7Days.map((item) => item.totalSales) }],
    };
  }, [dateRangeData]);

  const pieChartData = useMemo(() => {
    if (!productSales?.products?.length) return [];
    const colors = ["#F09A86", "#8FBF7A", "#F4E2A8", "#A9785E", "#D97B66"];
    return productSales.products.map((item, index) => ({
      name: item.productName || "Unknown",
      revenue: item.totalRevenue,
      color: colors[index % colors.length],
      legendFontColor: adminColors.textMuted,
      legendFontSize: 11,
    }));
  }, [productSales]);

  const chartConfig = {
    backgroundColor: adminColors.panel,
    backgroundGradientFrom: adminColors.panel,
    backgroundGradientTo: adminColors.panelElevated,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(240, 154, 134, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(247, 232, 213, ${opacity})`,
    propsForDots: {
      r: "5",
      strokeWidth: "2",
      stroke: adminColors.accentSoft,
    },
    barPercentage: 0.7,
  };

  if (loading) {
    return (
      <AdminDrawer>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={adminColors.accentSoft} />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </AdminDrawer>
    );
  }

  return (
    <AdminDrawer>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={adminColors.accentSoft}
          />
        }
      >
        <View style={styles.heroCard}>
          <View style={styles.heroBadge}>
            <Icon name="shield" size={16} color={adminColors.sparkle} />
            <Text style={styles.heroBadgeText}>Admin Overview</Text>
          </View>
          <Text style={styles.heroTitle}>
            Store performance and buyer activity
          </Text>
          <Text style={styles.heroSubtitle}>
            Watch revenue, order volume, top packs, and recent buyers from a
            single admin dashboard.
          </Text>
        </View>

        <View style={styles.selectorContainer}>
          <Text style={styles.selectorLabel}>Trend period</Text>
          <View style={styles.periodSelector}>
            {["monthly", "yearly"].map((period) => (
              <TouchableOpacity
                key={period}
                style={[
                  styles.periodButton,
                  selectedPeriod === period && styles.periodButtonActive,
                ]}
                onPress={() => setSelectedPeriod(period)}
              >
                <Text
                  style={[
                    styles.periodButtonText,
                    selectedPeriod === period && styles.periodButtonTextActive,
                  ]}
                >
                  {period === "monthly" ? "Monthly" : "Yearly"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {statistics && (
          <View style={styles.statsGrid}>
            <StatCard
              title="Today"
              icon="today"
              value={formatCurrency(statistics.today?.revenue)}
              subtitle={`${statistics.today?.orders || 0} orders`}
              color={adminColors.accentSoft}
            />
            <StatCard
              title="This Week"
              icon="date-range"
              value={formatCurrency(statistics.week?.revenue)}
              subtitle={`${statistics.week?.orders || 0} orders`}
              color={adminColors.success}
            />
            <StatCard
              title="This Month"
              icon="calendar-month"
              value={formatCurrency(statistics.month?.revenue)}
              subtitle={`${statistics.month?.orders || 0} orders`}
              color={adminColors.sparkle}
            />
            <StatCard
              title="This Year"
              icon="insights"
              value={formatCurrency(statistics.year?.revenue)}
              subtitle={`${statistics.year?.orders || 0} orders`}
              color={adminColors.textSoft}
            />
          </View>
        )}

        {lineChartData && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Sales trend</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <LineChart
                data={lineChartData}
                width={Math.max(
                  SCREEN_WIDTH - 64,
                  lineChartData.labels.length * 62
                )}
                height={220}
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
                formatYLabel={(value) =>
                  `P${(parseInt(value, 10) / 1000).toFixed(0)}k`
                }
                fromZero
              />
            </ScrollView>
            <SummaryRow
              left={{
                label: "Revenue",
                value: formatCurrency(salesData?.summary?.totalRevenue),
              }}
              middle={{
                label: "Orders",
                value: formatNumber(salesData?.summary?.totalOrders),
              }}
              right={{
                label: "Avg Order",
                value: formatCurrency(salesData?.summary?.averageOrderValue),
              }}
            />
          </View>
        )}

        {barChartData && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Daily sales</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <BarChart
                data={barChartData}
                width={Math.max(
                  SCREEN_WIDTH - 64,
                  barChartData.labels.length * 72
                )}
                height={220}
                chartConfig={chartConfig}
                style={styles.chart}
                yAxisLabel="P"
                fromZero
                showValuesOnTopOfBars
              />
            </ScrollView>
            <SummaryRow
              left={{
                label: "Period Revenue",
                value: formatCurrency(dateRangeData?.summary?.totalRevenue),
              }}
              middle={{
                label: "Orders",
                value: formatNumber(dateRangeData?.summary?.totalOrders),
              }}
              right={{
                label: "Daily Avg",
                value: formatCurrency(
                  (dateRangeData?.summary?.totalRevenue || 0) / 7
                ),
              }}
            />
          </View>
        )}

        {pieChartData.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Top listings by revenue</Text>
            <PieChart
              data={pieChartData}
              width={SCREEN_WIDTH - 64}
              height={220}
              chartConfig={chartConfig}
              accessor="revenue"
              backgroundColor="transparent"
              paddingLeft="12"
              absolute
            />
            <View style={styles.listGroup}>
              {productSales.products.map((product, index) => (
                <View
                  key={`${product.productName}-${index}`}
                  style={styles.listRow}
                >
                  <View style={styles.listRowCopy}>
                    <Text numberOfLines={1} style={styles.listPrimary}>
                      {product.productName}
                    </Text>
                    <Text style={styles.listSecondary}>
                      {product.totalQuantity} units • {product.orderCount}{" "}
                      orders
                    </Text>
                  </View>
                  <View style={styles.listRowMeta}>
                    <Text style={styles.listPrimaryAccent}>
                      {formatCurrency(product.totalRevenue)}
                    </Text>
                    <Text style={styles.listSecondary}>
                      {product.percentage?.toFixed(1)}%
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Recent buyers</Text>
          {recentBuyers.length ? (
            recentBuyers.map((buyer, index) => (
              <View
                key={`${buyer.userEmail}-${index}`}
                style={styles.buyerCard}
              >
                <View style={styles.buyerHeader}>
                  <View style={styles.buyerAvatar}>
                    <Text style={styles.buyerAvatarText}>
                      {buyer.userName?.charAt(0).toUpperCase() || "G"}
                    </Text>
                  </View>
                  <View style={styles.buyerInfo}>
                    <Text style={styles.buyerName}>{buyer.userName}</Text>
                    <Text style={styles.buyerEmail}>{buyer.userEmail}</Text>
                    <Text style={styles.buyerDate}>
                      {formatDateTime(buyer.purchaseDate)}
                    </Text>
                  </View>
                  <Text style={styles.buyerAmount}>
                    {formatCurrency(buyer.orderTotal)}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Icon
                name="shopping-bag"
                size={34}
                color={adminColors.textMuted}
              />
              <Text style={styles.emptyText}>No recent buyer activity</Text>
            </View>
          )}
        </View>

        {statistics && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>All-time summary</Text>
            <SummaryRow
              left={{
                label: "Revenue",
                value: formatCurrency(statistics.allTime?.revenue),
              }}
              middle={{
                label: "Orders",
                value: formatNumber(statistics.allTime?.orders),
              }}
              right={{
                label: "Avg Order",
                value: formatCurrency(
                  statistics.allTime?.orders > 0
                    ? statistics.allTime.revenue / statistics.allTime.orders
                    : 0
                ),
              }}
            />
          </View>
        )}
      </ScrollView>
    </AdminDrawer>
  );
}

function StatCard({ title, value, icon, color, subtitle }) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statHeader}>
        <Icon name={icon} size={20} color={color} />
        <Text style={styles.statTitle}>{title}</Text>
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statSubtitle}>{subtitle}</Text>
    </View>
  );
}

function SummaryRow({ left, middle, right }) {
  return (
    <View style={styles.summaryRow}>
      {[left, middle, right].map((item) => (
        <View key={item.label} style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>{item.label}</Text>
          <Text style={styles.summaryValue}>{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

const formatCurrency = (amount) => `PHP ${Number(amount || 0).toFixed(2)}`;
const formatNumber = (num) => Number(num || 0).toLocaleString();
const getToday = () => new Date().toISOString().split("T")[0];
const getLast30Days = () => {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date.toISOString().split("T")[0];
};
const formatDateTime = (dateString) =>
  new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: adminColors.background,
  },
  contentContainer: {
    paddingBottom: 24,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: adminColors.background,
  },
  loadingText: {
    marginTop: 12,
    color: adminColors.textMuted,
    fontFamily: adminFonts.regular,
    fontSize: 15,
  },
  heroCard: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    padding: 18,
    backgroundColor: adminColors.panel,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: adminColors.surfaceBorder,
    ...adminShadow,
  },
  heroBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: adminColors.chip,
  },
  heroBadgeText: {
    color: adminColors.textPrimary,
    fontFamily: adminFonts.semibold,
    fontSize: 12,
  },
  heroTitle: {
    marginTop: 14,
    color: adminColors.textPrimary,
    fontFamily: adminFonts.bold,
    fontSize: 24,
  },
  heroSubtitle: {
    marginTop: 8,
    color: adminColors.textMuted,
    fontFamily: adminFonts.regular,
    fontSize: 13,
    lineHeight: 20,
  },
  selectorContainer: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    backgroundColor: adminColors.panel,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: adminColors.surfaceBorder,
    padding: 16,
  },
  selectorLabel: {
    color: adminColors.textMuted,
    fontFamily: adminFonts.semibold,
    fontSize: 13,
    marginBottom: 10,
  },
  periodSelector: {
    flexDirection: "row",
    backgroundColor: adminColors.backgroundSoft,
    borderRadius: 999,
    padding: 4,
  },
  periodButton: {
    flex: 1,
    alignItems: "center",
    borderRadius: 999,
    paddingVertical: 10,
  },
  periodButtonActive: {
    backgroundColor: adminColors.accentSoft,
  },
  periodButtonText: {
    color: adminColors.textMuted,
    fontFamily: adminFonts.semibold,
    fontSize: 14,
  },
  periodButtonTextActive: {
    color: adminColors.darkText,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  statCard: {
    width: "48%",
    marginBottom: 12,
    padding: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: adminColors.surfaceBorder,
    borderLeftWidth: 4,
    backgroundColor: adminColors.panel,
  },
  statHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  statTitle: {
    marginLeft: 8,
    color: adminColors.textMuted,
    fontFamily: adminFonts.semibold,
    fontSize: 13,
  },
  statValue: {
    color: adminColors.textPrimary,
    fontFamily: adminFonts.bold,
    fontSize: 18,
  },
  statSubtitle: {
    marginTop: 4,
    color: adminColors.textSoft,
    fontFamily: adminFonts.regular,
    fontSize: 12,
  },
  sectionCard: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: adminColors.surfaceBorder,
    backgroundColor: adminColors.panel,
  },
  sectionTitle: {
    color: adminColors.textPrimary,
    fontFamily: adminFonts.bold,
    fontSize: 17,
    marginBottom: 14,
  },
  chart: {
    borderRadius: 18,
    marginVertical: 4,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: adminColors.line,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryLabel: {
    color: adminColors.textMuted,
    fontFamily: adminFonts.regular,
    fontSize: 11,
    marginBottom: 4,
  },
  summaryValue: {
    color: adminColors.accentSoft,
    fontFamily: adminFonts.bold,
    fontSize: 14,
  },
  listGroup: {
    marginTop: 8,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: adminColors.line,
  },
  listRowCopy: {
    flex: 1,
    marginRight: 10,
  },
  listPrimary: {
    color: adminColors.textPrimary,
    fontFamily: adminFonts.semibold,
    fontSize: 14,
  },
  listPrimaryAccent: {
    color: adminColors.accentSoft,
    fontFamily: adminFonts.bold,
    fontSize: 14,
  },
  listSecondary: {
    color: adminColors.textMuted,
    fontFamily: adminFonts.regular,
    fontSize: 11,
    marginTop: 2,
  },
  listRowMeta: {
    alignItems: "flex-end",
  },
  buyerCard: {
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: adminColors.line,
    backgroundColor: adminColors.backgroundSoft,
    marginBottom: 10,
  },
  buyerHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  buyerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: adminColors.accent,
    marginRight: 12,
  },
  buyerAvatarText: {
    color: adminColors.textPrimary,
    fontFamily: adminFonts.bold,
    fontSize: 18,
  },
  buyerInfo: {
    flex: 1,
  },
  buyerName: {
    color: adminColors.textPrimary,
    fontFamily: adminFonts.semibold,
    fontSize: 14,
  },
  buyerEmail: {
    color: adminColors.textMuted,
    fontFamily: adminFonts.regular,
    fontSize: 12,
    marginTop: 2,
  },
  buyerDate: {
    color: adminColors.textSoft,
    fontFamily: adminFonts.regular,
    fontSize: 11,
    marginTop: 3,
  },
  buyerAmount: {
    color: adminColors.accentSoft,
    fontFamily: adminFonts.bold,
    fontSize: 14,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 24,
  },
  emptyText: {
    marginTop: 8,
    color: adminColors.textMuted,
    fontFamily: adminFonts.regular,
    fontSize: 14,
  },
});
