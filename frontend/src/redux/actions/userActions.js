import axios from "axios";
import {
  USER_LOGIN_REQUEST,
  USER_LOGIN_SUCCESS,
  USER_LOGIN_FAIL,
  USER_LOGOUT,
  USER_REGISTER_REQUEST,
  USER_REGISTER_SUCCESS,
  USER_REGISTER_FAIL,
} from "../constants/constants";
import { authenticate, logout as helperLogout } from "../../utils/helper";
import { registerForPushNotificationsAsync } from "../../hooks/usePushNotifications";
import { Alert } from "react-native";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// Login Action
export const login = (email, password) => async (dispatch) => {
  try {
    dispatch({
      type: USER_LOGIN_REQUEST,
    });

    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };

    const { data } = await axios.post(
      `${BACKEND_URL}/api/v1/users/login`,
      { email, password },
      config
    );

    dispatch({
      type: USER_LOGIN_SUCCESS,
      payload: data,
    });

    // Save token and user info using existing helper
    await authenticate(data, async () => {
      // Delay to ensure authentication is successful before trying to register push token
      setTimeout(async () => {
        const token = await registerForPushNotificationsAsync();
        console.log("Push token registered successfully:", token);
      }, 1000);
    });
  } catch (error) {
    dispatch({
      type: USER_LOGIN_FAIL,
      payload:
        error.response && error.response.data.message
          ? error.response.data.message
          : error.message,
    });
    throw error;
  }
};

// Register Action
export const register = (userData) => async (dispatch) => {
  try {
    dispatch({
      type: USER_REGISTER_REQUEST,
    });

    // userData should ideally be FormData for multipart form
    const config = {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    };

    const { data } = await axios.post(
      `${BACKEND_URL}/api/v1/users/register`,
      userData,
      config
    );

    dispatch({
      type: USER_REGISTER_SUCCESS,
      payload: data,
    });
  } catch (error) {
    dispatch({
      type: USER_REGISTER_FAIL,
      payload:
        error.response && error.response.data.message
          ? error.response.data.message
          : error.message,
    });
    throw error;
  }
};

// Logout Action
export const logout = () => async (dispatch) => {
  await helperLogout();
  dispatch({ type: USER_LOGOUT });
};

// Social Login Action
export const socialLogin = (provider, socialData) => async (dispatch) => {
  try {
    dispatch({
      type: USER_LOGIN_REQUEST,
    });

    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };

    // Depending on provider, structure data and route
    const url =
      provider.toLowerCase() === "google"
        ? `${BACKEND_URL}/api/v1/users/firebase/auth/google`
        : `${BACKEND_URL}/api/v1/users/firebase/auth/facebook`;

    const { data } = await axios.post(url, socialData, config);

    dispatch({
      type: USER_LOGIN_SUCCESS,
      payload: data,
    });

    // Save token and user info
    await authenticate(data, async () => {
      setTimeout(async () => {
        const token = await registerForPushNotificationsAsync();
        console.log(
          "Push token registered successfully for social auth:",
          token
        );
      }, 1000);
    });
  } catch (error) {
    dispatch({
      type: USER_LOGIN_FAIL,
      payload:
        error.response && error.response.data.message
          ? error.response.data.message
          : error.message,
    });
    throw error;
  }
};
