import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import NavigationMenu from './components/NavigationMenu';
//favorites.tsx
const favoritePlaces = [
  {
    id: '1',
    name: 'Башкирский государственный театр оперы и балета',
    category: 'Театр',
    rating: 4.8,
    image: require('../assets/images/bot.png'),
  },
  {
    id: '2',
    name: 'Парк культуры и отдыха им. М. Гафури',
    category: 'Парк',
    rating: 4.5,
    image: require('../assets/images/bot.png'),
  },
  {
    id: '3',
    name: 'Уфимский планетарий',
    category: 'Планетарий',
    rating: 4.7,
    image: require('../assets/images/bot.png'),
  },
];

export default function FavoritesScreen() {
  const renderFavoriteItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.favoriteItem}>
      <View style={styles.itemImage}>
        <Text style={styles.itemImageText}>🏛️</Text>
      </View>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
        <View style={styles.itemDetails}>
          <Text style={styles.itemCategory}>{item.category}</Text>
          <Text style={styles.itemRating}>⭐ {item.rating}</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.removeButton}>
        <Text style={styles.removeButtonText}>×</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Избранное</Text>
        <Text style={styles.subtitle}>Сохранённые места</Text>
      </View>

      {favoritePlaces.length > 0 ? (
        <FlatList
          data={favoritePlaces}
          renderItem={renderFavoriteItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateEmoji}>❤️</Text>
          <Text style={styles.emptyStateTitle}>Нет избранных мест</Text>
          <Text style={styles.emptyStateText}>
            Добавляйте места в избранное, чтобы вернуться к ним позже
          </Text>
        </View>
      )}

      <NavigationMenu />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#511515',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  listContent: {
    padding: 16,
  },
  favoriteItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemImage: {
    width: 50,
    height: 50,
    backgroundColor: '#511515',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemImageText: {
    fontSize: 20,
    color: 'white',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#511515',
    marginBottom: 4,
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemCategory: {
    fontSize: 14,
    color: '#666',
  },
  itemRating: {
    fontSize: 14,
    color: '#ffa500',
    fontWeight: '600',
  },
  removeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ff6b6b',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  removeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyStateEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#511515',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
});