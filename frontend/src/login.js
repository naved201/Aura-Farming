// Login page component
import { supabase } from './config.js';
import './login.css';

export function createLoginPage() {
  return `
    <div class="login-container">
      <div class="auth-container">
        <h1>Aura Farming</h1>
        
        <!-- Toggle between Sign Up and Login -->
        <div class="toggle-buttons">
          <button id="showSignUp" class="toggle-btn active">Sign Up</button>
          <button id="showLogin" class="toggle-btn">Login</button>
        </div>

        <!-- Sign Up Form -->
        <div id="signUpForm" class="form-container active">
          <h2>Create Account</h2>
          <form id="signUpFormElement">
            <div class="form-group">
              <label for="signUpEmail">Email</label>
              <input type="email" id="signUpEmail" name="email" required>
            </div>
            <div class="form-group">
              <label for="signUpPassword">Password</label>
              <input type="password" id="signUpPassword" name="password" required minlength="6">
            </div>
            <div class="form-group">
              <label for="confirmPassword">Confirm Password</label>
              <input type="password" id="confirmPassword" name="confirmPassword" required>
            </div>
            <button type="submit" class="submit-btn">Sign Up</button>
          </form>
          <div id="signUpMessage" class="message"></div>
        </div>

        <!-- Login Form -->
        <div id="loginForm" class="form-container">
          <h2>Login</h2>
          <form id="loginFormElement">
            <div class="form-group">
              <label for="loginEmail">Email</label>
              <input type="email" id="loginEmail" name="email" required>
            </div>
            <div class="form-group">
              <label for="loginPassword">Password</label>
              <input type="password" id="loginPassword" name="password" required>
            </div>
            <button type="submit" class="submit-btn">Login</button>
          </form>
          <div id="loginMessage" class="message"></div>
        </div>
      </div>
    </div>
  `;
}

export function setupLoginPage() {
  // DOM Elements
  const showSignUpBtn = document.getElementById('showSignUp');
  const showLoginBtn = document.getElementById('showLogin');
  const signUpForm = document.getElementById('signUpForm');
  const loginForm = document.getElementById('loginForm');
  const signUpFormElement = document.getElementById('signUpFormElement');
  const loginFormElement = document.getElementById('loginFormElement');
  const signUpMessage = document.getElementById('signUpMessage');
  const loginMessage = document.getElementById('loginMessage');

  if (!showSignUpBtn || !showLoginBtn || !signUpForm || !loginForm || 
      !signUpFormElement || !loginFormElement || !signUpMessage || !loginMessage) {
    console.error('Login page elements not found');
    return;
  }

  // Toggle between Sign Up and Login forms
  showSignUpBtn.addEventListener('click', () => {
    showSignUpBtn.classList.add('active');
    showLoginBtn.classList.remove('active');
    signUpForm.classList.add('active');
    loginForm.classList.remove('active');
    clearMessages();
  });

  showLoginBtn.addEventListener('click', () => {
    showLoginBtn.classList.add('active');
    showSignUpBtn.classList.remove('active');
    loginForm.classList.add('active');
    signUpForm.classList.remove('active');
    clearMessages();
  });

  // Clear all messages
  function clearMessages() {
    signUpMessage.textContent = '';
    signUpMessage.className = 'message';
    loginMessage.textContent = '';
    loginMessage.className = 'message';
  }

  // Show message helper
  function showMessage(element, text, type) {
    element.textContent = text;
    element.className = `message ${type}`;
  }

  // Handle Sign Up
  signUpFormElement.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMessages();

    const email = document.getElementById('signUpEmail').value;
    const password = document.getElementById('signUpPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Validate passwords match
    if (password !== confirmPassword) {
      showMessage(signUpMessage, 'Passwords do not match', 'error');
      return;
    }

    // Validate password length
    if (password.length < 6) {
      showMessage(signUpMessage, 'Password must be at least 6 characters', 'error');
      return;
    }

    try {
      showMessage(signUpMessage, 'Creating account...', 'info');
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password
      });

      if (error) {
        showMessage(signUpMessage, error.message, 'error');
        return;
      }

      if (data.user) {
        showMessage(signUpMessage, 'Account created successfully! Please check your email to verify your account.', 'success');
        signUpFormElement.reset();
      }
    } catch (err) {
      showMessage(signUpMessage, 'An unexpected error occurred. Please try again.', 'error');
      console.error('Sign up error:', err);
    }
  });

  // Handle Login
  loginFormElement.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMessages();

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
      showMessage(loginMessage, 'Logging in...', 'info');
      
      const { data: sessionData, error: loginErr } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (loginErr) {
        showMessage(loginMessage, loginErr.message, 'error');
        return;
      }

      if (sessionData.user) {
        showMessage(loginMessage, 'Login successful! Redirecting...', 'success');
        loginFormElement.reset();
        
        // Redirect to dashboard
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1000);
      }
    } catch (err) {
      showMessage(loginMessage, 'An unexpected error occurred. Please try again.', 'error');
      console.error('Login error:', err);
    }
  });
}
