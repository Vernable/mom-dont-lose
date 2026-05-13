import { useState, useEffect } from 'react';
import { pb } from './utils/pb';  // путь ./utils/pb с одной точкой

// Определите тип для Favorite
interface Favorite {
    id: string;
    name?: string;
    title?: string;
    created?: string;
}

export default function UserProfile() {
    const [favorites, setFavorites] = useState<Favorite[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadFavorites();
    }, []);

    const loadFavorites = async () => {
        try {
            const userId = pb.authStore.model?.id;
            if (userId) {
                const user = await pb.collection('users').getOne(userId);
                // Предполагаем, что favorites - это массив ID или объектов
                const favoriteIds = user.favorites || [];
                const favoriteItems = await Promise.all(
                    favoriteIds.map((id: string) => 
                        pb.collection('items').getOne(id)
                    )
                );
                setFavorites(favoriteItems as Favorite[]);
            }
        } catch (error) {
            console.error('Ошибка загрузки избранного:', error);
            alert('Ошибка загрузки избранного');
        } finally {
            setLoading(false);
        }
    };

    // Исправлено: добавлен тип для параметра 'fav'
    const renderFavorite = (fav: Favorite, index: number) => {
        return (
            <div key={fav.id || index} className="favorite-item">
                <h3>{fav.name || fav.title || 'Без названия'}</h3>
                {fav.created && <p>Добавлено: {new Date(fav.created).toLocaleDateString()}</p>}
            </div>
        );
    };

    if (loading) return <div>Загрузка...</div>;

    return (
        <div className="user-profile">
            <h1>Мой профиль</h1>
            <div className="favorites-section">
                <h2>Избранное ({favorites.length})</h2>
                {favorites.length === 0 ? (
                    <p>Нет избранных элементов</p>
                ) : (
                    <div className="favorites-list">
                        {favorites.map(renderFavorite)}
                    </div>
                )}
            </div>
        </div>
    );
}