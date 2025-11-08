// Initialize Supabase client
const supabase = supabaseClient;

// DOM Elements
const showSignUpBtn = document.getElementById('showSignUp');
const showLoginBtn = document.getElementById('showLogin');
const signUpForm = document.getElementById('signUpForm');
const loginForm = document.getElementById('loginForm');
const signUpFormElement = document.getElementById('signUpFormElement');
const loginFormElement = document.getElementById('loginFormElement');
const signUpMessage = document.getElementById('signUpMessage');
const loginMessage = document.getElementById('loginMessage');

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
            
            // Optionally redirect to dashboard after a delay
            // setTimeout(() => {
            //     window.location.href = '/dashboard.html';
            // }, 2000);
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
            // Replace with your actual dashboard URL
            setTimeout(() => {
                window.location.href = '/dashboard.html';
            }, 1000);
        }
    } catch (err) {
        showMessage(loginMessage, 'An unexpected error occurred. Please try again.', 'error');
        console.error('Login error:', err);
    }
});

// Check if user is already logged in
async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        // User is already logged in, redirect to dashboard
        // window.location.href = '/dashboard.html';
    }
}

// Initialize auth check on page load
checkAuth();
