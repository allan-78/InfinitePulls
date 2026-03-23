import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import { MaterialIcons as Icon } from "@expo/vector-icons";
import { getToken } from "../../../utils/helper";
import AdminDrawer from "../AdminDrawer";
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

export default function CreateProductScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showConditionModal, setShowConditionModal] = useState(false);
  const [showImageSourceModal, setShowImageSourceModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    description: "",
    category: "",
    condition: "",
    stock: "1",
  });

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
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

    if (images.length + uploadedImages.length > 5) {
      Alert.alert("Limit exceeded", "Maximum 5 card photos allowed.");
      return;
    }

    setImages((prev) => [...prev, ...uploadedImages]);
  };

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, idx) => idx !== index));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      Alert.alert("Validation Error", "Card name is required.");
      return false;
    }
    if (!formData.price || parseFloat(formData.price) <= 0) {
      Alert.alert("Validation Error", "Valid listing price is required.");
      return false;
    }
    if (!formData.description.trim()) {
      Alert.alert("Validation Error", "Card description is required.");
      return false;
    }
    if (!formData.category) {
      Alert.alert("Validation Error", "Please select a card category.");
      return false;
    }
    if (!formData.condition) {
      Alert.alert("Validation Error", "Please select a card condition.");
      return false;
    }
    if (!formData.stock || parseInt(formData.stock, 10) < 0) {
      Alert.alert("Validation Error", "Valid quantity is required.");
      return false;
    }
    if (!images.length) {
      Alert.alert("Validation Error", "At least one card photo is required.");
      return false;
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

      images.forEach((image, index) => {
        formDataToSend.append("images", {
          uri: image.uri,
          type: "image/jpeg",
          name: image.name || `card_${Date.now()}_${index}.jpg`,
        });
      });

      await axios.post(`${BACKEND_URL}/api/v1/admin/products`, formDataToSend, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
        timeout: 30000,
      });

      setShowSuccessModal(true);
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || "Failed to create card listing.";
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
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={18} color={adminColors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.eyebrow}>Admin Listing Studio</Text>
          <Text style={styles.heroTitle}>Create card listing</Text>
          <Text style={styles.heroSubtitle}>
            Build a clean marketplace entry with card details, stock, category,
            condition, and photos.
          </Text>
        </View>

        <SectionCard title="Core details">
          <FieldLabel label="Card Name *" />
          <StyledInput
            value={formData.name}
            onChangeText={(text) => handleInputChange("name", text)}
            placeholder="Enter card name"
          />

          <FieldLabel label="Listing Price *" />
          <StyledInput
            value={formData.price}
            onChangeText={(text) =>
              handleInputChange("price", text.replace(/[^0-9.]/g, ""))
            }
            placeholder="Enter listing price"
            keyboardType="decimal-pad"
          />

          <FieldLabel label="Description *" />
          <StyledInput
            value={formData.description}
            onChangeText={(text) => handleInputChange("description", text)}
            placeholder="Describe the card, set, rarity, or notes"
            multiline
            numberOfLines={5}
            inputStyle={styles.textArea}
          />
        </SectionCard>

        <SectionCard title="Catalog tags">
          <FieldLabel label="Card Category *" />
          <SelectButton
            value={formData.category}
            placeholder="Select card category"
            onPress={() => setShowCategoryModal(true)}
          />

          <FieldLabel label="Condition *" />
          <SelectButton
            value={formData.condition}
            placeholder="Select card condition"
            onPress={() => setShowConditionModal(true)}
          />

          <FieldLabel label="Quantity *" />
          <StyledInput
            value={formData.stock}
            onChangeText={(text) =>
              handleInputChange("stock", text.replace(/[^0-9]/g, ""))
            }
            placeholder="Enter quantity"
            keyboardType="number-pad"
          />
        </SectionCard>

        <SectionCard title="Card photos">
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={() => setShowImageSourceModal(true)}
          >
            <Icon name="add-a-photo" size={22} color={adminColors.accentSoft} />
            <Text style={styles.uploadButtonText}>Add card photos</Text>
            <Text style={styles.uploadButtonHint}>Up to 5 images</Text>
          </TouchableOpacity>

          {images.length ? (
            <>
              <FlatList
                horizontal
                data={images}
                keyExtractor={(_, index) => `new-image-${index}`}
                renderItem={({ item, index }) => (
                  <View style={styles.imageCard}>
                    <Image
                      source={{ uri: item.uri }}
                      style={styles.imagePreview}
                    />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => removeImage(index)}
                    >
                      <Icon
                        name="close"
                        size={18}
                        color={adminColors.textPrimary}
                      />
                    </TouchableOpacity>
                  </View>
                )}
                contentContainerStyle={styles.imageList}
                showsHorizontalScrollIndicator={false}
              />
              <Text style={styles.imageCounter}>
                {images.length}/5 photos ready
              </Text>
            </>
          ) : (
            <Text style={styles.emptyImageText}>
              No images added yet. Add clear pack photos before publishing.
            </Text>
          )}
        </SectionCard>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.goBack()}
            disabled={loading}
          >
            <Text style={styles.secondaryButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={adminColors.darkText} />
            ) : (
              <>
                <Icon
                  name="check-circle"
                  size={16}
                  color={adminColors.darkText}
                />
                <Text style={styles.primaryButtonText}>Create Listing</Text>
              </>
            )}
          </TouchableOpacity>
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
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Add card photos</Text>
              <Text style={styles.modalText}>
                Choose how you want to attach marketplace images.
              </Text>
              <TouchableOpacity
                style={styles.modalOption}
                onPress={requestCameraImage}
              >
                <Icon
                  name="photo-camera"
                  size={18}
                  color={adminColors.accentSoft}
                />
                <Text style={styles.modalOptionText}>Use camera</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalOption}
                onPress={requestGalleryImages}
              >
                <Icon
                  name="photo-library"
                  size={18}
                  color={adminColors.accentSoft}
                />
                <Text style={styles.modalOptionText}>Choose from gallery</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowImageSourceModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
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
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.successIconWrap}>
                <Icon
                  name="check-circle"
                  size={24}
                  color={adminColors.darkText}
                />
              </View>
              <Text style={styles.modalTitle}>Listing created</Text>
              <Text style={styles.modalText}>
                {formData.name || "Your card listing"} is now ready for the
                marketplace queue.
              </Text>
              <TouchableOpacity
                style={styles.modalPrimaryButton}
                onPress={() => navigation.navigate("ProductList")}
              >
                <Text style={styles.modalPrimaryButtonText}>
                  Back to Listings
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </AdminDrawer>
  );
}

function SectionCard({ title, children }) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function FieldLabel({ label }) {
  return <Text style={styles.fieldLabel}>{label}</Text>;
}

function StyledInput({ inputStyle, ...props }) {
  return (
    <TextInput
      style={[styles.input, inputStyle]}
      placeholderTextColor={adminColors.textMuted}
      {...props}
    />
  );
}

function SelectButton({ value, placeholder, onPress }) {
  return (
    <TouchableOpacity style={styles.selectButton} onPress={onPress}>
      <Text style={value ? styles.selectValue : styles.selectPlaceholder}>
        {value || placeholder}
      </Text>
      <Icon name="expand-more" size={20} color={adminColors.textMuted} />
    </TouchableOpacity>
  );
}

function SelectorModal({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
}) {
  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{title}</Text>
          <FlatList
            data={options}
            keyExtractor={(item) => item}
            renderItem={({ item }) => {
              const isSelected = selected === item;
              return (
                <TouchableOpacity
                  style={[
                    styles.selectorItem,
                    isSelected && styles.selectorItemSelected,
                  ]}
                  onPress={() => {
                    onSelect(item);
                    onClose();
                  }}
                >
                  <Text
                    style={[
                      styles.selectorItemText,
                      isSelected && styles.selectorItemTextSelected,
                    ]}
                  >
                    {item}
                  </Text>
                  {isSelected ? (
                    <Icon
                      name="check-circle"
                      size={18}
                      color={adminColors.sparkle}
                    />
                  ) : null}
                </TouchableOpacity>
              );
            }}
            showsVerticalScrollIndicator={false}
          />
          <TouchableOpacity style={styles.modalCancelButton} onPress={onClose}>
            <Text style={styles.modalCancelText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: adminColors.background,
  },
  contentContainer: {
    paddingBottom: 26,
  },
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
  sectionCard: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 16,
    borderRadius: 22,
    backgroundColor: adminColors.panel,
    borderWidth: 1,
    borderColor: adminColors.surfaceBorder,
  },
  sectionTitle: {
    color: adminColors.textPrimary,
    fontFamily: adminFonts.bold,
    fontSize: 17,
    marginBottom: 14,
  },
  fieldLabel: {
    color: adminColors.textMuted,
    fontFamily: adminFonts.semibold,
    fontSize: 12,
    marginBottom: 8,
  },
  input: {
    backgroundColor: adminColors.backgroundSoft,
    borderWidth: 1,
    borderColor: adminColors.surfaceBorder,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: adminColors.textPrimary,
    fontFamily: adminFonts.regular,
    fontSize: 14,
    marginBottom: 14,
  },
  textArea: {
    minHeight: 118,
    textAlignVertical: "top",
  },
  selectButton: {
    backgroundColor: adminColors.backgroundSoft,
    borderWidth: 1,
    borderColor: adminColors.surfaceBorder,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  selectPlaceholder: {
    color: adminColors.textMuted,
    fontFamily: adminFonts.regular,
    fontSize: 14,
  },
  selectValue: {
    color: adminColors.textPrimary,
    fontFamily: adminFonts.semibold,
    fontSize: 14,
  },
  uploadButton: {
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: adminColors.accentSoft,
    borderStyle: "dashed",
    backgroundColor: "rgba(240, 154, 134, 0.06)",
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 18,
  },
  uploadButtonText: {
    marginTop: 8,
    color: adminColors.textPrimary,
    fontFamily: adminFonts.bold,
    fontSize: 15,
  },
  uploadButtonHint: {
    marginTop: 4,
    color: adminColors.textMuted,
    fontFamily: adminFonts.regular,
    fontSize: 12,
  },
  imageList: {
    paddingTop: 14,
    gap: 10,
  },
  imageCard: {
    marginRight: 10,
    position: "relative",
  },
  imagePreview: {
    width: 92,
    height: 92,
    borderRadius: 18,
    backgroundColor: adminColors.backgroundSoft,
  },
  removeImageButton: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: adminColors.danger,
  },
  imageCounter: {
    marginTop: 10,
    color: adminColors.textMuted,
    fontFamily: adminFonts.regular,
    fontSize: 12,
  },
  emptyImageText: {
    marginTop: 12,
    color: adminColors.textMuted,
    fontFamily: adminFonts.regular,
    fontSize: 12,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginHorizontal: 16,
    marginTop: 10,
  },
  secondaryButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: adminColors.surfaceBorder,
    backgroundColor: adminColors.panel,
    paddingVertical: 15,
  },
  secondaryButtonText: {
    color: adminColors.textPrimary,
    fontFamily: adminFonts.semibold,
    fontSize: 14,
  },
  primaryButton: {
    flex: 1.2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 18,
    backgroundColor: adminColors.accentSoft,
    paddingVertical: 15,
  },
  primaryButtonText: {
    color: adminColors.darkText,
    fontFamily: adminFonts.bold,
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
    maxHeight: "80%",
    borderRadius: 24,
    backgroundColor: adminColors.panel,
    borderWidth: 1,
    borderColor: adminColors.surfaceBorder,
    padding: 22,
    ...adminShadow,
  },
  modalTitle: {
    color: adminColors.textPrimary,
    fontFamily: adminFonts.bold,
    fontSize: 20,
    marginBottom: 8,
  },
  modalText: {
    color: adminColors.textMuted,
    fontFamily: adminFonts.regular,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 14,
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 16,
    backgroundColor: adminColors.backgroundSoft,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 10,
  },
  modalOptionText: {
    color: adminColors.textPrimary,
    fontFamily: adminFonts.semibold,
    fontSize: 14,
  },
  modalCancelButton: {
    marginTop: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: adminColors.backgroundSoft,
    paddingVertical: 14,
  },
  modalCancelText: {
    color: adminColors.textPrimary,
    fontFamily: adminFonts.semibold,
    fontSize: 14,
  },
  selectorItem: {
    borderRadius: 16,
    backgroundColor: adminColors.backgroundSoft,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectorItemSelected: {
    borderWidth: 1,
    borderColor: adminColors.accentSoft,
    backgroundColor: "rgba(240, 154, 134, 0.12)",
  },
  selectorItemText: {
    color: adminColors.textPrimary,
    fontFamily: adminFonts.semibold,
    fontSize: 14,
  },
  selectorItemTextSelected: {
    color: adminColors.sparkle,
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
  modalPrimaryButton: {
    marginTop: 12,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: adminColors.accentSoft,
    paddingVertical: 14,
  },
  modalPrimaryButtonText: {
    color: adminColors.darkText,
    fontFamily: adminFonts.bold,
    fontSize: 14,
  },
});
