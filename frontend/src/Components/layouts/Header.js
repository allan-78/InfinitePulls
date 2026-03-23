// CVPetshop/frontend/src/Components/layouts/Header.js
import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  SafeAreaView
} from 'react-native';

const { width } = Dimensions.get('window');

const Header = () => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.navContainer}>
          <View style={styles.navLogo}>
            <Image
              source={require('./logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.shopName}>infinitePulls</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#FF6B6B',
  },
  header: {
    width: '100%',
    backgroundColor: '#FF6B6B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
    position: 'relative',
    top: 0,
    zIndex: 1000,
  },
  navContainer: {
    maxWidth: 1400,
    marginHorizontal: 'auto',
    paddingHorizontal: 20,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  logoImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'white',
    padding: 5,
  },
  shopName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 1,
  },
});

export default Header;