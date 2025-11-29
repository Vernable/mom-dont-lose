import { useRouter } from 'expo-router';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.imageContainer}>
        <Image 
          source={require('../assets/images/welcome.png')}
          style={styles.welcomeImage}
          resizeMode="cover"
        />
      </View>
      <Text style={styles.title}>Добро пожаловать!</Text>
      <Text style={styles.subtitle}>Откройте для себя лучшие места города</Text>
      
      <TouchableOpacity 
        style={styles.button}
        onPress={() => router.push('/auth')}
      >
        <Text style={styles.buttonText}>Войти / Зарегистрироваться</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.secondaryButton}
        onPress={() => router.push('/')}
      >
        <Text style={styles.secondaryButtonText}>Продолжить как гость</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  imageContainer: {
    width: 200,
    height: 200,
    borderRadius: 100,
    overflow: 'hidden',
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  welcomeImage: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#511515',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    color: '#666',
  },
  button: {
    backgroundColor: '#511515',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
    maxWidth: 300,
    marginBottom: 15,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
    maxWidth: 300,
    borderWidth: 1,
    borderColor: '#511515',
  },
  secondaryButtonText: {
    color: '#511515',
    fontSize: 16,
    fontWeight: '500',
  },
});