import { View, Text, StyleSheet } from 'react-native';

export default function MapsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Карты</Text>
      <Text style={styles.subtitle}>Здесь будет карта с местами</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: 'white',
    paddingBottom: 80, // Отступ для навигации
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
});