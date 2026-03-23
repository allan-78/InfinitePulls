// C&V PetShop/frontend/src/Components/Navigation/AdminStack.js
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DashboardScreen from '../AdminScreen/Dashboard';
import UserListScreen from '../AdminScreen/usermanagement/UserList';
import CreateUserScreen from '../AdminScreen/usermanagement/CreateUser';
import UpdateUserScreen from '../AdminScreen/usermanagement/UpdateUser';
import ViewUserScreen from '../AdminScreen/usermanagement/ViewUser';
import TrashUserScreen from '../AdminScreen/usermanagement/TrashUser';
import ProductListScreen from '../AdminScreen/productmanagement/ProductList';
import CreateProductScreen from '../AdminScreen/productmanagement/CreateProduct';
import UpdateProductScreen from '../AdminScreen/productmanagement/UpdateProduct';
import ViewProductScreen from '../AdminScreen/productmanagement/ViewProduct';
import TrashProductScreen from '../AdminScreen/productmanagement/TrashProduct';
import OrderListScreen from '../AdminScreen/ordermanagement/OrderList';
import ViewOrderScreen from '../AdminScreen/ordermanagement/ViewOrder';
import UpdateOrderScreen from '../AdminScreen/ordermanagement/UpdateOrder';
import ViewReview from '../AdminScreen/reviewmanagement/ViewReview';
import ReviewList from '../AdminScreen/reviewmanagement/ReviewList';

const Stack = createNativeStackNavigator();

export default function AdminStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false, // Hide header since AdminDrawer has its own header
        animation: 'fade',
        animationDuration: 140,
      }}
    >
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="UserList" component={UserListScreen} />
      <Stack.Screen name="CreateUser" component={CreateUserScreen} />
      <Stack.Screen name="UpdateUser" component={UpdateUserScreen} />
      <Stack.Screen name="ViewUser" component={ViewUserScreen} />
      <Stack.Screen name="TrashUser" component={TrashUserScreen} />
      <Stack.Screen name="ProductList" component={ProductListScreen} />
      <Stack.Screen name="CreateProduct" component={CreateProductScreen} />
      <Stack.Screen name="UpdateProduct" component={UpdateProductScreen} />
      <Stack.Screen name="ViewProduct" component={ViewProductScreen} />
      <Stack.Screen name="TrashProduct" component={TrashProductScreen} />
      <Stack.Screen name="OrderList" component={OrderListScreen} />
      <Stack.Screen name="ViewOrder" component={ViewOrderScreen} />
      <Stack.Screen name="UpdateOrder" component={UpdateOrderScreen} />
      <Stack.Screen name="ReviewList" component={ReviewList} />
      <Stack.Screen name="ViewReview" component={ViewReview} />
    </Stack.Navigator>
  );
}
