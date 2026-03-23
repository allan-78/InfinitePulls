// C&V PetShop/frontend/src/Components/Navigation/AppNavigator.js
import React, {
  useEffect,
  useState,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import { NavigationContainer } from "@react-navigation/native";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import axios from "axios";
import AuthenticationStack from "./AuthenticationStack";
import UserStack from "./UserStack";
import AdminStack from "./AdminStack";
import AuthSuccessTransition from "../AuthenticationScreen/AuthSuccessTransition";
import OrderNotification from "../UserScreen/Notification/OrderNotification";
import OrderDetails from "../UserScreen/Orders/OrderDetails";
import { registerForPushNotificationsAsync } from "../../hooks/usePushNotifications";
import {
  clearStoredAuth,
  getAppViewMode,
  getToken,
  getUser,
  notifyAuthChange,
  onAppViewModeChange,
  onAuthChange,
} from "../../utils/helper";
import { authColors } from "../../theme/authTheme";

const Stack = createNativeStackNavigator();
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// Use forwardRef to expose navigation methods to parent (App.js)
const AppNavigator = forwardRef((props, ref) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [navigationRef, setNavigationRef] = useState(null);
  const [showAuthSuccess, setShowAuthSuccess] = useState(false);
  const [appViewMode, setAppViewMode] = useState("user");
  const authSuccessTimerRef = useRef(null);
  const pushRegistrationTimerRef = useRef(null);
  const currentUserRef = useRef(null);

  const schedulePushRegistration = () => {
    if (pushRegistrationTimerRef.current) {
      clearTimeout(pushRegistrationTimerRef.current);
    }

    pushRegistrationTimerRef.current = setTimeout(async () => {
      try {
        await registerForPushNotificationsAsync();
      } catch (error) {
        console.log(
          "Push token registration retry skipped:",
          error?.message || error,
        );
      }
    }, 1800);
  };

  // Expose navigation methods to parent component
  useImperativeHandle(ref, () => ({
    navigate: (name, params) => {
      if (navigationRef) {
        navigationRef.navigate(name, params);
      }
    },
    getCurrentRoute: () => {
      if (navigationRef) {
        return navigationRef.getCurrentRoute();
      }
      return null;
    },
  }));

  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      try {
        const token = await getToken();
        if (!token) {
          if (isMounted) {
            currentUserRef.current = null;
            setUser(null);
          }
          return;
        }

        let currentUser = await getUser();
        let storedAppViewMode = await getAppViewMode();
        try {
          const response = await axios.get(`${BACKEND_URL}/api/v1/users/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const validatedUser = response.data.user || response.data;
          currentUser = {
            name: validatedUser.name,
            email: validatedUser.email,
            role: validatedUser.role,
            id: validatedUser._id || validatedUser.id,
          };
          if (validatedUser.role !== "admin") {
            storedAppViewMode = "user";
          } else if (!["admin", "user"].includes(storedAppViewMode)) {
            storedAppViewMode = "admin";
          }
        } catch (validationError) {
          if ([401, 403].includes(validationError.response?.status)) {
            await clearStoredAuth();
            notifyAuthChange(null);
            currentUser = null;
            storedAppViewMode = "user";
          } else {
            throw validationError;
          }
        }

        if (isMounted) {
          console.log("Initial user loaded:", currentUser);
          currentUserRef.current = currentUser;
          setUser(currentUser);
          setAppViewMode(storedAppViewMode);
          if (currentUser) {
            schedulePushRegistration();
          }
        }
      } catch (error) {
        console.error("Error loading user:", error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadUser();

    // Listen for authentication changes
    const unsubscribe = onAuthChange((updatedUser) => {
      console.log("Auth state changed:", updatedUser);
      if (isMounted) {
        if (!currentUserRef.current && updatedUser) {
          setShowAuthSuccess(true);

          if (authSuccessTimerRef.current) {
            clearTimeout(authSuccessTimerRef.current);
          }

          authSuccessTimerRef.current = setTimeout(() => {
            setShowAuthSuccess(false);
          }, 1400);
        }

        currentUserRef.current = updatedUser;
        setUser(updatedUser);
        if (updatedUser) {
          schedulePushRegistration();
        }
        setAppViewMode((currentMode) => {
          if (!updatedUser) {
            return "user";
          }

          if (updatedUser.role !== "admin") {
            return "user";
          }

          return currentMode === "user" ? "user" : "admin";
        });
      }
    });

    const unsubscribeAppMode = onAppViewModeChange((mode) => {
      if (isMounted) {
        setAppViewMode(mode);
      }
    });

    return () => {
      isMounted = false;
      if (authSuccessTimerRef.current) {
        clearTimeout(authSuccessTimerRef.current);
      }
      if (pushRegistrationTimerRef.current) {
        clearTimeout(pushRegistrationTimerRef.current);
      }
      unsubscribe();
      unsubscribeAppMode();
    };
  }, []);

  // Function to render the appropriate stack based on user role
  const MainAppScreen = !user
    ? AuthenticationStack
    : user.role === "admin"
      ? appViewMode === "user"
        ? UserStack
        : AdminStack
      : UserStack;
  const mainAppKey =
    user?.role === "admin" ? `admin-${appViewMode}` : user ? "user" : "guest";

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
      </View>
    );
  }

  if (showAuthSuccess && user) {
    return <AuthSuccessTransition userName={user.name} />;
  }

  console.log("AppNavigator rendering with user:", user);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer
        ref={setNavigationRef}
        onReady={() => {
          console.log("Navigation container is ready");
        }}
      >
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            animation: "fade",
            animationDuration: 140,
            contentStyle: { backgroundColor: authColors.background },
          }}
        >
          {/* Main stack based on authentication - FIXED: Use component prop */}
          <Stack.Screen
            name="MainApp"
            component={MainAppScreen}
            key={mainAppKey}
          />

          {/* Global screens that can be accessed from anywhere */}
          <Stack.Screen
            name="OrderNotification" // CHANGED: Match the name used in App.js
            component={OrderNotification}
            options={{
              headerShown: false,
              animation: "fade",
              animationDuration: 140,
            }}
          />

          <Stack.Screen
            name="OrderDetails"
            component={OrderDetails}
            options={{
              headerShown: true,
              animation: "fade",
              animationDuration: 140,
              title: "Order Details",
              headerBackTitle: "Back",
              headerTintColor: authColors.textPrimary,
              headerStyle: { backgroundColor: authColors.panel },
              headerTitleStyle: { color: authColors.textPrimary },
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
});

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: authColors.background,
  },
});

export default AppNavigator;
