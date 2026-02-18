// Este archivo es la puerta de entrada. Cambias aquí para usar API real

import * as authMock from './authMock';

// Comentado para utilizar el mock en caso de utilizar la api real, descomentar
// import * as authApi from './authApi';

/**
 *LA variable USE_MOCK controla si el servicio que se esta exportando es el mock o la api real.
 *En caso de que se quiera utilizar la api real, solo hay que cambiar el valor de USE_MOCK a false,
 *ya se prodra utilizar la api real.
 **/
const USE_MOCK = true;

const authService = USE_MOCK ? authMock : null;


/**
 *Se crean funciones exportable para cada funcionalidad del servicio de autenticación, estas funciones
 *simplemente llaman a la función correspondiente del servicio que se estara utilizando (ya sea mock o api real).
 *De esta forma, el resto de la aplicacíon no tiene que preocuparse por qué servicio se esta utilizando.
 */
export const register = async (data) => {
  return authService.register(data);
};

export const login = async (data) => {
  return authService.login(data);
};

export const requestPasswordReset = async (data) => {
  return authService.requestPasswordReset(data);
};

export const confirmPasswordReset = async (data) => {
  return authService.confirmPasswordReset(data);
};

export const logout = async () => {
  return authService.logout();
};

export const getCurrentSession = async () => {
  return authService.getCurrentSession();
};

/**
 * Función para crear un usuario demo, solo se ejecuta en entornos de desarrollo y no hace nada en la API real.
 */
export const seedDemoUser = async () => {
  return authService.seedDemoUser();
};
