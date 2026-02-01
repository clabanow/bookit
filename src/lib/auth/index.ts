/**
 * Auth Library
 *
 * Exports all authentication-related utilities.
 */

export { hashPassword, verifyPassword } from './password'
export { registerUser, validateRegistration } from './register'
export { loginUser } from './login'
export {
  createSession,
  getSession,
  clearSession,
  isAuthenticated,
  isAdmin,
} from './session'

export type { RegisterInput, RegisterResult } from './register'
export type { LoginInput, LoginResult } from './login'
export type { Session, SessionPayload } from './session'
