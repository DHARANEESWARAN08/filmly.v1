import { NavigatorScreenParams } from '@react-navigation/native';

export type TabParamList = {
  Discover: undefined;
  Search: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Login: undefined;
  MainTabs: NavigatorScreenParams<TabParamList> | undefined;
  MovieDetails: { movieId: number };
};
