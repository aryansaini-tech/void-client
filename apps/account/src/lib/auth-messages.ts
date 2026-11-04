/** Only fixed, public messages are rendered; provider error descriptions stay out of the UI. */
export function microsoftErrorMessage(code?: string, linking = false): string {
  switch (code?.toLowerCase().replaceAll(/[ -]/g,'_')) {
    case 'email_not_verified':
      return 'Check your inbox for a Void verification link. Verify your email, then continue with Microsoft again.';
    case 'account_not_linked':
      return 'This email already has a Void account. Sign in with your email and password, then connect Microsoft in Security.';
    case 'email_mismatch':
    case 'email_does_not_match':
    case 'account_linking_email_mismatch':
      return 'Choose a Microsoft account with the same email address as your Void account.';
    case 'account_already_linked':
    case 'account_already_linked_to_different_user':
      return 'That Microsoft account is already connected to another Void account.';
    case 'email_not_found':
      return 'Microsoft did not provide an email address. Try another Microsoft account or continue with email.';
    case 'access_denied':
    case 'user_cancelled':
      return 'Microsoft sign-in was cancelled. You can try again whenever you are ready.';
    case 'session_not_fresh':
    case 'session_expired':
    case 'unauthorized':
      return 'Sign in again before changing your connected accounts.';
    case 'last_sign_in_method':
    case 'failed_to_unlink_last_account':
      return 'Set an email password before disconnecting your last sign-in method.';
    case 'microsoft_unavailable':
      return 'Microsoft sign-in is not available yet. Please use email or check back later.';
    default:
      return linking
        ? 'The Microsoft connection could not be updated. Sign in again and retry.'
        : 'Microsoft sign-in could not be completed. Please try again or use email.';
  }
}
