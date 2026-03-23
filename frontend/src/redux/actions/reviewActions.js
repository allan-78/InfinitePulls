import axios from 'axios';
import {
    REVIEW_LIST_REQUEST,
    REVIEW_LIST_SUCCESS,
    REVIEW_LIST_FAIL,
    REVIEW_CREATE_REQUEST,
    REVIEW_CREATE_SUCCESS,
    REVIEW_CREATE_FAIL,
} from '../constants/constants';
import { getToken } from '../../utils/helper';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export const listProductReviews = (productId) => async (dispatch) => {
    try {
        dispatch({ type: REVIEW_LIST_REQUEST });

        const { data } = await axios.get(`${BACKEND_URL}/api/v1/reviews?productId=${productId}`);

        dispatch({
            type: REVIEW_LIST_SUCCESS,
            payload: data.reviews,
        });
    } catch (error) {
        dispatch({
            type: REVIEW_LIST_FAIL,
            payload: error.response && error.response.data.message
                ? error.response.data.message
                : error.message,
        });
    }
};

export const createProductReview = (productId, review) => async (dispatch) => {
    try {
        dispatch({ type: REVIEW_CREATE_REQUEST });

        const token = await getToken();
        const config = {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
        };

        const requestBody = { productId, ...review };
        const url = review?.existingReview
            ? `${BACKEND_URL}/api/v1/review/update`
            : `${BACKEND_URL}/api/v1/review/create`;
        const method = review?.existingReview ? 'put' : 'post';

        const { data } = await axios[method](url, requestBody, config);

        dispatch({
            type: REVIEW_CREATE_SUCCESS,
            payload: data.review,
        });
    } catch (error) {
        dispatch({
            type: REVIEW_CREATE_FAIL,
            payload: error.response && error.response.data.message
                ? error.response.data.message
                : error.message,
        });
    }
};
