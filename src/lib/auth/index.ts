/**
 * Auth Library
 *
 * Exports all authentication-related utilities.
 */

export { hashPassword, verifyPassword } from './password'
export { registerUser, validateRegistration, findOrCreateGoogleUser } from './register'
export { loginUser } from './login'
export {
  generateOAuthState,
  buildGoogleAuthUrl,
  exchangeCodeForTokens,
  fetchGoogleUserInfo,
} from './google'
export {
  createSession,
  getSession,
  clearSession,
  isAuthenticated,
  isAdmin,
} from './session'

export type { RegisterInput, RegisterResult, GoogleRegisterInput } from './register'
export type { GoogleUserInfo } from './google'
export type { LoginInput, LoginResult } from './login'
export type { Session, SessionPayload } from './session'
