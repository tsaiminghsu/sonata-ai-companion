'use client';

// Thin wrapper around aws-amplify/auth so demo mode can swap in a local
// mock without touching every call site. With NEXT_PUBLIC_DEMO_MODE unset,
// every function below is a pure passthrough to the real Amplify Auth.

import * as amplifyAuth from 'aws-amplify/auth';
import { DEMO_MODE } from '@/lib/demo/config';
import { mockGetCurrentUser, mockSignIn, mockSignOut, mockSignUp } from '@/lib/demo/mockAuth';

export async function signIn(input: { username: string; password: string }): Promise<void> {
  if (DEMO_MODE) {
    await mockSignIn(input);
    return;
  }
  await amplifyAuth.signIn(input);
}

export async function signUp(input: {
  username: string;
  password: string;
  options: { userAttributes: { email: string } };
}): Promise<{ nextStep: { signUpStep: string } }> {
  if (DEMO_MODE) {
    return mockSignUp(input);
  }
  const result = await amplifyAuth.signUp(input);
  return { nextStep: { signUpStep: result.nextStep.signUpStep } };
}

export async function confirmSignUp(input: {
  username: string;
  confirmationCode: string;
}): Promise<void> {
  if (DEMO_MODE) return;
  await amplifyAuth.confirmSignUp(input);
}

export async function signOut(): Promise<void> {
  if (DEMO_MODE) {
    await mockSignOut();
    return;
  }
  await amplifyAuth.signOut();
}

export async function getCurrentUser(): Promise<{ userId: string }> {
  if (DEMO_MODE) {
    return mockGetCurrentUser();
  }
  const user = await amplifyAuth.getCurrentUser();
  return { userId: user.userId };
}
