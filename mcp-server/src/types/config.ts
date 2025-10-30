export interface Config {
  apiUrl: string;
  oauth: {
    tokenEndpoint: string;
    authorizationEndpoint: string;
  };
}