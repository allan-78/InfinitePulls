import { createStore, combineReducers, applyMiddleware } from 'redux';
import { thunk } from 'redux-thunk';

import { productListReducer, productDetailsReducer } from './reducers/productReducers';
import { orderListMyReducer, orderDetailsReducer } from './reducers/orderReducers';
import { reviewListReducer, reviewCreateReducer } from './reducers/reviewReducers';
import { userLoginReducer, userRegisterReducer } from './reducers/userReducers';

const reducer = combineReducers({
    productList: productListReducer,
    productDetails: productDetailsReducer,
    orderListMy: orderListMyReducer,
    orderDetails: orderDetailsReducer,
    reviewList: reviewListReducer,
    reviewCreate: reviewCreateReducer,
    userLogin: userLoginReducer,
    userRegister: userRegisterReducer,
});

const initialState = {};

const middleware = [thunk];

const store = createStore(
    reducer,
    initialState,
    applyMiddleware(...middleware)
);

export default store;
