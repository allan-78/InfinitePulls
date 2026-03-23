import axios from 'axios';
import {
    ORDER_LIST_MY_REQUEST,
    ORDER_LIST_MY_SUCCESS,
    ORDER_LIST_MY_FAIL,
    ORDER_DETAILS_REQUEST,
    ORDER_DETAILS_SUCCESS,
    ORDER_DETAILS_FAIL,
} from '../constants/constants';
import { getToken } from '../../utils/helper';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export const listMyOrders = () => async (dispatch) => {
    try {
        dispatch({ type: ORDER_LIST_MY_REQUEST });

        const token = await getToken();
        const config = {
            headers: { Authorization: `Bearer ${token}` },
        };

        const { data } = await axios.get(`${BACKEND_URL}/api/v1/orders/me`, config);

        dispatch({
            type: ORDER_LIST_MY_SUCCESS,
            payload: data.orders,
        });
    } catch (error) {
        dispatch({
            type: ORDER_LIST_MY_FAIL,
            payload: error.response && error.response.data.message
                ? error.response.data.message
                : error.message,
        });
    }
};

export const getOrderDetails = (id) => async (dispatch) => {
    try {
        dispatch({ type: ORDER_DETAILS_REQUEST });

        const token = await getToken();
        const config = {
            headers: { Authorization: `Bearer ${token}` },
        };

        const { data } = await axios.get(`${BACKEND_URL}/api/v1/order/${id}`, config);

        dispatch({
            type: ORDER_DETAILS_SUCCESS,
            payload: data.order,
        });
    } catch (error) {
        dispatch({
            type: ORDER_DETAILS_FAIL,
            payload: error.response && error.response.data.message
                ? error.response.data.message
                : error.message,
        });
    }
};
