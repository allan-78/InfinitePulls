// CVPetShop/frontend/src/Components/Navigation/UserStack.js
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../UserScreen/Home';
import ProfileScreen from '../UserScreen/Profile';
import ChangePassword from '../UserScreen/ChangePassword';
import SingleProduct from '../UserScreen/SingleProduct';
import Cart from '../UserScreen/Cart';
import Marketplace from '../UserScreen/Marketplace';
import Checkout from '../UserScreen/Checkout'; 
import OrderSuccess from '../UserScreen/Orders/OrderSuccess';
import OrderHistory from '../UserScreen/Orders/OrderHistory';
import OrderDetails from '../UserScreen/Orders/OrderDetails';

const Stack = createNativeStackNavigator();

export default function UserStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false, // Hide header since UserDrawer handles the UI
        animation: 'fade',
        animationDuration: 140,
      }}
    >

        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="ChangePassword" component={ChangePassword} />
        <Stack.Screen name="SingleProduct" component={SingleProduct} />
        <Stack.Screen name="Cart" component={Cart} />
        <Stack.Screen name="Marketplace" component={Marketplace} />
        <Stack.Screen name="Checkout" component={Checkout} />
        <Stack.Screen name="OrderSuccess" component={OrderSuccess} />
        <Stack.Screen name="OrderHistory" component={OrderHistory} />
        <Stack.Screen name="OrderDetails" component={OrderDetails} />

    </Stack.Navigator>
  );
}
