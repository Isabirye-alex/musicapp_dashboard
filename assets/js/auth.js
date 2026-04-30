document.addEventListener('DOMContentLoaded', () => {
    // If we're already logged in, redirect to dashboard
    if (localStorage.getItem('token')) {
        window.location.href = 'index.html';
    }

    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            const errorDiv = document.getElementById('loginError');

            try {
                errorDiv.classList.add('d-none');
                // The API expects 'password_hash' based on schema we saw (Wait, usually it's password in standard schemas, but let's send what the pydantic model expects: credentials.password_hash)
                const res = await window.api.auth.signin({ email: email, password_hash: password });
                localStorage.setItem('token', res.access_token);
                localStorage.setItem('user', JSON.stringify(res.user));
                window.location.href = 'index.html';
            } catch (error) {
                errorDiv.textContent = error.message;
                errorDiv.classList.remove('d-none');
            }
        });
    }

    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('signupName').value;
            const email = document.getElementById('signupEmail').value;
            const password = document.getElementById('signupPassword').value;
            const errorDiv = document.getElementById('signupError');

            try {
                errorDiv.classList.add('d-none');
                // Schema usually has name, email, password_hash
                const res = await window.api.auth.signup({ name: name, email: email, password_hash: password });
                window.showToast('Account Created', 'Signing you in now...', 'success');
                // Attempt login after signup if signup doesn't return token
                const loginRes = await window.api.auth.signin({ email: email, password_hash: password });
                localStorage.setItem('token', loginRes.access_token);
                localStorage.setItem('user', JSON.stringify(loginRes.user));
                window.location.href = 'index.html';
            } catch (error) {
                errorDiv.textContent = error.message;
                errorDiv.classList.remove('d-none');
            }
        });
    }
});

function toggleAuthMode() {
    const loginSection = document.getElementById('loginSection');
    const signupSection = document.getElementById('signupSection');
    if (loginSection.classList.contains('d-none')) {
        loginSection.classList.remove('d-none');
        signupSection.classList.add('d-none');
    } else {
        loginSection.classList.add('d-none');
        signupSection.classList.remove('d-none');
    }
}
