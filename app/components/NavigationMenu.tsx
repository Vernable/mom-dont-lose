import { usePathname, useRouter } from 'expo-router';
import React from 'react';
import { Image, ImageSourcePropType, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface MenuItem {
  id: number;
  title: string;
  icon: ImageSourcePropType;
  route: string;
}

export default function NavigationMenu() {
  const router = useRouter();
  const pathname = usePathname();

  const menuItems: MenuItem[] = [
    {
      id: 1,
      title: 'Бот',
      icon: require('../../assets/images/botik.jpg'), // исправил на bot.jpg
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

  const isActive = (route: string) => {
    if (route === '/' && pathname === '/') return true;
    return pathname === route || pathname.startsWith(route + '/');
  };

  return (
    <View style={styles.container}>
      {menuItems.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={styles.menuItem}
          onPress={() => router.push(item.route as any)}
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
    backgroundColor: '#d0b3b3',
    paddingVertical: 10,
    paddingHorizontal: 5,
    borderTopWidth: 1,
    borderTopColor: '#4e0404',
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
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
  },
  activeIconContainer: {
    backgroundColor: '#481010',
    borderWidth: 1,
    borderColor: '#481010',
  },
  icon: {
    width: '60%',
    height: '60%',
    resizeMode: 'contain',
  },
  menuText: {
    fontSize: 12,
    fontFamily: 'Bahnschrift SemiLight Condensed',
    color: 'black',
    fontWeight: '500',
    textAlign: 'center',
  },
  activeMenuText: {
    color: '#4A1212',
    fontWeight: 'bold',
    opacity: 0.6
  },
});