
import { signInWithGoogle, signUpWithEmailPassword, signInWithEmailPassword, signOutUser } from '../auth';
import { auth } from '../config';
import { upsertUserProfile } from '../firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword as firebaseSignInWithEmail,
  updateProfile
} from "firebase/auth";

// Mock the entire firebase/auth module
jest.mock('firebase/auth', () => ({
  ...jest.requireActual('firebase/auth'), // Keep original exports not being mocked
  getAuth: jest.fn(),
  GoogleAuthProvider: jest.fn(),
  signInWithPopup: jest.fn(),
  signOut: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  updateProfile: jest.fn(),
}));

// Mock our internal modules
jest.mock('../config', () => ({
  auth: {}, // Mocked auth object
}));
jest.mock('../firestore', () => ({
  upsertUserProfile: jest.fn(),
}));

// Typecast the mocked functions to make TypeScript happy
const mockedSignInWithPopup = signInWithPopup as jest.Mock;
const mockedCreateUserWithEmailAndPassword = createUserWithEmailAndPassword as jest.Mock;
const mockedFirebaseSignInWithEmail = firebaseSignInWithEmail as jest.Mock;
const mockedSignOut = signOut as jest.Mock;
const mockedUpdateProfile = updateProfile as jest.Mock;
const mockedUpsertUserProfile = upsertUserProfile as jest.Mock;

describe('Firebase Auth Functions', () => {

  beforeEach(() => {
    // Clear all mock implementations and calls before each test
    jest.clearAllMocks();
  });

  // Test suite for signInWithGoogle
  describe('signInWithGoogle', () => {
    it('should sign in with Google and upsert user profile on success', async () => {
      const mockUser = {
        uid: 'test-uid',
        displayName: 'Test User',
        email: 'test@example.com',
      };
      const mockUserCredential = { user: mockUser };
      mockedSignInWithPopup.mockResolvedValue(mockUserCredential);
      mockedUpsertUserProfile.mockResolvedValue(undefined);

      const user = await signInWithGoogle();

      expect(signInWithPopup).toHaveBeenCalledWith(auth, expect.any(Object));
      expect(upsertUserProfile).toHaveBeenCalledWith(mockUser);
      expect(user).toEqual(mockUser);
    });

    it('should return null and log an error on failure', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('Google Sign-In Failed');
      mockedSignInWithPopup.mockRejectedValue(error);

      const user = await signInWithGoogle();

      expect(user).toBeNull();
      expect(upsertUserProfile).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith("Error signing in with Google: ", error);

      consoleErrorSpy.mockRestore();
    });
  });

  // Test suite for signUpWithEmailPassword
  describe('signUpWithEmailPassword', () => {
    it('should create a user, update profile, and upsert firestore on success', async () => {
      const mockUser = {
        uid: 'test-uid',
        email: 'new@example.com',
        photoURL: null, // Start with null photoURL
      };
      const mockUserCredential = { user: mockUser };
      mockedCreateUserWithEmailAndPassword.mockResolvedValue(mockUserCredential);
      mockedUpdateProfile.mockResolvedValue(undefined);
      mockedUpsertUserProfile.mockResolvedValue(undefined);

      const displayName = 'New User';
      const user = await signUpWithEmailPassword('new@example.com', 'password123', displayName);
      
      expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(auth, 'new@example.com', 'password123');
      expect(updateProfile).toHaveBeenCalledWith(mockUser, { displayName });
      
      // The user object passed to upsertUserProfile should have the correct shape
      expect(upsertUserProfile).toHaveBeenCalledWith({
        uid: mockUser.uid,
        displayName,
        email: mockUser.email,
        photoURL: null, // It will be null initially
      });
      expect(user).toEqual(mockUser);
    });

    it('should throw an error on failure', async () => {
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const error = new Error('Email already in use');
        mockedCreateUserWithEmailAndPassword.mockRejectedValue(error);

        await expect(signUpWithEmailPassword('new@example.com', 'password123', 'New User'))
            .rejects.toThrow('Email already in use');

        expect(consoleErrorSpy).toHaveBeenCalledWith("Error signing up: ", error);
        consoleErrorSpy.mockRestore();
    });
  });

  // Test suite for signInWithEmailPassword
  describe('signInWithEmailPassword', () => {
    it('should sign in a user on success', async () => {
        const mockUser = { uid: 'test-uid' };
        const mockUserCredential = { user: mockUser };
        mockedFirebaseSignInWithEmail.mockResolvedValue(mockUserCredential);

        const user = await signInWithEmailPassword('test@example.com', 'password');
        
        expect(firebaseSignInWithEmail).toHaveBeenCalledWith(auth, 'test@example.com', 'password');
        expect(user).toEqual(mockUser);
    });

    it('should throw an error on failure', async () => {
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const error = new Error('Invalid credentials');
        mockedFirebaseSignInWithEmail.mockRejectedValue(error);

        await expect(signInWithEmailPassword('test@example.com', 'wrongpassword'))
            .rejects.toThrow('Invalid credentials');
        
        expect(consoleErrorSpy).toHaveBeenCalledWith("Error signing in: ", error);
        consoleErrorSpy.mockRestore();
    });
  });

  // Test suite for signOutUser
  describe('signOutUser', () => {
    it('should sign out the user successfully', async () => {
        mockedSignOut.mockResolvedValue(undefined);
        await signOutUser();
        expect(signOut).toHaveBeenCalledWith(auth);
    });

    it('should log an error on failure', async () => {
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const error = new Error('Sign out failed');
        mockedSignOut.mockRejectedValue(error);

        await signOutUser();
        
        expect(consoleErrorSpy).toHaveBeenCalledWith("Error signing out: ", error);
        consoleErrorSpy.mockRestore();
    });
  });

});
