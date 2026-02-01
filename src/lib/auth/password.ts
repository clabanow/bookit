/**
 * Password Hashing Utilities
 *
 * Uses bcryptjs for secure password hashing.
 * bcrypt is designed for passwords - it's slow on purpose to prevent brute-force attacks.
 */

import bcrypt from 'bcryptjs'

// Cost factor for bcrypt - higher = slower but more secure
// 12 is a good balance between security and performance
const SALT_ROUNDS = 12

/**
 * Hash a plain text password
 *
 * @param password - The plain text password to hash
 * @returns The hashed password (includes salt)
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

/**
 * Verify a password against a hash
 *
 * @param password - The plain text password to check
 * @param hash - The stored hash to compare against
 * @returns True if the password matches
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash)
}
