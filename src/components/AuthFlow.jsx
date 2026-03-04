import { useState, useEffect } from 'react';
import QuestSdk, { Core } from "@questlabs/core";

const QUEST_CONFIG = {
  LOGIN_CAMPAIGN_ID: "c-57b273a5-b116-43f4-9d32-f8407614e1aa",
  ONBOARDING_CAMPAIGN_ID: "c-16a436fd-769a-40c3-b09d-70b7eade0ec6",
  APIKEY: "k-c159d194-2b09-478d-b1f0-38e33eb08f96",
  ENTITYID: "e-4a71f086-cac1-44f6-9177-97a4c09c0232",
  TOKEN_VALIDITY_DAYS: 6
};

const calculateExpiry = () => {
  const d = new Date();
  d.setDate(d.getDate() + QUEST_CONFIG.TOKEN_VALIDITY_DAYS);
  return d.toISOString();
};

const isTokenExpired = (exp) => !exp || new Date() > new Date(exp);

let globalUserId = null, globalToken = null, globalTokenExpiry = null;

const setAuthData = (userId, token) => {
  const exp = calculateExpiry();
  globalUserId = userId;
  globalToken = token;
  globalTokenExpiry = exp;
  try {
    localStorage.setItem('userId', userId);
    localStorage.setItem('token', token);
    localStorage.setItem('tokenExpiry', exp);
  } catch (e) {
    console.error('Auth persist failed:', e);
  }
};

const getAuthData = () => {
  if (globalUserId && globalToken && globalTokenExpiry) {
    if (isTokenExpired(globalTokenExpiry)) {
      clearAuthData();
      return { userId: null, token: null, expiry: null, isExpired: true };
    }
    return { userId: globalUserId, token: globalToken, expiry: globalTokenExpiry, isExpired: false };
  }
  try {
    const uid = localStorage.getItem('userId');
    const tok = localStorage.getItem('token');
    const exp = localStorage.getItem('tokenExpiry');
    if (uid && tok && exp) {
      if (isTokenExpired(exp)) {
        clearAuthData();
        return { userId: null, token: null, expiry: null, isExpired: true };
      }
      globalUserId = uid;
      globalToken = tok;
      globalTokenExpiry = exp;
      return { userId: uid, token: tok, expiry: exp, isExpired: false };
    }
  } catch (e) {
    console.error('Auth retrieve failed:', e);
  }
  return { userId: null, token: null, expiry: null, isExpired: false };
};

const isAuthenticated = () => {
  const { userId, token, isExpired } = getAuthData();
  return !isExpired && !!(userId && token);
};

const clearAuthData = () => {
  globalUserId = globalToken = globalTokenExpiry = null;
  try {
    localStorage.removeItem('userId');
    localStorage.removeItem('token');
    localStorage.removeItem('tokenExpiry');
  } catch (e) {
    console.error('Auth clear failed:', e);
  }
};

const logout = () => {
  clearAuthData();
  window.location.reload();
};

const fetchLoginCampaign = async () => {
  const sdk = new QuestSdk({ apiKey: QUEST_CONFIG.APIKEY, entityId: QUEST_CONFIG.ENTITYID });
  const plgos = new Core.Plgos(sdk);
  const res = await plgos.fetchCampaignDetails(
    { campaignId: QUEST_CONFIG.LOGIN_CAMPAIGN_ID, entityId: QUEST_CONFIG.ENTITYID },
    { _headers: { userid: 'u-0000000000', token: '' } }
  );
  if (res?.success && res?.data) return res.data;
  throw new Error(res.error || "Login campaign fetch failed");
};

const sendOtpEmail = async (email) => {
  const sdk = new QuestSdk({ apiKey: QUEST_CONFIG.APIKEY, entityId: QUEST_CONFIG.ENTITYID });
  const user = new Core.User(sdk);
  const res = await user.sendOtpEmail({ email, entityId: QUEST_CONFIG.ENTITYID });
  if (res?.success) return { success: true };
  throw new Error(res.error || "OTP send failed");
};

const verifyOtpEmail = async (email, otp, campaignVariationId) => {
  const sdk = new QuestSdk({ apiKey: QUEST_CONFIG.APIKEY, entityId: QUEST_CONFIG.ENTITYID });
  const user = new Core.User(sdk);
  const res = await user.verifyOtpEmail({ email, otp, entityId: QUEST_CONFIG.ENTITYID, campaignVariationId });
  if (res?.success) {
    setAuthData(res.userId, res.token);
    return { success: true, userId: res.userId, token: res.token, newUser: res.newUser };
  }
  throw new Error(res.error || "Invalid OTP");
};

const loginWithGoogle = async (code, redirectUrl) => {
  const sdk = new QuestSdk({ apiKey: QUEST_CONFIG.APIKEY, entityId: QUEST_CONFIG.ENTITYID });
  const user = new Core.User(sdk);
  const res = await user.loginWithGoogle({ code, redirectUri: redirectUrl, entityId: QUEST_CONFIG.ENTITYID });
  if (res?.success && res?.userId && res?.token) {
    setAuthData(res.userId, res.token);
    return { success: true, userId: res.userId, token: res.token, newUser: res.newUser };
  }
  throw new Error(res.error || "Google login failed");
};

const fetchOnboardingCampaign = async () => {
  const { userId, token } = getAuthData();
  if (!userId || !token) throw new Error("Auth required");
  const sdk = new QuestSdk({ apiKey: QUEST_CONFIG.APIKEY, entityId: QUEST_CONFIG.ENTITYID });
  const plgos = new Core.Plgos(sdk);
  const res = await plgos.fetchCampaignDetails(
    { campaignId: QUEST_CONFIG.ONBOARDING_CAMPAIGN_ID, entityId: QUEST_CONFIG.ENTITYID },
    { _headers: { userid: userId, token } }
  );
  if (res?.success && res?.data) return res.data;
  throw new Error(res.error || "Onboarding fetch failed");
};

const submitOnboardingResponses = async (campaignVariationId, answersData) => {
  const { userId, token } = getAuthData();
  if (!userId || !token) throw new Error("Auth required");
  const sdk = new QuestSdk({ apiKey: QUEST_CONFIG.APIKEY, entityId: QUEST_CONFIG.ENTITYID });
  const plgos = new Core.Plgos(sdk);
  return await plgos.submitCampaignResponses(
    { campaignId: QUEST_CONFIG.ONBOARDING_CAMPAIGN_ID, entityId: QUEST_CONFIG.ENTITYID, campaignVariationId, actions: answersData },
    { _headers: { userid: userId, token } }
  );
};

const initiateGoogleLogin = (googleClientId) => {
  const redirectUrl = (window.location.origin + window.location.pathname);
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/auth?client_id=${googleClientId}&redirect_uri=${redirectUrl}&scope=profile%20email&response_type=code`;
  window.location.href = googleAuthUrl.toString();
};

const DynamicActionInput = ({ action, value, onChange, error, theme }) => {
  const inputStyle = {
    width: '100%',
    padding: '12px',
    border: `1px solid ${error ? '#ef4444' : theme?.colors?.border || '#d1d5db'}`,
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: theme?.colors?.background || '#fff',
    color: theme?.colors?.text || '#000'
  };

  const renderInput = () => {
    switch (action.actionType) {
      case 'USER_INPUT_TEXT':
        return <input type="text" value={value || ''} onChange={e => onChange(e.target.value)} placeholder={action.metadata?.placeholder || 'Enter text'} style={inputStyle} />;
      case 'USER_INPUT_EMAIL':
        return <input type="email" value={value || ''} onChange={e => onChange(e.target.value.toLowerCase())} placeholder={action.metadata?.placeholder || 'Enter email'} style={inputStyle} />;
      case 'USER_INPUT_NUMBER':
        return <input type="number" value={value || ''} onChange={e => onChange(e.target.value)} placeholder={action.metadata?.placeholder || 'Enter number'} style={inputStyle} />;
      case 'USER_INPUT_DATE':
        return <input type="date" value={value || ''} onChange={e => onChange(e.target.value)} style={inputStyle} />;
      case 'USER_INPUT_TEXTAREA':
        return <textarea value={value || ''} onChange={e => onChange(e.target.value)} placeholder={action.metadata?.placeholder || 'Enter response'} rows={action.metadata?.rows || 4} style={inputStyle} />;
      case 'USER_INPUT_SINGLE_CHOICE':
        if (!action.options?.length) return <div style={{ color: '#f59e0b' }}>No options</div>;
        return <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {action.options.map((opt, i) => (
            <label key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="radio" name={action.actionId} value={opt} checked={value === opt} onChange={e => onChange(e.target.value)} />
              <span style={{ color: theme?.colors?.text || '#000' }}>{opt}</span>
            </label>
          ))}
        </div>;
      case 'USER_INPUT_MULTI_CHOICE':
        if (!action.options?.length) return <div style={{ color: '#f59e0b' }}>No options</div>;
        return <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {action.options.map((opt, i) => (
            <label key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" value={opt} checked={Array.isArray(value) && value.includes(opt)} onChange={e => {
                const cur = Array.isArray(value) ? value : [];
                onChange(e.target.checked ? [...cur, opt] : cur.filter(o => o !== opt));
              }} />
              <span style={{ color: theme?.colors?.text || '#000' }}>{opt}</span>
            </label>
          ))}
        </div>;
      default:
        return <input type="text" value={value || ''} onChange={e => onChange(e.target.value)} placeholder="Enter value" style={inputStyle} />;
    }
  };

  return (
    <div style={{ marginBottom: '20px' }}>
      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: theme?.colors?.text || '#000' }}>
        {action.title}{action.isRequired && <span style={{ color: '#ef4444' }}> *</span>}
      </label>
      {action.description && <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: theme?.colors?.textSecondary || '#6b7280' }}>{action.description}</p>}
      {renderInput()}
      {error && <span style={{ display: 'block', marginTop: '4px', fontSize: '13px', color: '#ef4444' }}>{error}</span>}
    </div>
  );
};

export default function AuthFlow({ onComplete, theme }) {
  const [flowState, setFlowState] = useState('checking');
  const [showExpired, setShowExpired] = useState(false);
  const [loginData, setLoginData] = useState(null);
  const [loadingLogin, setLoadingLogin] = useState(true);
  const [loginError, setLoginError] = useState(null);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loginStep, setLoginStep] = useState('email');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [campaignData, setCampaignData] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loadingOnboarding, setLoadingOnboarding] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [onboardingError, setOnboardingError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [processingGoogle, setProcessingGoogle] = useState(false);
  const [googleError, setGoogleError] = useState('');

  const isGoogleEnabled = loginData?.sdkConfig?.uiProps?.google === true && loginData?.sdkConfig?.uiProps?.googleClientId;
  const googleClientId = loginData?.sdkConfig?.uiProps?.googleClientId;

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchLoginCampaign();
        setLoginData(data);
        setLoginError(null);
      } catch (e) {
        setLoginError(e.message);
      } finally {
        setLoadingLogin(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (loadingLogin) return;

    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');

    if (error) {
      setGoogleError('Google login cancelled or failed');
      window.history.replaceState({}, document.title, window.location.pathname);
      setFlowState('login');
      return;
    }

    if (code) {
      handleGoogleCallback(code);
      return;
    }

    const { isExpired } = getAuthData();
    if (isExpired) {
      setShowExpired(true);
      setFlowState('login');
    } else if (isAuthenticated()) {
      setFlowState('onboarding');
      loadOnboarding();
    } else {
      setFlowState('login');
    }
  }, [loadingLogin]);

  const handleGoogleCallback = async (code) => {
    setProcessingGoogle(true);
    setGoogleError('');
    try {
      const redirectUrl = (window.location.origin + window.location.pathname);
      const res = await loginWithGoogle(code, redirectUrl);
      if (res.success) {
        window.history.replaceState({}, document.title, window.location.pathname);
        setFlowState('onboarding');
        loadOnboarding();
      }
    } catch (e) {
      setGoogleError(e.message);
      window.history.replaceState({}, document.title, window.location.pathname);
      setFlowState('login');
    } finally {
      setProcessingGoogle(false);
    }
  };

  const loadOnboarding = async () => {
    setLoadingOnboarding(true);
    try {
      const data = await fetchOnboardingCampaign();
      if (data.isClaimed) {
        setFlowState('complete');
        if (onComplete) onComplete();
        return;
      }
      setCampaignData(data);
      const init = {};
      (data?.actions || []).forEach(a => {
        init[a.actionId] = a.actionType === 'USER_INPUT_MULTI_CHOICE' ? [] : '';
      });
      setAnswers(init);
    } catch (e) {
      setOnboardingError(e.message);
    } finally {
      setLoadingOnboarding(false);
    }
  };

  const isValidEmail = (e) => {
    const email = e.trim();
    return /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
  };

  const handleSendOtp = async () => {
    setEmailError('');
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setEmailError('Email required');
      return;
    }
    if (!isValidEmail(trimmedEmail)) {
      setEmailError('Invalid email');
      return;
    }
    try {
      setSendingOtp(true);
      await sendOtpEmail(trimmedEmail);
      setOtpSent(true);
      setLoginStep('otp');
    } catch (e) {
      setEmailError(e.message);
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    setOtpError('');
    if (!otp.trim()) {
      setOtpError('OTP required');
      return;
    }
    if (!loginData?.campaignVariationId) {
      setOtpError('Campaign data missing');
      return;
    }
    try {
      setVerifyingOtp(true);
      const res = await verifyOtpEmail(email, otp, loginData.campaignVariationId);
      if (res.success) {
        setFlowState('onboarding');
        loadOnboarding();
      }
    } catch (e) {
      setOtpError(e.message);
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    setOtpError('');
    setOtp('');
    try {
      setSendingOtp(true);
      await sendOtpEmail(email);
      setOtpSent(true);
    } catch (e) {
      setOtpError(e.message);
    } finally {
      setSendingOtp(false);
    }
  };

  const handleGoogleLogin = () => {
    if (!isGoogleEnabled || !googleClientId) {
      setGoogleError('Google login not configured');
      return;
    }
    initiateGoogleLogin(googleClientId);
  };

  const handleAnswerChange = (id, val) => {
    setAnswers(p => ({ ...p, [id]: val }));
    if (validationErrors[id]) setValidationErrors(p => {
      const u = { ...p };
      delete u[id];
      return u;
    });
  };

  const validateAnswers = () => {
    const errs = {};
    (campaignData?.actions || []).forEach(a => {
      if (a.isRequired) {
        const ans = answers[a.actionId];
        if (!ans || (typeof ans === 'string' && !ans.trim()) || (Array.isArray(ans) && ans.length === 0)) {
          errs[a.actionId] = 'Required';
        }
        if (a.actionType === 'USER_INPUT_EMAIL' && ans && !isValidEmail(ans)) {
          errs[a.actionId] = 'Invalid email';
        }
      }
    });
    setValidationErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateAnswers()) return;
    setSubmitting(true);
    setOnboardingError(null);
    try {
      const data = Object.keys(answers).map(id => {
        const ans = answers[id];
        const formatted = Array.isArray(ans) ? ans : (ans !== '' && ans != null ? [String(ans)] : []);
        return { actionId: id, answers: formatted };
      }).filter(i => i.answers.length > 0);
      const res = await submitOnboardingResponses(campaignData.campaignVariationId, data);
      if (res?.success) {
        setFlowState('complete');
        if (onComplete) onComplete();
      } else {
        setOnboardingError(res.error || 'Submit failed');
      }
    } catch (e) {
      setOnboardingError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const containerStyle = {
    maxWidth: '480px',
    margin: '0 auto',
    padding: '40px 20px',
    fontFamily: theme?.fonts?.body || 'system-ui'
  };

  const cardStyle = {
    backgroundColor: theme?.colors?.cardBackground || '#fff',
    border: `1px solid ${theme?.colors?.border || '#e5e7eb'}`,
    borderRadius: '12px',
    padding: '32px',
    boxShadow: theme?.shadows?.md || '0 4px 6px rgba(0,0,0,0.1)'
  };

  const h1Style = {
    margin: '0 0 8px 0',
    fontSize: '24px',
    fontWeight: '600',
    color: theme?.colors?.text || '#000'
  };

  const pStyle = {
    margin: 0,
    fontSize: '14px',
    color: theme?.colors?.textSecondary || '#6b7280'
  };

  const btnStyle = {
    width: '100%',
    padding: '12px',
    fontSize: '16px',
    fontWeight: '500',
    color: '#fff',
    backgroundColor: theme?.colors?.primary || '#3b82f6',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    marginTop: '16px'
  };

  const btnDisabled = {
    ...btnStyle,
    opacity: 0.5,
    cursor: 'not-allowed'
  };

  const btnSecondary = {
    ...btnStyle,
    backgroundColor: 'transparent',
    color: theme?.colors?.primary || '#3b82f6',
    border: `1px solid ${theme?.colors?.primary || '#3b82f6'}`,
    marginTop: '8px'
  };

  const btnGoogle = {
    ...btnStyle,
    backgroundColor: '#fff',
    color: '#000',
    border: '1px solid #d1d5db',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  };

  const dividerStyle = {
    display: 'flex',
    alignItems: 'center',
    margin: '20px 0',
    color: theme?.colors?.textSecondary || '#6b7280',
    fontSize: '14px'
  };

  const dividerLine = {
    flex: 1,
    height: '1px',
    backgroundColor: theme?.colors?.border || '#e5e7eb'
  };

  const errBanner = {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#991b1b',
    padding: '12px',
    borderRadius: '6px',
    marginBottom: '16px',
    fontSize: '14px'
  };

  const successBanner = {
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    color: '#166534',
    padding: '12px',
    borderRadius: '6px',
    marginBottom: '16px',
    fontSize: '14px'
  };

  if (flowState === 'checking' || loadingLogin || processingGoogle) {
    return <div style={containerStyle}><div style={{ textAlign: 'center', color: theme?.colors?.text || '#000' }}> {processingGoogle ? 'Processing Google login...' : 'Loading...'} </div></div>;
  }

  if (loginError) {
    return <div style={containerStyle}><div style={cardStyle}><div style={errBanner}>Failed to load: {loginError}</div></div></div>;
  }

  if (flowState === 'login') {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          {showExpired && <div style={errBanner}>Session expired. Please log in.</div>}
          {googleError && <div style={errBanner}>{googleError}</div>}
          <div style={{ marginBottom: '24px', textAlign: 'center' }}>
            <h1 style={h1Style}>{loginStep === 'email' ? 'Welcome to HookVault' : 'Verify Email'}</h1>
            <p style={pStyle}>{loginStep === 'email' ? 'Sign in to manage your webhooks' : 'Check your email for code'}</p>
          </div>
          {loginStep === 'email' ? (
            <div>
              {isGoogleEnabled && (
                <>
                  <button onClick={handleGoogleLogin} style={btnGoogle}>
                    <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/><path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/></svg>
                    Continue with Google
                  </button>
                  <div style={dividerStyle}>
                    <div style={dividerLine}></div>
                    <span style={{ margin: '0 12px' }}>OR</span>
                    <div style={dividerLine}></div>
                  </div>
                </>
              )}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: theme?.colors?.text || '#000' }}>Email</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={e => { 
                    setEmail(e.target.value.toLowerCase()); 
                    setEmailError(''); 
                    setGoogleError(''); 
                  }} 
                  onKeyPress={e => e.key === 'Enter' && handleSendOtp()} 
                  placeholder="Enter email" 
                  style={{ 
                    width: '100%', 
                    padding: '12px', 
                    border: `1px solid ${emailError ? '#ef4444' : theme?.colors?.border || '#d1d5db'}`, 
                    borderRadius: '6px', 
                    fontSize: '14px', 
                    backgroundColor: theme?.colors?.background || '#fff', 
                    color: theme?.colors?.text || '#000' 
                  }} 
                />
                {emailError && <span style={{ display: 'block', marginTop: '4px', fontSize: '13px', color: '#ef4444' }}>{emailError}</span>}
              </div>
              <button onClick={handleSendOtp} disabled={sendingOtp} style={sendingOtp ? btnDisabled : btnStyle}>
                {sendingOtp ? 'Sending...' : 'Continue'}
              </button>
            </div>
          ) : (
            <div>
              {otpSent && <div style={successBanner}>OTP sent!</div>}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: theme?.colors?.text || '#000' }}>Code</label>
                <input 
                  type="text" 
                  value={otp} 
                  onChange={e => { 
                    setOtp(e.target.value); 
                    setOtpError(''); 
                  }} 
                  onKeyPress={e => e.key === 'Enter' && handleVerifyOtp()} 
                  placeholder="6-digit code" 
                  maxLength={6} 
                  style={{ 
                    width: '100%', 
                    padding: '12px', 
                    border: `1px solid ${otpError ? '#ef4444' : theme?.colors?.border || '#d1d5db'}`, 
                    borderRadius: '6px', 
                    fontSize: '14px', 
                    backgroundColor: theme?.colors?.background || '#fff', 
                    color: theme?.colors?.text || '#000' 
                  }} 
                />
                {otpError && <span style={{ display: 'block', marginTop: '4px', fontSize: '13px', color: '#ef4444' }}>{otpError}</span>}
              </div>
              <button onClick={handleVerifyOtp} disabled={verifyingOtp} style={verifyingOtp ? btnDisabled : btnStyle}>
                {verifyingOtp ? 'Verifying...' : 'Verify'}
              </button>
              <button onClick={handleResendOtp} disabled={sendingOtp} style={btnSecondary}>Resend</button>
              <button onClick={() => { setLoginStep('email'); setOtp(''); setOtpError(''); }} style={btnSecondary}>Change Email</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (flowState === 'onboarding') {
    if (loadingOnboarding) return <div style={containerStyle}><div style={{ textAlign: 'center', color: theme?.colors?.text || '#000' }}>Loading...</div></div>;
    if (onboardingError && !campaignData) return <div style={containerStyle}><div style={cardStyle}><div style={errBanner}>{onboardingError}</div></div></div>;
    if (!campaignData || campaignData.isClaimed) return null;
    const sorted = [...(campaignData?.actions || [])].sort((a, b) => a.position - b.position);
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{ marginBottom: '24px', textAlign: 'center' }}>
            <h1 style={h1Style}>Complete Setup</h1>
            <p style={pStyle}>Tell us about your webhook needs</p>
          </div>
          <form onSubmit={e => { e.preventDefault(); handleSubmit(); }}>
            {sorted.map(a => <DynamicActionInput key={a.actionId} action={a} value={answers[a.actionId]} onChange={v => handleAnswerChange(a.actionId, v)} error={validationErrors[a.actionId]} theme={theme} />)}
            {onboardingError && <div style={errBanner}>{onboardingError}</div>}
            <button type="submit" disabled={submitting} style={submitting ? btnDisabled : btnStyle}>
              {submitting ? 'Submitting...' : 'Complete Setup'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return null;
}

export { logout, isAuthenticated, getAuthData };