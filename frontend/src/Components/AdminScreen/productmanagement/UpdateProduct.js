import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Image,
  Modal,
  FlatList,
  Switch,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import { getToken } from "../../../utils/helper";
import { MaterialIcons as Icon } from "@expo/vector-icons";
import AdminDrawer from "../AdminDrawer";
import DateTimePicker from "@react-native-community/datetimepicker";
import { adminColors, adminFonts, adminShadow } from "../adminTheme";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const CARD_CATEGORIES = [
  "Sports",
  "Pokemon",
  "Magic: The Gathering",
  "Yu-Gi-Oh!",
  "One Piece",
  "Dragon Ball",
  "Weiss Schwarz",
  "Other TCG",
];

const CARD_CONDITIONS = ["Mint", "Near Mint", "Good", "Fair", "Poor"];

const SelectorModal = ({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
}) => (
  <Modal
    visible={visible}
    animationType="slide"
    transparent
    onRequestClose={onClose}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>{title}</Text>
        <FlatList
          data={options}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.optionItem,
                selected === item && styles.optionItemSelected,
              ]}
              onPress={() => {
                onSelect(item);
                onClose();
              }}
            >
              <Text
                style={[
                  styles.optionText,
                  selected === item && styles.optionTextSelected,
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          )}
        />
        <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
          <Text style={styles.modalCloseText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

export default function UpdateProductScreen({ navigation, route }) {
  const { product } = route.params;
  const [loading, setLoading] = useState(false);
  const [existingImages, setExistingImages] = useState([]);
  const [newImages, setNewImages] = useState([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showConditionModal, setShowConditionModal] = useState(false);
  const [showDiscountSection, setShowDiscountSection] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showImageSourceModal, setShowImageSourceModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    description: "",
    category: "",
    condition: "",
    stock: "",
    discountedPrice: "",
    discountPercentage: "",
    discountStartDate: null,
    discountEndDate: null,
  });

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || "",
        price: product.price?.toString() || "",
        description: product.description || "",
        category: product.category || "",
        condition: product.condition || "",
        stock: product.stock?.toString() || "",
        discountedPrice: product.discountedPrice?.toString() || "",
        discountPercentage: product.discountPercentage?.toString() || "",
        discountStartDate: product.discountStartDate
          ? new Date(product.discountStartDate)
          : null,
        discountEndDate: product.discountEndDate
          ? new Date(product.discountEndDate)
          : null,
      });
      setExistingImages(product.images || []);
      if (product.discountedPrice || product.discountPercentage) {
        setShowDiscountSection(true);
      }
    }
  }, [product]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const formatDate = (date) => {
    if (!date) return "Select date";
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const calculateDiscountedPrice = (price, percentage) => {
    if (!price || !percentage) return "";
    const discount = (parseFloat(price) * parseFloat(percentage)) / 100;
    return (parseFloat(price) - discount).toFixed(2);
  };

  const handleDiscountPercentageChange = (text) => {
    const cleaned = text.replace(/[^0-9.]/g, "");
    handleInputChange("discountPercentage", cleaned);
    handleInputChange(
      "discountedPrice",
      formData.price && cleaned
        ? calculateDiscountedPrice(formData.price, cleaned)
        : ""
    );
  };

  const requestCameraImage = async () => {
    setShowImageSourceModal(false);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Camera permissions are required.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets) {
      handleImageResult(result.assets);
    }
  };

  const requestGalleryImages = async () => {
    setShowImageSourceModal(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Gallery permissions are required.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets) {
      handleImageResult(result.assets);
    }
  };

  const handleImageResult = (assets) => {
    const uploadedImages = assets.map((asset, idx) => ({
      uri: asset.uri,
      type: "image/jpeg",
      name: `card_${Date.now()}_${idx}.jpg`,
    }));

    const totalImages =
      existingImages.length + newImages.length + uploadedImages.length;
    if (totalImages > 5) {
      Alert.alert("Limit Exceeded", "Maximum 5 card photos allowed");
      return;
    }

    setNewImages((prev) => [...prev, ...uploadedImages]);
  };

  const removeExistingImage = (index) => {
    setExistingImages((prev) => prev.filter((_, idx) => idx !== index));
  };

  const removeNewImage = (index) => {
    setNewImages((prev) => prev.filter((_, idx) => idx !== index));
  };

  const validateForm = () => {
    if (!formData.name.trim())
      return Alert.alert("Validation Error", "Card name is required"), false;
    if (!formData.price || parseFloat(formData.price) <= 0)
      return (
        Alert.alert("Validation Error", "Valid listing price is required"),
        false
      );
    if (!formData.description.trim())
      return (
        Alert.alert("Validation Error", "Card description is required"), false
      );
    if (!formData.category)
      return (
        Alert.alert("Validation Error", "Please select a card category"), false
      );
    if (!formData.condition)
      return (
        Alert.alert("Validation Error", "Please select a card condition"), false
      );
    if (!formData.stock || parseInt(formData.stock, 10) < 0)
      return (
        Alert.alert("Validation Error", "Valid quantity is required"), false
      );
    if (existingImages.length + newImages.length === 0)
      return (
        Alert.alert("Validation Error", "At least one card photo is required"),
        false
      );
    if (
      showDiscountSection &&
      formData.discountedPrice &&
      parseFloat(formData.discountedPrice) >= parseFloat(formData.price)
    ) {
      return (
        Alert.alert(
          "Validation Error",
          "Discounted price must be lower than the listing price"
        ),
        false
      );
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const token = await getToken();
      const formDataToSend = new FormData();
      formDataToSend.append("name", formData.name.trim());
      formDataToSend.append("price", parseFloat(formData.price));
      formDataToSend.append("description", formData.description.trim());
      formDataToSend.append("category", formData.category);
      formDataToSend.append("condition", formData.condition);
      formDataToSend.append("stock", parseInt(formData.stock, 10));
      formDataToSend.append("existingImages", JSON.stringify(existingImages));

      if (showDiscountSection) {
        formDataToSend.append(
          "discountedPrice",
          formData.discountedPrice || ""
        );
        formDataToSend.append(
          "discountPercentage",
          formData.discountPercentage || ""
        );
        formDataToSend.append(
          "discountStartDate",
          formData.discountStartDate
            ? formData.discountStartDate.toISOString()
            : ""
        );
        formDataToSend.append(
          "discountEndDate",
          formData.discountEndDate ? formData.discountEndDate.toISOString() : ""
        );
      } else {
        formDataToSend.append("discountedPrice", "");
        formDataToSend.append("discountPercentage", "");
        formDataToSend.append("discountStartDate", "");
        formDataToSend.append("discountEndDate", "");
      }

      newImages.forEach((image, index) => {
        formDataToSend.append("images", {
          uri: image.uri,
          type: "image/jpeg",
          name: image.name || `card_${Date.now()}_${index}.jpg`,
        });
      });

      await axios.put(
        `${BACKEND_URL}/api/v1/admin/products/${product._id}`,
        formDataToSend,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
          timeout: 30000,
        }
      );

      setShowSuccessModal(true);
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || "Failed to update card listing.";
      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <AdminDrawer onLogout={handleLogout}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.heroCard}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={18} color={adminColors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.eyebrow}>Admin Listing Studio</Text>
          <Text style={styles.heroTitle}>Edit card listing</Text>
          <Text style={styles.heroSubtitle}>
            Update details, replace photos, and control scheduled discounts from
            one admin panel.
          </Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.label}>Card Name *</Text>
          <TextInput
            style={styles.input}
            value={formData.name}
            onChangeText={(text) => handleInputChange("name", text)}
            placeholder="Enter card name"
          />

          <Text style={styles.label}>Listing Price *</Text>
          <TextInput
            style={styles.input}
            value={formData.price}
            onChangeText={(text) => handleInputChange("price", text)}
            placeholder="Enter listing price"
            keyboardType="decimal-pad"
          />

          <Text style={styles.label}>Description *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.description}
            onChangeText={(text) => handleInputChange("description", text)}
            placeholder="Describe the card, set, rarity, or notes"
            multiline
            numberOfLines={4}
          />

          <Text style={styles.label}>Card Category *</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowCategoryModal(true)}
          >
            <Text
              style={
                formData.category
                  ? styles.pickerTextSelected
                  : styles.pickerText
              }
            >
              {formData.category || "Select card category"}
            </Text>
            <Icon name="arrow-drop-down" size={24} color="#666" />
          </TouchableOpacity>

          <Text style={styles.label}>Condition *</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowConditionModal(true)}
          >
            <Text
              style={
                formData.condition
                  ? styles.pickerTextSelected
                  : styles.pickerText
              }
            >
              {formData.condition || "Select card condition"}
            </Text>
            <Icon name="arrow-drop-down" size={24} color="#666" />
          </TouchableOpacity>

          <Text style={styles.label}>Quantity *</Text>
          <TextInput
            style={styles.input}
            value={formData.stock}
            onChangeText={(text) => handleInputChange("stock", text)}
            placeholder="Enter quantity"
            keyboardType="numeric"
          />

          <View style={styles.discountHeader}>
            <Text style={styles.sectionTitle}>Discount / Promotion</Text>
            <Switch
              value={showDiscountSection}
              onValueChange={setShowDiscountSection}
              trackColor={{ false: "#ddd", true: "#3498db" }}
            />
          </View>

          {showDiscountSection && (
            <View style={styles.discountSection}>
              <Text style={styles.label}>Discount Percentage (%)</Text>
              <TextInput
                style={styles.input}
                value={formData.discountPercentage}
                onChangeText={handleDiscountPercentageChange}
                placeholder="Enter discount percentage"
                keyboardType="numeric"
              />

              <Text style={styles.label}>Discounted Price</Text>
              <TextInput
                style={styles.input}
                value={formData.discountedPrice}
                onChangeText={(text) =>
                  handleInputChange(
                    "discountedPrice",
                    text.replace(/[^0-9.]/g, "")
                  )
                }
                placeholder="Enter discounted price"
                keyboardType="decimal-pad"
              />

              <Text style={styles.label}>Discount Start Date</Text>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setShowStartDatePicker(true)}
              >
                <Text
                  style={
                    formData.discountStartDate
                      ? styles.dateText
                      : styles.datePlaceholder
                  }
                >
                  {formatDate(formData.discountStartDate)}
                </Text>
                <Icon name="calendar-today" size={20} color="#666" />
              </TouchableOpacity>

              {showStartDatePicker && (
                <DateTimePicker
                  value={formData.discountStartDate || new Date()}
                  mode="date"
                  display="default"
                  onChange={(_, selectedDate) => {
                    setShowStartDatePicker(false);
                    if (selectedDate)
                      handleInputChange("discountStartDate", selectedDate);
                  }}
                />
              )}

              <Text style={styles.label}>Discount End Date</Text>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setShowEndDatePicker(true)}
              >
                <Text
                  style={
                    formData.discountEndDate
                      ? styles.dateText
                      : styles.datePlaceholder
                  }
                >
                  {formatDate(formData.discountEndDate)}
                </Text>
                <Icon name="calendar-today" size={20} color="#666" />
              </TouchableOpacity>

              {showEndDatePicker && (
                <DateTimePicker
                  value={formData.discountEndDate || new Date()}
                  mode="date"
                  display="default"
                  onChange={(_, selectedDate) => {
                    setShowEndDatePicker(false);
                    if (selectedDate)
                      handleInputChange("discountEndDate", selectedDate);
                  }}
                />
              )}
            </View>
          )}

          <Text style={styles.label}>Card Photos * (Max 5 total)</Text>

          {existingImages.length > 0 && (
            <View style={styles.imageSection}>
              <Text style={styles.sectionSubtitle}>Current Photos</Text>
              <FlatList
                horizontal
                data={existingImages}
                keyExtractor={(item, index) => `existing-${index}`}
                renderItem={({ item, index }) => (
                  <View style={styles.imagePreview}>
                    <Image
                      source={{ uri: item.url }}
                      style={styles.previewImage}
                    />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => removeExistingImage(index)}
                    >
                      <Icon name="close" size={20} color="white" />
                    </TouchableOpacity>
                  </View>
                )}
                contentContainerStyle={styles.imageList}
              />
            </View>
          )}

          <TouchableOpacity
            style={styles.imageUploadButton}
            onPress={() => setShowImageSourceModal(true)}
          >
            <Icon name="add-a-photo" size={24} color="#3498db" />
            <Text style={styles.imageUploadText}>Add More Card Photos</Text>
          </TouchableOpacity>

          {newImages.length > 0 && (
            <View style={styles.imageSection}>
              <Text style={styles.sectionSubtitle}>New Photos</Text>
              <FlatList
                horizontal
                data={newImages}
                keyExtractor={(item, index) => `new-${index}`}
                renderItem={({ item, index }) => (
                  <View style={styles.imagePreview}>
                    <Image
                      source={{ uri: item.uri }}
                      style={styles.previewImage}
                    />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => removeNewImage(index)}
                    >
                      <Icon name="close" size={20} color="white" />
                    </TouchableOpacity>
                  </View>
                )}
                contentContainerStyle={styles.imageList}
              />
            </View>
          )}

          <Text style={styles.imageCount}>
            Total: {existingImages.length + newImages.length}/5 photos
          </Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => navigation.goBack()}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={adminColors.darkText} />
              ) : (
                <Text style={styles.submitButtonText}>Save Listing</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <SelectorModal
          visible={showCategoryModal}
          title="Select Card Category"
          options={CARD_CATEGORIES}
          selected={formData.category}
          onSelect={(item) => handleInputChange("category", item)}
          onClose={() => setShowCategoryModal(false)}
        />

        <SelectorModal
          visible={showConditionModal}
          title="Select Card Condition"
          options={CARD_CONDITIONS}
          selected={formData.condition}
          onSelect={(item) => handleInputChange("condition", item)}
          onClose={() => setShowConditionModal(false)}
        />

        <Modal
          transparent
          animationType="fade"
          visible={showImageSourceModal}
          onRequestClose={() => setShowImageSourceModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Update card photos</Text>
              <Text style={styles.modalDescription}>
                Choose where to attach refreshed marketplace images from.
              </Text>
              <TouchableOpacity
                style={styles.mediaOption}
                onPress={requestCameraImage}
              >
                <Icon
                  name="photo-camera"
                  size={18}
                  color={adminColors.accentSoft}
                />
                <Text style={styles.mediaOptionText}>Use camera</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.mediaOption}
                onPress={requestGalleryImages}
              >
                <Icon
                  name="photo-library"
                  size={18}
                  color={adminColors.accentSoft}
                />
                <Text style={styles.mediaOptionText}>Choose from gallery</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowImageSourceModal(false)}
              >
                <Text style={styles.modalCloseText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal
          transparent
          animationType="fade"
          visible={showSuccessModal}
          onRequestClose={() => setShowSuccessModal(false)}
        >
          <View style={styles.successOverlay}>
            <View style={styles.successCard}>
              <View style={styles.successIconWrap}>
                <Icon
                  name="check-circle"
                  size={24}
                  color={adminColors.darkText}
                />
              </View>
              <Text style={styles.successTitle}>Listing updated</Text>
              <Text style={styles.successText}>
                {formData.name || "Your card listing"} has been refreshed with
                the latest details and promotion settings.
              </Text>
              <TouchableOpacity
                style={styles.successButton}
                onPress={() => {
                  setShowSuccessModal(false);
                  navigation.goBack();
                }}
              >
                <Text style={styles.successButtonText}>Back to Details</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </AdminDrawer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: adminColors.background },
  contentContainer: { paddingBottom: 26 },
  heroCard: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    padding: 18,
    borderRadius: 24,
    backgroundColor: adminColors.panel,
    borderWidth: 1,
    borderColor: adminColors.surfaceBorder,
    ...adminShadow,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: adminColors.backgroundSoft,
    marginBottom: 14,
  },
  eyebrow: {
    color: adminColors.sparkle,
    fontFamily: adminFonts.semibold,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  heroTitle: {
    color: adminColors.textPrimary,
    fontFamily: adminFonts.bold,
    fontSize: 24,
  },
  heroSubtitle: {
    marginTop: 6,
    color: adminColors.textMuted,
    fontFamily: adminFonts.regular,
    fontSize: 13,
    lineHeight: 20,
  },
  formCard: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 16,
    borderRadius: 22,
    backgroundColor: adminColors.panel,
    borderWidth: 1,
    borderColor: adminColors.surfaceBorder,
  },
  label: {
    fontSize: 12,
    marginBottom: 8,
    color: adminColors.textMuted,
    fontFamily: adminFonts.semibold,
  },
  input: {
    backgroundColor: adminColors.backgroundSoft,
    borderWidth: 1,
    borderColor: adminColors.surfaceBorder,
    borderRadius: 16,
    padding: 14,
    marginBottom: 15,
    fontSize: 14,
    color: adminColors.textPrimary,
    fontFamily: adminFonts.regular,
  },
  textArea: { height: 100, textAlignVertical: "top" },
  pickerButton: {
    backgroundColor: adminColors.backgroundSoft,
    borderWidth: 1,
    borderColor: adminColors.surfaceBorder,
    borderRadius: 16,
    padding: 14,
    marginBottom: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pickerText: {
    fontSize: 14,
    color: adminColors.textMuted,
    fontFamily: adminFonts.regular,
  },
  pickerTextSelected: {
    fontSize: 14,
    color: adminColors.textPrimary,
    fontFamily: adminFonts.semibold,
  },
  discountHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
    paddingVertical: 10,
  },
  sectionTitle: {
    fontSize: 16,
    color: adminColors.textPrimary,
    fontFamily: adminFonts.bold,
  },
  discountSection: {
    backgroundColor: adminColors.backgroundSoft,
    padding: 15,
    borderRadius: 18,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: adminColors.surfaceBorder,
  },
  datePickerButton: {
    backgroundColor: adminColors.panel,
    borderWidth: 1,
    borderColor: adminColors.surfaceBorder,
    borderRadius: 16,
    padding: 14,
    marginBottom: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateText: {
    fontSize: 14,
    color: adminColors.textPrimary,
    fontFamily: adminFonts.regular,
  },
  datePlaceholder: {
    fontSize: 14,
    color: adminColors.textMuted,
    fontFamily: adminFonts.regular,
  },
  imageSection: { marginBottom: 15 },
  sectionSubtitle: {
    fontSize: 12,
    color: adminColors.textMuted,
    marginBottom: 5,
    fontFamily: adminFonts.regular,
  },
  imageUploadButton: {
    backgroundColor: "rgba(240, 154, 134, 0.06)",
    borderWidth: 1.5,
    borderColor: adminColors.accentSoft,
    borderStyle: "dashed",
    borderRadius: 18,
    padding: 18,
    alignItems: "center",
    marginBottom: 15,
  },
  imageUploadText: {
    color: adminColors.textPrimary,
    marginTop: 8,
    fontFamily: adminFonts.bold,
    fontSize: 14,
  },
  imageList: { paddingVertical: 10 },
  imagePreview: { position: "relative", marginRight: 10 },
  previewImage: {
    width: 88,
    height: 88,
    borderRadius: 18,
    backgroundColor: adminColors.backgroundSoft,
  },
  removeImageButton: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: adminColors.danger,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  imageCount: {
    fontSize: 12,
    color: adminColors.textMuted,
    textAlign: "center",
    marginBottom: 15,
    fontFamily: adminFonts.regular,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    marginBottom: 30,
  },
  cancelButton: {
    backgroundColor: adminColors.panelElevated,
    borderWidth: 1,
    borderColor: adminColors.surfaceBorder,
    padding: 15,
    borderRadius: 18,
    flex: 1,
    marginRight: 10,
    alignItems: "center",
  },
  cancelButtonText: {
    color: adminColors.textPrimary,
    fontFamily: adminFonts.semibold,
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: adminColors.accentSoft,
    padding: 15,
    borderRadius: 18,
    flex: 1,
    marginLeft: 10,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  submitButtonText: {
    color: adminColors.darkText,
    fontFamily: adminFonts.bold,
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 10, 9, 0.72)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalContent: {
    width: "100%",
    backgroundColor: adminColors.panel,
    borderRadius: 24,
    padding: 22,
    maxHeight: "80%",
    borderWidth: 1,
    borderColor: adminColors.surfaceBorder,
    ...adminShadow,
  },
  modalDescription: {
    color: adminColors.textMuted,
    fontFamily: adminFonts.regular,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 20,
    marginBottom: 14,
    textAlign: "left",
    color: adminColors.textPrimary,
    fontFamily: adminFonts.bold,
  },
  optionItem: {
    padding: 15,
    borderRadius: 16,
    backgroundColor: adminColors.backgroundSoft,
    marginBottom: 10,
  },
  optionItemSelected: {
    backgroundColor: "rgba(240, 154, 134, 0.12)",
    borderWidth: 1,
    borderColor: adminColors.accentSoft,
  },
  optionText: {
    fontSize: 14,
    color: adminColors.textPrimary,
    fontFamily: adminFonts.semibold,
  },
  optionTextSelected: {
    color: adminColors.sparkle,
    fontFamily: adminFonts.bold,
  },
  modalCloseButton: {
    backgroundColor: adminColors.backgroundSoft,
    padding: 15,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 10,
  },
  modalCloseText: {
    color: adminColors.textPrimary,
    fontFamily: adminFonts.semibold,
    fontSize: 14,
  },
  mediaOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 16,
    backgroundColor: adminColors.backgroundSoft,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 10,
  },
  mediaOptionText: {
    color: adminColors.textPrimary,
    fontFamily: adminFonts.semibold,
    fontSize: 14,
  },
  successOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 10, 9, 0.72)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  successCard: {
    width: "100%",
    backgroundColor: adminColors.panel,
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: adminColors.surfaceBorder,
    ...adminShadow,
  },
  successIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: adminColors.sparkle,
    marginBottom: 14,
  },
  successTitle: {
    color: adminColors.textPrimary,
    fontFamily: adminFonts.bold,
    fontSize: 20,
  },
  successText: {
    marginTop: 8,
    color: adminColors.textMuted,
    fontFamily: adminFonts.regular,
    fontSize: 13,
    lineHeight: 20,
  },
  successButton: {
    marginTop: 20,
    backgroundColor: adminColors.accentSoft,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  successButtonText: {
    color: adminColors.darkText,
    fontFamily: adminFonts.bold,
    fontSize: 14,
  },
});
