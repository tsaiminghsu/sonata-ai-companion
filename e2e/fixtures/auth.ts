import { Page, expect } from '@playwright/test';
import {
  AdminConfirmSignUpCommand,
  AdminSetUserPasswordCommand,
  CognitoIdentityProviderClient,
  SignUpCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import outputs from '../../amplify_outputs.json';

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

export type TestUser = { email: string; password: string };

/**
 * Demo mode: lib/demo/mockAuth.ts's signIn accepts any email/password and
 * creates the account on first login, so there's nothing to provision - just
 * generate a unique email.
 *
 * Real backend: registers a fresh Cognito user and admin-confirms it
 * directly (bypassing the email verification code UI, which Playwright has
 * no way to receive) using the same AWS credentials the developer runs
 * `ampx sandbox` with. Requires a real deployed backend (amplify_outputs.json
 * populated by `ampx sandbox`) - not runnable against the placeholder config.
 */
export async function createConfirmedTestUser(): Promise<TestUser> {
  const email = `sonata-e2e-${Date.now()}-${Math.floor(Math.random() * 10000)}@example.com`;
  const password = 'Sonata-Test-1234!';

  if (DEMO_MODE) {
    return { email, password };
  }

  const cognito = new CognitoIdentityProviderClient({ region: outputs.auth.aws_region });
  await cognito.send(
    new SignUpCommand({
      ClientId: outputs.auth.user_pool_client_id,
      Username: email,
      Password: password,
      UserAttributes: [{ Name: 'email', Value: email }],
    })
  );
  await cognito.send(
    new AdminConfirmSignUpCommand({ UserPoolId: outputs.auth.user_pool_id, Username: email })
  );
  await cognito.send(
    new AdminSetUserPasswordCommand({
      UserPoolId: outputs.auth.user_pool_id,
      Username: email,
      Password: password,
      Permanent: true,
    })
  );

  return { email, password };
}

export async function login(page: Page, user: TestUser): Promise<void> {
  await page.goto('/login');
  await page.getByPlaceholder('you@example.com').fill(user.email);
  await page.locator('#password').fill(user.password);
  await page.getByTestId('login-submit').click();
  await expect(page).toHaveURL('/');
}
