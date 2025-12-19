import { usePathname, useRouter } from 'expo-router';
import React from 'react';
import { Image, ImageSourcePropType, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../_layout';

// NavigationMenu
interface MenuItem {
  id: number;
  title: string;
  icon: ImageSourcePropType;
  route: string;
}

export default function NavigationMenu() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();

  const menuItems: MenuItem[] = [
    {
      id: 1,
      title: 'Бот',
      icon: require('../../assets/images/botik.jpg'),
      route: '/bot'
    },
    {
      id: 2,
      title: 'Карты',
      icon: require('../../assets/images/maps.png'),
      route: '/maps'
    },
    {
      id: 3,
      title: 'Главная',
      icon: require('../../assets/images/main.png'),
      route: '/'
    },
    {
      id: 4,
      title: 'Избранное',
      icon: require('../../assets/images/favorites.png'),
      route: '/favorites'
    },
    {
      id: 5,
      title: 'Профиль',
      icon: require('../../assets/images/profile.png'),
      route: '/profile'
    },
  ];

  const handleNavigation = (route: string) => {
    if (!user && route !== '/') {
      router.push('/welcome');
      return;
    }
    router.push(route as any);
  };

  const isActive = (route: string) => {
    if (route === '/' && pathname === '/') return true;
    return pathname === route || pathname.startsWith(route + '/');
  };

  // Не показываем меню на welcome и auth страницах
  if (pathname === '/welcome' || pathname === '/auth') {
    return null;
  }

  return (
    <View style={styles.container}>
      {menuItems.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={styles.menuItem}
          onPress={() => handleNavigation(item.route)}
        >
          <View style={[
            styles.iconContainer,
            isActive(item.route) && styles.activeIconContainer
          ]}>
            <Image 
              source={item.icon} 
              style={styles.icon} 
            />
          </View>
          <Text style={[
            styles.menuText,
            isActive(item.route) && styles.activeMenuText
          ]}>
            {item.title}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#72383D', // Новый цвет фона
    paddingVertical: 10,
    paddingHorizontal: 5,
    borderTopWidth: 1,
    borderTopColor: '#72383D', // Новый цвет границы
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuItem: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: 5,
  },
  iconContainer: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    backgroundColor: '#EFE9E1', // Новый цвет фона иконки
    borderRadius: 8,
  },
  activeIconContainer: {
    backgroundColor: '#AC9C8D', // Новый цвет активной иконки
    borderWidth: 1,
    borderColor: '#AC9C8D',
  },
  icon: {
    width: '60%',
    height: '60%',
    resizeMode: 'contain',
  },
  menuText: {
    fontSize: 12,
    fontFamily: 'Banshrift', // Новый шрифт
    color: 'white', // Черный цвет текста
    fontWeight: '500',
    textAlign: 'center',
  },
  activeMenuText: {
    color: '#72383D', // Новый цвет активного текста
    fontWeight: 'bold',
  },
});