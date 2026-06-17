import { useApp } from '../context/AppContext';

export function useMovieActions() {
  const { toggleFavorite, isFavorite, getStatus, setStatus, addReview, data } = useApp();
  return {
    toggleFavorite,
    isFavorite,
    getStatus,
    setStatus,
    addReview,
    userReviews: data.reviews,
  };
}
