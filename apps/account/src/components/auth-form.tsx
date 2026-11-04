'use client';

import Link from 'next/link';
import { useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Check, CircleAlert, Eye, EyeOff, Info, LoaderCircle, Mail } from 'lucide-react';
import { loginSchema, registerSchema, emailSchema, passwordSchema } from '@void/shared/schemas';
import { site } from '@void/shared/config';
import { safeReturnUrl } from '@void/shared/urls';
import { MicrosoftIcon } from '@void/ui/brand';
import { useHydrated } from '@void/ui/hydration';
import { authClient } from '@void/account/lib/auth-client';
import { microsoftErrorMessage } from '@void/account/lib/auth-messages';
import styles from './auth-form.module.css';

type Mode = 'login' | 'register' | 'forgot' | 'reset' | 'verify';
type Services = { auth: boolean; email: boolean; discord: boolean; microsoft: boolean };
type Field = 'name' | 'email' | 'password' | 'confirmPassword';
type FieldErrors = Partial<Record<Field, string>>;

const copy: Record<Mode, { title: string; description: string; action: string; pending: string }> = {
  login: { title: 'Welcome back.', description: 'Sign in to your Void account. Pick up where you left off.', action: 'Sign in', pending: 'Signing in…' },
  register: { title: 'Make yourself at home.', description: 'Create an account for your profile, purchases, and more.', action: 'Create account', pending: 'Creating account…' },
  forgot: { title: 'Forgot your password?', description: 'Enter your email and we’ll send you a link to reset it.', action: 'Send recovery email', pending: 'Sending email…' },
  reset: { title: 'Choose a new password.', description: 'Give your Void account a fresh, unique password.', action: 'Reset password', pending: 'Resetting password…' },
  verify: { title: 'Check your inbox.', description: 'Follow your verification link to finish setting up your account. You can request another below.', action: 'Resend verification email', pending: 'Sending email…' },
};

function PasswordField({ id, name, label, value, onChange, disabled, error, hint, autoComplete, placeholder }: {
  id: string;
  name: 'password' | 'confirmPassword';
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  error?: string;
  hint?: string;
  autoComplete: 'current-password' | 'new-password';
  placeholder: string;
}) {
  const [show, setShow] = useState(false);
  const descriptionIds = [hint ? id + '-hint' : '', error ? id + '-error' : ''].filter(Boolean).join(' ') || undefined;

  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <div className={styles.password}>
        <input
          className={styles.input}
          id={id}
          name={name}
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          autoCapitalize="none"
          spellCheck={false}
          placeholder={placeholder}
          value={value}
          onChange={event => onChange(event.target.value)}
          maxLength={128}
          required
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={descriptionIds}
        />
        <button
          type="button"
          className={styles.passwordToggle}
          onClick={() => setShow(value => !value)}
          disabled={disabled}
          aria-label={(show ? 'Hide ' : 'Show ') + label.toLowerCase()}
          aria-pressed={show}
          aria-controls={id}
        >
          {show ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        </button>
      </div>
      {hint && <span className={styles.hint} id={id + '-hint'}>{hint}</span>}
      {error && <span className={styles.fieldError} id={id + '-error'}>{error}</span>}
    </div>
  );
}

export function AuthForm({ mode, services, returnTo, token, error: initialError }: {
  mode: Mode;
  services: Services;
  returnTo?: string;
  token?: string;
  error?: string;
}) {
  const [fields, setFields] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [remember, setRemember] = useState(true);
  const [pending, setPending] = useState<'email' | 'microsoft' | null>(null);
  const requestPending = useRef(false);
  const [error, setError] = useState(() => initialError
    ? (mode === 'login' || mode === 'register'
      ? microsoftErrorMessage(initialError)
      : 'This link is invalid or has expired. Request a new one.')
    : '');
  const [success, setSuccess] = useState('');

  // Prevent input being lost if a user types before React attaches handlers.
  const hydrated = useHydrated();
  const busy = pending !== null || !hydrated;
  const destination = safeReturnUrl(returnTo, site.urls.account, site.urls.store);
  const authHref = (path: string) => site.urls.account + path + '?returnTo=' + encodeURIComponent(destination);
  const loginHref = authHref('/login');
  const loginCallback = loginHref;
  const needsEmail = mode !== 'reset';
  const needsPassword = mode === 'login' || mode === 'register' || mode === 'reset';
  const available = services.auth && (mode === 'login' || services.email) && (mode !== 'reset' || Boolean(token));
  const socialAvailable = services.auth && services.microsoft;
  const { title, description, action } = copy[mode];

  function updateField(field: Field, value: string) {
    setFields(previous => ({ ...previous, [field]: value }));
    setFieldErrors(previous => previous[field] ? { ...previous, [field]: undefined } : previous);
    setError('');
  }

  function finishRequest() {
    requestPending.current = false;
    setPending(null);
  }

  async function signInMicrosoft() {
    if (requestPending.current || !socialAvailable) return;
    requestPending.current = true;
    setPending('microsoft');
    setError('');
    setFieldErrors({});
    setSuccess('');

    try {
      const result = await authClient.signIn.social({
        provider: 'microsoft',
        callbackURL: destination,
        newUserCallbackURL: destination,
        errorCallbackURL: loginCallback,
      });
      if (result.error) {
        setError(result.error.status === 429
          ? 'Too many attempts. Please wait a few minutes and try again.'
          : microsoftErrorMessage(result.error.code));
      }
    } catch {
      setError('Microsoft sign-in could not be started. Please try again shortly.');
    } finally {
      finishRequest();
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (requestPending.current) return;
    const form = event.currentTarget;
    const { name, email, password, confirmPassword } = fields;
    setError('');
    setSuccess('');

    const validation = mode === 'login' ? loginSchema.safeParse({ email, password })
      : mode === 'register' ? registerSchema.safeParse({ name, email, password })
        : mode === 'reset' ? passwordSchema.safeParse(password)
          : emailSchema.safeParse(email);
    const nextErrors: FieldErrors = {};

    if (!validation.success) {
      for (const issue of validation.error.issues) {
        const field = (issue.path[0] ?? (mode === 'reset' ? 'password' : 'email')) as Field;
        if (field in fields && !nextErrors[field]) nextErrors[field] = issue.message;
      }
    }
    if (mode === 'register' || mode === 'reset') {
      if (!confirmPassword) nextErrors.confirmPassword = 'Confirm your password.';
      else if (password !== confirmPassword) nextErrors.confirmPassword = 'Your passwords do not match.';
    }
    setFieldErrors(nextErrors);

    const firstInvalidField = Object.keys(nextErrors)[0];
    if (firstInvalidField) {
      setError('Check the highlighted fields below.');
      const input = form.elements.namedItem(firstInvalidField);
      if (input instanceof HTMLInputElement) input.focus();
      return;
    }
    if (!available) {
      setError('Account services are not available yet. Please check back later.');
      return;
    }

    requestPending.current = true;
    setPending('email');
    let navigating = false;
    const normalizedEmail = email.trim().toLowerCase();

    try {
      let result;
      if (mode === 'login') {
        result = await authClient.signIn.email({ email: normalizedEmail, password, rememberMe: remember });
      } else if (mode === 'register') {
        result = await authClient.signUp.email({ name: name.trim(), email: normalizedEmail, password, callbackURL: loginCallback });
      } else if (mode === 'forgot') {
        result = await authClient.requestPasswordReset({ email: normalizedEmail, redirectTo: authHref('/reset-password') });
      } else if (mode === 'reset') {
        result = await authClient.resetPassword({ newPassword: password, token: token! });
      } else {
        result = await authClient.sendVerificationEmail({ email: normalizedEmail, callbackURL: loginCallback });
      }

      if (result.error) {
        const code = result.error.code;
        if ((mode === 'forgot' || mode === 'verify') && ['USER_NOT_FOUND', 'EMAIL_ALREADY_VERIFIED'].includes(code ?? '')) {
          setSuccess('If this address needs an email, a request has been made. Check your inbox and spam folder.');
          return;
        }
        if (code === 'EMAIL_NOT_VERIFIED') setError('Verify your email before signing in. You can request another link below.');
        else if (result.error.status === 429) setError('Too many attempts. Please wait a few minutes and try again.');
        else if (mode === 'login') setError('We couldn’t sign you in. Check your email and password, then try again.');
        else if (mode === 'reset') setError('This reset link could not be used. Request a new recovery email.');
        else setError('This request could not be completed. Try again or check your existing account.');
        return;
      }

      if (mode === 'login') {
        window.location.assign(destination);
        navigating = true;
        return;
      }
      setFields(previous => ({ ...previous, password: '', confirmPassword: '' }));
      if (mode === 'register') setSuccess('Check your inbox for a verification link. Verify your email before signing in.');
      else if (mode === 'reset') setSuccess('Your password has been reset. Sign in with your new password.');
      else setSuccess('If this address needs an email, a request has been made. Check your inbox and spam folder.');
    } catch {
      setError('We couldn’t connect to account services. Please try again shortly.');
    } finally {
      if (!navigating) finishRequest();
    }
  }

  const serviceNotice = !services.auth
    ? 'Account sign-in is not available yet. Please check back soon.'
    : !services.email && mode !== 'login'
      ? 'Account emails are currently unavailable. Please try again later.'
      : mode === 'reset' && !token
        ? <>A valid reset link is required. <Link href={authHref('/forgot-password')}>Request a new recovery email.</Link></>
        : null;

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <h1 id="auth-title" className={styles.title}>{title}</h1>
        <p id="auth-description" className={styles.description}>
          {mode === 'login'
            ? <>New to Void? <Link href={authHref('/register')}>Create an account</Link></>
            : mode === 'register'
              ? <>Already have an account? <Link href={loginHref}>Sign in</Link></>
              : description}
        </p>
      </header>

      {serviceNotice && <div className={styles.notice} role="note" id="auth-availability"><Info size={17} aria-hidden="true" /><span>{serviceNotice}</span></div>}
      <noscript><p className={styles.notice}>Enable JavaScript in your browser to use your Void account.</p></noscript>
      <div role="alert" aria-atomic="true" className={styles.errorMessage} id="auth-error">
        {error && <><CircleAlert size={17} aria-hidden="true" /><span>{error}</span></>}
      </div>

      {success ? (
        <>
          <div className={styles.successMessage} role="status"><Check size={19} aria-hidden="true" /><span>{success}</span></div>
          <Link href={loginHref} className={styles.primary}>Back to sign in <ArrowRight size={16} aria-hidden="true" /></Link>
          {mode === 'register' && <Link className={styles.back} href={authHref('/verify-email')}>Manage verification</Link>}
        </>
      ) : (
        <>
          {(mode === 'login' || mode === 'register') && (
            <div>
              <button
                type="button"
                className={styles.microsoft}
                onClick={signInMicrosoft}
                disabled={busy || !socialAvailable}
                aria-describedby={!socialAvailable ? 'microsoft-hint' : undefined}
                aria-busy={pending === 'microsoft'}
              >
                {pending === 'microsoft'
                  ? <LoaderCircle size={18} className="spinner" aria-hidden="true" />
                  : <MicrosoftIcon width={18} height={18} />}
                <span>{pending === 'microsoft' ? 'Connecting to Microsoft…' : 'Continue with Microsoft'}</span>
              </button>
              {!socialAvailable && <p className={services.auth ? styles.providerHint : 'sr-only'} id="microsoft-hint">Microsoft sign-in is not available yet.</p>}
              <div className={styles.divider}>or continue with email</div>
            </div>
          )}

          <form className={styles.form} method="post" onSubmit={submit} noValidate aria-labelledby="auth-title" aria-describedby="auth-description" aria-busy={busy}>
            {mode === 'register' && (
              <div className={styles.field}>
                <label htmlFor="name">Display name</label>
                <input className={styles.input} id="name" name="name" autoComplete="nickname" placeholder="What should we call you?" value={fields.name} onChange={event => updateField('name', event.target.value)} maxLength={40} required disabled={busy} aria-invalid={Boolean(fieldErrors.name)} aria-describedby={fieldErrors.name ? 'name-error' : undefined} />
                {fieldErrors.name && <span className={styles.fieldError} id="name-error">{fieldErrors.name}</span>}
              </div>
            )}
            {needsEmail && (
              <div className={styles.field}>
                <label htmlFor="email">Email address</label>
                <input className={styles.input} id="email" name="email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} placeholder="you@example.com" value={fields.email} onChange={event => updateField('email', event.target.value)} maxLength={254} required disabled={busy} aria-invalid={Boolean(fieldErrors.email)} aria-describedby={fieldErrors.email ? 'email-error' : undefined} />
                {fieldErrors.email && <span className={styles.fieldError} id="email-error">{fieldErrors.email}</span>}
              </div>
            )}
            {needsPassword && (
              <PasswordField id="password" name="password" label={mode === 'reset' ? 'New password' : 'Password'} value={fields.password} onChange={value => updateField('password', value)} disabled={busy} error={fieldErrors.password} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder={mode === 'login' ? 'Enter your password' : 'At least 12 characters'} hint={mode === 'login' ? undefined : 'Use at least 12 characters. A unique passphrase works well.'} />
            )}
            {(mode === 'register' || mode === 'reset') && (
              <PasswordField id="confirm-password" name="confirmPassword" label="Confirm password" value={fields.confirmPassword} onChange={value => updateField('confirmPassword', value)} disabled={busy} error={fieldErrors.confirmPassword} autoComplete="new-password" placeholder="Enter your password again" />
            )}
            {mode === 'login' && (
              <div className={styles.options}>
                <label className={styles.remember}>
                  <input type="checkbox" name="rememberMe" checked={remember} onChange={event => setRemember(event.target.checked)} disabled={busy} />
                  <span>Keep me signed in</span>
                </label>
                <Link href={authHref('/forgot-password')}>Forgot password?</Link>
              </div>
            )}
            <button className={styles.primary} type="submit" disabled={busy || !available} aria-describedby={!available ? 'auth-availability' : undefined}>
              {pending === 'email'
                ? <><LoaderCircle size={18} className="spinner" aria-hidden="true" />{copy[mode].pending}</>
                : <>{(mode === 'forgot' || mode === 'verify') && <Mail size={17} aria-hidden="true" />}{action}<ArrowRight size={17} aria-hidden="true" /></>}
            </button>
          </form>
        </>
      )}

      {mode === 'login' && <p className={styles.footnote}><Link href={authHref('/verify-email')}>Need to verify your email?</Link></p>}
      {mode === 'register' && site.legal.terms && site.legal.privacy && <p className={styles.footnote}>By creating an account, you agree to our <a href={site.legal.terms}>Terms</a> and <a href={site.legal.privacy}>Privacy Policy</a>.</p>}
      {!success && mode !== 'login' && mode !== 'register' && <Link href={loginHref} className={styles.back}><ArrowLeft size={15} aria-hidden="true" />Back to sign in</Link>}
    </div>
  );
}
