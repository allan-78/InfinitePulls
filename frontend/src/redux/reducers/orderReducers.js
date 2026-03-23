import {
    ORDER_LIST_MY_REQUEST,
    ORDER_LIST_MY_SUCCESS,
    ORDER_LIST_MY_FAIL,
    ORDER_DETAILS_REQUEST,
    ORDER_DETAILS_SUCCESS,
    ORDER_DETAILS_FAIL,
} from '../constants/constants';

export const orderListMyReducer = (state = { orders: [] }, action) => {
    switch (action.type) {
        case ORDER_LIST_MY_REQUEST:
            return { loading: true };
        case ORDER_LIST_MY_SUCCESS:
            return { loading: false, orders: action.payload };
        case ORDER_LIST_MY_FAIL:
            return { loading: false, error: action.payload };
        default:
            return state;
    }
};

export const orderDetailsReducer = (state = { loading: true, order: {} }, action) => {
    switch (action.type) {
        case ORDER_DETAILS_REQUEST:
            return { ...state, loading: true };
        case ORDER_DETAILS_SUCCESS:
            return { loading: false, order: action.payload };
        case ORDER_DETAILS_FAIL:
            return { loading: false, error: action.payload };
        default:
            return state;
    }
};
