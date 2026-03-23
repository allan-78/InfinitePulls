import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import { MaterialIcons as Icon } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { getToken } from "../../../utils/helper";
import { listProducts } from "../../../redux/actions/productActions";
import AdminDrawer from "../AdminDrawer";
import { adminColors, adminFonts, adminShadow } from "../adminTheme";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function ProductListScreen({ navigation }) {
  const dispatch = useDispatch();
  const { loading: loadingProducts, products: reduxProducts } = useSelector(
    (state) => state.productList
  );
  const products = reduxProducts || [];
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [archiveModalVisible, setArchiveModalVisible] = useState(false);
  const [archiveSuccessVisible, setArchiveSuccessVisible] = useState(false);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [discountModalVisible, setDiscountModalVisible] = useState(false);
  const [discountSaving, setDiscountSaving] = useState(false);
  const [discountSuccessVisible, setDiscountSuccessVisible] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [discountForm, setDiscountForm] = useState({
    discountPercentage: "",
    discountStartDate: null,
    discountEndDate: null,
  });

  const fetchProducts = () => {
    dispatch(listProducts());
    setRefreshing(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const stats = useMemo(() => {
    const onSale = products.filter((product) => product.isOnSale).length;
    const outOfStock = products.filter(
      (product) => Number(product.stock || 0) <= 0
    ).length;
    const inStock = products.filter(
      (product) => Number(product.stock || 0) > 0
    ).length;
    const categories = new Set(
      products.map((product) => product.category).filter(Boolean)
    ).size;
    return {
      total: products.length,
      onSale,
      inStock,
      outOfStock,
      categories,
    };
  }, [products]);

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return products.filter((product) => {
      const matchesQuery =
        !query ||
        product.name?.toLowerCase().includes(query) ||
        product.category?.toLowerCase().includes(query) ||
        product.condition?.toLowerCase().includes(query);

      const matchesFilter =
        activeFilter === "all" ||
        (activeFilter === "sale" && product.isOnSale) ||
        (activeFilter === "stock" && Number(product.stock || 0) > 0) ||
        (activeFilter === "low" && Number(product.stock || 0) <= 5) ||
        (activeFilter === "empty" && Number(product.stock || 0) <= 0);

      return matchesQuery && matchesFilter;
    });
  }, [activeFilter, products, searchQuery]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProducts();
  };

  const openDiscountModal = (product) => {
    setSelectedProduct(product);
    setDiscountForm({
      discountPercentage: product.discountPercentage?.toString() || "",
      discountStartDate: product.discountStartDate
        ? new Date(product.discountStartDate)
        : null,
      discountEndDate: product.discountEndDate
        ? new Date(product.discountEndDate)
        : null,
    });
    setDiscountModalVisible(true);
  };

  const handleDiscountChange = (field, value) => {
    setDiscountForm((prev) => ({ ...prev, [field]: value }));
  };

  const formatDate = (date) => {
    if (!date) return "Select date";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const saveDiscount = async () => {
    if (!selectedProduct) return;

    const percentage = parseFloat(discountForm.discountPercentage || 0);
    if (!percentage || percentage <= 0 || percentage >= 100) {
      Alert.alert("Validation Error", "Enter a valid discount percentage.");
      return;
    }
    if (!discountForm.discountStartDate || !discountForm.discountEndDate) {
      Alert.alert(
        "Validation Error",
        "Select the discount start and end dates."
      );
      return;
    }
    if (discountForm.discountEndDate < discountForm.discountStartDate) {
      Alert.alert("Validation Error", "End date must be after the start date.");
      return;
    }

    setDiscountSaving(true);
    try {
      const token = await getToken();
      const originalPrice = parseFloat(selectedProduct.price || 0);
      const discountedPrice = (
        originalPrice -
        (originalPrice * percentage) / 100
      ).toFixed(2);

      const formDataToSend = new FormData();
      formDataToSend.append("name", selectedProduct.name || "");
      formDataToSend.append("price", originalPrice);
      formDataToSend.append("description", selectedProduct.description || "");
      formDataToSend.append("category", selectedProduct.category || "");
      formDataToSend.append("condition", selectedProduct.condition || "");
      formDataToSend.append("stock", parseInt(selectedProduct.stock || 0, 10));
      formDataToSend.append(
        "existingImages",
        JSON.stringify(selectedProduct.images || [])
      );
      formDataToSend.append("discountPercentage", percentage.toString());
      formDataToSend.append("discountedPrice", discountedPrice);
      formDataToSend.append(
        "discountStartDate",
        discountForm.discountStartDate.toISOString()
      );
      formDataToSend.append(
        "discountEndDate",
        discountForm.discountEndDate.toISOString()
      );

      await axios.put(
        `${BACKEND_URL}/api/v1/admin/products/${selectedProduct._id}`,
        formDataToSend,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setDiscountModalVisible(false);
      setDiscountSuccessVisible(true);
      fetchProducts();
    } catch (error) {
      Alert.alert("Error", "Failed to update listing discount");
    } finally {
      setDiscountSaving(false);
    }
  };

  const handleDelete = (product) => {
    setSelectedProduct(product);
    setArchiveModalVisible(true);
  };

  const confirmArchive = async () => {
    if (!selectedProduct) return;

    setArchiveLoading(true);
    try {
      const token = await getToken();
      await axios.delete(
        `${BACKEND_URL}/api/v1/admin/products/${selectedProduct._id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      fetchProducts();
      setArchiveModalVisible(false);
      setArchiveSuccessVisible(true);
    } catch (error) {
      Alert.alert("Error", "Failed to archive card listing");
    } finally {
      setArchiveLoading(false);
    }
  };

  const renderRightActions = (product) => (
    <View style={styles.swipeActions}>
      <TouchableOpacity
        style={[styles.swipeButton, styles.editButton]}
        onPress={() => navigation.navigate("UpdateProduct", { product })}
      >
        <Icon name="edit" size={20} color={adminColors.darkText} />
        <Text style={styles.editButtonText}>Edit</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.swipeButton, styles.deleteButton]}
        onPress={() => handleDelete(product)}
      >
        <Icon name="archive" size={20} color={adminColors.textPrimary} />
        <Text style={styles.deleteButtonText}>Archive</Text>
      </TouchableOpacity>
    </View>
  );

  const renderItem = ({ item }) => {
    const isDiscounted = Boolean(item.isOnSale && item.discountedPrice);
    const displayPrice = parseFloat(
      isDiscounted ? item.discountedPrice : item.price || 0
    ).toFixed(2);
    const originalPrice = isDiscounted
      ? parseFloat(item.price || 0).toFixed(2)
      : null;

    return (
      <Swipeable renderRightActions={() => renderRightActions(item)}>
        <TouchableOpacity
          style={styles.card}
          onPress={() =>
            navigation.navigate("ViewProduct", { productId: item._id })
          }
        >
          <Image
            source={{
              uri: item.images?.[0]?.url || "https://via.placeholder.com/100",
            }}
            style={styles.image}
          />
          <View style={styles.cardBody}>
            <View style={styles.cardTopRow}>
              <View style={styles.cardTopCopy}>
                <Text style={styles.cardEyebrow}>Marketplace Listing</Text>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {item.name}
                </Text>
              </View>
              <View style={styles.cardTopBadge}>
                {isDiscounted ? (
                  <View style={styles.discountFlag}>
                    <Text style={styles.discountFlagText}>Discounted</Text>
                  </View>
                ) : (
                  <Icon
                    name="chevron-right"
                    size={18}
                    color={adminColors.textMuted}
                  />
                )}
              </View>
            </View>
            {isDiscounted ? (
              <View style={styles.priceStack}>
                <Text style={styles.originalPrice}>PHP {originalPrice}</Text>
                <Text style={styles.price}>PHP {displayPrice}</Text>
              </View>
            ) : (
              <Text style={styles.price}>PHP {displayPrice}</Text>
            )}
            <View style={styles.chipRow}>
              <View style={styles.chip}>
                <Text style={styles.chipText}>
                  {item.category || "Uncategorized"}
                </Text>
              </View>
              <View style={styles.chip}>
                <Text style={styles.chipText}>
                  {item.condition || "Condition N/A"}
                </Text>
              </View>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaText}>
                Stock: <Text style={styles.metaValue}>{item.stock}</Text>
              </Text>
              <Text style={styles.metaText} numberOfLines={1}>
                Seller: {item.seller?.name || "Marketplace"}
              </Text>
            </View>

            <View style={styles.inlineActions}>
              <CardAction
                icon="visibility"
                label="View"
                onPress={() =>
                  navigation.navigate("ViewProduct", { productId: item._id })
                }
              />
              <CardAction
                icon="local-offer"
                label="Discount"
                accent="accent"
                onPress={() => openDiscountModal(item)}
              />
            </View>
          </View>
        </TouchableOpacity>
      </Swipeable>
    );
  };

  const renderCatalogHeader = () => (
    <View style={styles.heroCard}>
      <View style={styles.heroHeader}>
        <View style={styles.heroHeaderCopy}>
          <Text style={styles.heroEyebrow}>Admin Catalog</Text>
          <Text style={styles.heroTitle}>Card listings</Text>
        </View>
        <View style={styles.heroBadge}>
          <Icon name="style" size={16} color={adminColors.sparkle} />
        </View>
      </View>

      <View style={styles.metricRow}>
        <MetricIcon icon="inventory-2" label="Active" value={stats.total} />
        <MetricIcon
          icon="local-offer"
          label="On Sale"
          value={stats.onSale}
          accent="accent"
        />
        <MetricIcon
          icon="check-circle"
          label="In Stock"
          value={stats.inStock}
          accent="soft"
        />
        <MetricIcon
          icon="warning-amber"
          label="Out"
          value={stats.outOfStock}
          accent="danger"
        />
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchWrap}>
          <Icon name="search" size={18} color={adminColors.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search listings, category, or condition"
            placeholderTextColor={adminColors.textMuted}
          />
        </View>
      </View>

      <View style={styles.filterRow}>
        <FilterChip
          label="All"
          active={activeFilter === "all"}
          onPress={() => setActiveFilter("all")}
        />
        <FilterChip
          label="On Sale"
          active={activeFilter === "sale"}
          onPress={() => setActiveFilter("sale")}
        />
        <FilterChip
          label="In Stock"
          active={activeFilter === "stock"}
          onPress={() => setActiveFilter("stock")}
        />
        <FilterChip
          label="Low Stock"
          active={activeFilter === "low"}
          onPress={() => setActiveFilter("low")}
        />
        <FilterChip
          label="Out"
          active={activeFilter === "empty"}
          onPress={() => setActiveFilter("empty")}
        />
      </View>
    </View>
  );

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          const { logout } = await import("../../../utils/helper");
          await logout();
        },
      },
    ]);
  };

  if (loadingProducts && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={adminColors.accentSoft} />
      </View>
    );
  }

  return (
    <AdminDrawer onLogout={handleLogout}>
      <View style={styles.container}>
        <FlatList
          data={filteredProducts}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={renderCatalogHeader}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={adminColors.accentSoft}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="style" size={72} color={adminColors.textMuted} />
              <Text style={styles.emptyText}>No card listings found</Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => navigation.navigate("CreateProduct")}
              >
                <Text style={styles.emptyButtonText}>Create Listing</Text>
              </TouchableOpacity>
            </View>
          }
        />

        <View style={styles.fabContainer}>
          <TouchableOpacity
            style={[styles.fab, styles.secondaryFab]}
            onPress={() => navigation.navigate("TrashProduct")}
          >
            <Icon name="archive" size={18} color={adminColors.textPrimary} />
            <Text style={styles.secondaryFabText}>Archive</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.fab, styles.primaryFab]}
            onPress={() => navigation.navigate("CreateProduct")}
          >
            <Icon name="add" size={20} color={adminColors.darkText} />
            <Text style={styles.primaryFabText}>New Listing</Text>
          </TouchableOpacity>
        </View>

        <Modal
          transparent
          animationType="fade"
          visible={archiveModalVisible}
          onRequestClose={() => {
            if (!archiveLoading) {
              setArchiveModalVisible(false);
              setSelectedProduct(null);
            }
          }}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalDangerIcon}>
                <Icon name="archive" size={22} color={adminColors.danger} />
              </View>
              <Text style={styles.modalTitle}>Archive listing</Text>
              <Text style={styles.modalText}>
                {selectedProduct?.name || "This card listing"} will be removed
                from the active marketplace and moved to archives.
              </Text>
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalSecondaryButton}
                  onPress={() => {
                    setArchiveModalVisible(false);
                    setSelectedProduct(null);
                  }}
                  disabled={archiveLoading}
                >
                  <Text style={styles.modalSecondaryText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalDangerButton}
                  onPress={confirmArchive}
                  disabled={archiveLoading}
                >
                  {archiveLoading ? (
                    <ActivityIndicator color={adminColors.textPrimary} />
                  ) : (
                    <Text style={styles.modalDangerText}>Archive</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          transparent
          animationType="fade"
          visible={archiveSuccessVisible}
          onRequestClose={() => setArchiveSuccessVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalSuccessIcon}>
                <Icon
                  name="check-circle"
                  size={24}
                  color={adminColors.darkText}
                />
              </View>
              <Text style={styles.modalTitle}>Listing archived</Text>
              <Text style={styles.modalText}>
                {selectedProduct?.name || "The card listing"} has been moved to
                the archive queue.
              </Text>
              <TouchableOpacity
                style={styles.modalPrimaryButton}
                onPress={() => {
                  setArchiveSuccessVisible(false);
                  setSelectedProduct(null);
                }}
              >
                <Text style={styles.modalPrimaryText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal
          transparent
          animationType="fade"
          visible={discountModalVisible}
          onRequestClose={() => {
            if (!discountSaving) {
              setDiscountModalVisible(false);
            }
          }}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalAccentIcon}>
                <Icon
                  name="local-offer"
                  size={22}
                  color={adminColors.darkText}
                />
              </View>
              <Text style={styles.modalTitle}>Set listing discount</Text>
              <Text style={styles.modalText}>
                Apply a focused promo to{" "}
                {selectedProduct?.name || "this listing"} without opening the
                full edit form.
              </Text>

              <Text style={styles.discountFieldLabel}>Discount Percentage</Text>
              <View style={styles.discountInputWrap}>
                <TextInput
                  style={styles.discountInput}
                  value={discountForm.discountPercentage}
                  onChangeText={(text) =>
                    handleDiscountChange(
                      "discountPercentage",
                      text.replace(/[^0-9.]/g, "")
                    )
                  }
                  placeholder="Enter percent"
                  placeholderTextColor={adminColors.textMuted}
                  keyboardType="decimal-pad"
                />
                <Text style={styles.discountSuffix}>%</Text>
              </View>

              <View style={styles.discountDateRow}>
                <TouchableOpacity
                  style={styles.discountDateButton}
                  onPress={() => setShowStartDatePicker(true)}
                >
                  <Text style={styles.discountDateLabel}>Start Date</Text>
                  <Text style={styles.discountDateValue}>
                    {formatDate(discountForm.discountStartDate)}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.discountDateButton}
                  onPress={() => setShowEndDatePicker(true)}
                >
                  <Text style={styles.discountDateLabel}>End Date</Text>
                  <Text style={styles.discountDateValue}>
                    {formatDate(discountForm.discountEndDate)}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalSecondaryButton}
                  onPress={() => setDiscountModalVisible(false)}
                  disabled={discountSaving}
                >
                  <Text style={styles.modalSecondaryText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalPrimaryButton}
                  onPress={saveDiscount}
                  disabled={discountSaving}
                >
                  {discountSaving ? (
                    <ActivityIndicator color={adminColors.darkText} />
                  ) : (
                    <Text style={styles.modalPrimaryText}>Save Discount</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {showStartDatePicker ? (
          <DateTimePicker
            value={discountForm.discountStartDate || new Date()}
            mode="date"
            display="default"
            onChange={(_, selectedDate) => {
              setShowStartDatePicker(false);
              if (selectedDate) {
                handleDiscountChange("discountStartDate", selectedDate);
              }
            }}
          />
        ) : null}

        {showEndDatePicker ? (
          <DateTimePicker
            value={discountForm.discountEndDate || new Date()}
            mode="date"
            display="default"
            onChange={(_, selectedDate) => {
              setShowEndDatePicker(false);
              if (selectedDate) {
                handleDiscountChange("discountEndDate", selectedDate);
              }
            }}
          />
        ) : null}

        <Modal
          transparent
          animationType="fade"
          visible={discountSuccessVisible}
          onRequestClose={() => setDiscountSuccessVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalSuccessIcon}>
                <Icon
                  name="check-circle"
                  size={24}
                  color={adminColors.darkText}
                />
              </View>
              <Text style={styles.modalTitle}>Discount updated</Text>
              <Text style={styles.modalText}>
                {selectedProduct?.name || "The listing"} now has an active sale
                schedule.
              </Text>
              <TouchableOpacity
                style={styles.modalPrimaryButton}
                onPress={() => {
                  setDiscountSuccessVisible(false);
                  setSelectedProduct(null);
                }}
              >
                <Text style={styles.modalPrimaryText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </AdminDrawer>
  );
}

function MetricIcon({ icon, label, value, accent = "primary" }) {
  return (
    <View style={styles.metricIconItem}>
      <View
        style={[
          styles.metricIconWrap,
          accent === "accent" && styles.metricIconWrapAccent,
          accent === "soft" && styles.metricIconWrapSoft,
          accent === "danger" && styles.metricIconWrapDanger,
        ]}
      >
        <Icon
          name={icon}
          size={15}
          color={
            accent === "accent"
              ? adminColors.accentSoft
              : accent === "soft"
              ? adminColors.textSoft
              : accent === "danger"
              ? adminColors.danger
              : adminColors.sparkle
          }
        />
        <Text
          style={[
            styles.metricIconValue,
            accent === "accent" && styles.metricIconValueAccent,
            accent === "soft" && styles.metricIconValueSoft,
            accent === "danger" && styles.metricIconValueDanger,
          ]}
        >
          {value}
        </Text>
      </View>
      <Text style={styles.metricIconLabel}>{label}</Text>
    </View>
  );
}

function FilterChip({ label, active, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.filterChip, active && styles.filterChipActive]}
      onPress={onPress}
    >
      <Text
        style={[styles.filterChipText, active && styles.filterChipTextActive]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function CardAction({ icon, label, onPress, accent = "default" }) {
  return (
    <TouchableOpacity
      style={[
        styles.cardAction,
        accent === "accent" && styles.cardActionAccent,
      ]}
      onPress={onPress}
    >
      <Icon
        name={icon}
        size={14}
        color={
          accent === "accent" ? adminColors.darkText : adminColors.textPrimary
        }
      />
      <Text
        style={[
          styles.cardActionText,
          accent === "accent" && styles.cardActionTextAccent,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: adminColors.background },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: adminColors.background,
  },
  heroCard: {
    marginTop: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 22,
    backgroundColor: adminColors.panel,
    borderWidth: 1,
    borderColor: adminColors.surfaceBorder,
    ...adminShadow,
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  heroHeaderCopy: {
    flex: 1,
  },
  heroEyebrow: {
    color: adminColors.sparkle,
    fontFamily: adminFonts.semibold,
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 2,
  },
  heroTitle: {
    color: adminColors.textPrimary,
    fontFamily: adminFonts.bold,
    fontSize: 18,
  },
  heroBadge: {
    width: 34,
    height: 34,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: adminColors.backgroundSoft,
  },
  metricRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
    marginTop: 10,
  },
  metricIconItem: {
    flex: 1,
    alignItems: "center",
  },
  metricIconWrap: {
    width: "100%",
    maxWidth: 72,
    height: 44,
    borderRadius: 14,
    backgroundColor: adminColors.backgroundSoft,
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
    paddingHorizontal: 4,
  },
  metricIconWrapAccent: {
    backgroundColor: "rgba(240, 154, 134, 0.12)",
  },
  metricIconWrapSoft: {
    backgroundColor: "rgba(242, 184, 154, 0.12)",
  },
  metricIconWrapDanger: {
    backgroundColor: "rgba(224, 122, 106, 0.12)",
  },
  metricIconValue: {
    color: adminColors.sparkle,
    fontFamily: adminFonts.bold,
    fontSize: 12,
  },
  metricIconValueAccent: {
    color: adminColors.accentSoft,
  },
  metricIconValueSoft: {
    color: adminColors.textSoft,
  },
  metricIconValueDanger: {
    color: adminColors.danger,
  },
  metricIconLabel: {
    marginTop: 4,
    color: adminColors.textMuted,
    fontFamily: adminFonts.regular,
    fontSize: 9,
  },
  searchRow: {
    marginTop: 10,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 15,
    backgroundColor: adminColors.backgroundSoft,
    borderWidth: 1,
    borderColor: adminColors.surfaceBorder,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    height: 44,
    color: adminColors.textPrimary,
    fontFamily: adminFonts.regular,
    fontSize: 14,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
  },
  filterChip: {
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
    backgroundColor: adminColors.backgroundSoft,
  },
  filterChipActive: {
    backgroundColor: adminColors.accentSoft,
  },
  filterChipText: {
    color: adminColors.textPrimary,
    fontFamily: adminFonts.semibold,
    fontSize: 10,
  },
  filterChipTextActive: {
    color: adminColors.darkText,
  },
  listContent: { paddingHorizontal: 16, paddingBottom: 108 },
  card: {
    flexDirection: "row",
    padding: 13,
    marginBottom: 12,
    borderRadius: 22,
    backgroundColor: adminColors.panel,
    borderWidth: 1,
    borderColor: adminColors.surfaceBorder,
  },
  image: {
    width: 74,
    height: 74,
    borderRadius: 15,
    marginRight: 12,
    backgroundColor: adminColors.backgroundSoft,
  },
  cardBody: { flex: 1 },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  cardTopCopy: {
    flex: 1,
  },
  cardEyebrow: {
    color: adminColors.sparkle,
    fontFamily: adminFonts.semibold,
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  cardTitle: {
    marginRight: 6,
    color: adminColors.textPrimary,
    fontFamily: adminFonts.bold,
    fontSize: 15,
  },
  cardTopBadge: {
    minWidth: 34,
    minHeight: 34,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: adminColors.backgroundSoft,
    paddingHorizontal: 6,
  },
  price: {
    color: adminColors.accentSoft,
    fontFamily: adminFonts.bold,
    fontSize: 17,
  },
  priceStack: {
    marginTop: 5,
  },
  originalPrice: {
    color: adminColors.textMuted,
    fontFamily: adminFonts.regular,
    fontSize: 12,
    textDecorationLine: "line-through",
    marginBottom: 2,
  },
  discountFlag: {
    borderRadius: 999,
    backgroundColor: adminColors.accentSoft,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  discountFlagText: {
    color: adminColors.darkText,
    fontFamily: adminFonts.bold,
    fontSize: 9,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  chip: {
    backgroundColor: adminColors.chip,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  chipText: {
    color: adminColors.textPrimary,
    fontFamily: adminFonts.semibold,
    fontSize: 10,
  },
  metaRow: { marginTop: 8, gap: 3 },
  metaText: {
    color: adminColors.textMuted,
    fontFamily: adminFonts.regular,
    fontSize: 11,
  },
  metaValue: {
    color: adminColors.textPrimary,
    fontFamily: adminFonts.semibold,
  },
  inlineActions: {
    flexDirection: "row",
    gap: 7,
    marginTop: 10,
  },
  cardAction: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 13,
    backgroundColor: adminColors.backgroundSoft,
    paddingVertical: 9,
  },
  cardActionAccent: {
    backgroundColor: adminColors.accentSoft,
  },
  cardActionText: {
    color: adminColors.textPrimary,
    fontFamily: adminFonts.semibold,
    fontSize: 11,
  },
  cardActionTextAccent: {
    color: adminColors.darkText,
  },
  swipeActions: {
    flexDirection: "row",
    alignItems: "stretch",
    marginBottom: 12,
  },
  swipeButton: {
    width: 88,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    marginLeft: 8,
    paddingVertical: 12,
  },
  editButton: { backgroundColor: adminColors.accentSoft },
  deleteButton: { backgroundColor: adminColors.danger },
  editButtonText: {
    marginTop: 6,
    color: adminColors.darkText,
    fontFamily: adminFonts.semibold,
    fontSize: 12,
  },
  deleteButtonText: {
    marginTop: 6,
    color: adminColors.textPrimary,
    fontFamily: adminFonts.semibold,
    fontSize: 12,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 72,
    paddingHorizontal: 24,
  },
  emptyText: {
    marginTop: 12,
    marginBottom: 20,
    color: adminColors.textMuted,
    fontFamily: adminFonts.regular,
    fontSize: 15,
  },
  emptyButton: {
    backgroundColor: adminColors.accentSoft,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  emptyButtonText: {
    color: adminColors.darkText,
    fontFamily: adminFonts.semibold,
    fontSize: 14,
  },
  fabContainer: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    pointerEvents: "box-none",
  },
  fab: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 13,
    minWidth: 132,
    ...adminShadow,
  },
  secondaryFab: {
    backgroundColor: adminColors.panelElevated,
    borderWidth: 1,
    borderColor: adminColors.surfaceBorder,
  },
  primaryFab: { backgroundColor: adminColors.accentSoft },
  secondaryFabText: {
    marginLeft: 8,
    color: adminColors.textPrimary,
    fontFamily: adminFonts.semibold,
    fontSize: 14,
  },
  primaryFabText: {
    marginLeft: 8,
    color: adminColors.darkText,
    fontFamily: adminFonts.semibold,
    fontSize: 14,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 10, 9, 0.72)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    width: "100%",
    borderRadius: 24,
    backgroundColor: adminColors.panel,
    borderWidth: 1,
    borderColor: adminColors.surfaceBorder,
    padding: 22,
    ...adminShadow,
  },
  modalDangerIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(224, 122, 106, 0.14)",
    marginBottom: 14,
  },
  modalSuccessIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: adminColors.sparkle,
    marginBottom: 14,
  },
  modalAccentIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: adminColors.accentSoft,
    marginBottom: 14,
  },
  modalTitle: {
    color: adminColors.textPrimary,
    fontFamily: adminFonts.bold,
    fontSize: 20,
  },
  modalText: {
    marginTop: 8,
    color: adminColors.textMuted,
    fontFamily: adminFonts.regular,
    fontSize: 13,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  modalSecondaryButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: adminColors.backgroundSoft,
    borderRadius: 16,
    paddingVertical: 13,
  },
  modalSecondaryText: {
    color: adminColors.textPrimary,
    fontFamily: adminFonts.semibold,
    fontSize: 14,
  },
  modalDangerButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: adminColors.danger,
    borderRadius: 16,
    paddingVertical: 13,
  },
  modalDangerText: {
    color: adminColors.textPrimary,
    fontFamily: adminFonts.bold,
    fontSize: 14,
  },
  modalPrimaryButton: {
    marginTop: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: adminColors.accentSoft,
    borderRadius: 16,
    paddingVertical: 14,
  },
  modalPrimaryText: {
    color: adminColors.darkText,
    fontFamily: adminFonts.bold,
    fontSize: 14,
  },
  discountFieldLabel: {
    marginTop: 6,
    marginBottom: 8,
    color: adminColors.textMuted,
    fontFamily: adminFonts.semibold,
    fontSize: 12,
  },
  discountInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    backgroundColor: adminColors.backgroundSoft,
    borderWidth: 1,
    borderColor: adminColors.surfaceBorder,
    paddingHorizontal: 14,
  },
  discountInput: {
    flex: 1,
    height: 48,
    color: adminColors.textPrimary,
    fontFamily: adminFonts.regular,
    fontSize: 14,
  },
  discountSuffix: {
    color: adminColors.textMuted,
    fontFamily: adminFonts.semibold,
    fontSize: 14,
  },
  discountDateRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  discountDateButton: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: adminColors.backgroundSoft,
    borderWidth: 1,
    borderColor: adminColors.surfaceBorder,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  discountDateLabel: {
    color: adminColors.textMuted,
    fontFamily: adminFonts.regular,
    fontSize: 11,
    marginBottom: 6,
  },
  discountDateValue: {
    color: adminColors.textPrimary,
    fontFamily: adminFonts.semibold,
    fontSize: 13,
  },
});
