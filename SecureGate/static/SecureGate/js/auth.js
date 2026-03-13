/* auth.js — SecureGate vanilla JS (no jQuery) */

/* ─────────────────────────────────────────
   Helpers
───────────────────────────────────────── */
function csrf() {
    const el = document.querySelector('[name=csrfmiddlewaretoken]');
    return el ? el.value : '';
}

function post(url, formData) {
    return fetch(url, {
        method: 'POST',
        body: formData,
        headers: { 'X-CSRFToken': csrf() }
    });
}

function showError(id, msg) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
    el.classList.add('visible');
}

function hideError(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('visible');
}

function validateField(fieldId, inputName, msg) {
    const field = document.getElementById(fieldId);
    if (!field) return true;
    const input = field.querySelector('[name="' + inputName + '"]');
    const val = input ? input.value.trim() : '';
    if (!val) {
        field.classList.add('invalid');
        const errEl = field.querySelector('.sg-field-error');
        if (errEl && msg) errEl.textContent = msg;
        return false;
    }
    field.classList.remove('invalid');
    return true;
}

function validateEmail(fieldId) {
    const field = document.getElementById(fieldId);
    if (!field) return true;
    const input = field.querySelector('[type="email"]');
    const val = input ? input.value.trim() : '';
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
    field.classList.toggle('invalid', !ok);
    return ok;
}

/* ─────────────────────────────────────────
   Login page
───────────────────────────────────────── */
(function initLogin() {
    const form = document.getElementById('login-form');
    if (!form) return;

    form.addEventListener('submit', function(e) {
        e.preventDefault();
        hideError('login_error');

        let valid = true;
        valid = validateField('field-username', 'username') && valid;
        valid = validateField('field-password', 'password') && valid;
        if (!valid) return;

        submitLoginForm();
    });

    // Clear validation on input
    form.querySelectorAll('.sg-input').forEach(inp => {
        inp.addEventListener('input', function() {
            const field = this.closest('.sg-field');
            if (field) field.classList.remove('invalid');
        });
    });
})();

function submitLoginForm() {
    const form = document.getElementById('login-form');
    const fd = new FormData(form);

    fetch('/xloginapi/', { method: 'POST', body: fd })
        .then(r => {
            if (!r.ok) throw new Error('Login failed');
            return r.json();
        })
        .then(() => { window.location.href = '../'; })
        .catch(err => {
            showError('login_error', 'Could not log you in with the provided credentials');
        });
}

/* ─────────────────────────────────────────
   Inline form swaps (login page)
───────────────────────────────────────── */
function showForgotPassword() {
    const card = document.getElementById('sg-main-card');
    if (!card) return;

    card.querySelector('.sg-card-header .sg-card-title').textContent = 'Forgot Password';
    card.querySelector('.sg-card-header .sg-card-subtitle').textContent = 'Enter your details and we\'ll get back to you';

    card.querySelector('.sg-card-body').innerHTML = `
        <input type="hidden" name="csrfmiddlewaretoken" value="${csrf()}"/>
        <div class="sg-field" id="field-username">
            <div class="sg-input-wrap">
                <span class="sg-input-icon">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5" r="3" stroke="currentColor" stroke-width="1.5"/><path d="M2 14c0-3.314 2.686-5 6-5s6 1.686 6 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                </span>
                <input class="sg-input" type="text" name="username" placeholder="Username"/>
            </div>
        </div>
        <div class="sg-field" id="field-email">
            <div class="sg-input-wrap">
                <span class="sg-input-icon">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="4" width="12" height="9" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M2 6l6 4 6-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                </span>
                <input class="sg-input" type="text" name="email" placeholder="Email"/>
            </div>
        </div>
        <span class="sg-error" id="forgot-error"></span>
        <span class="sg-success" id="forgot-success"></span>
        <button type="button" class="sg-btn" id="password-reset" onclick="submitPassResetForm()">Send Reset Request</button>
    `;

    card.querySelector('.sg-card-footer').innerHTML = `
        <a href="#login" onclick="goToLogin()" class="sg-link">← Back to login</a>
    `;
}

function showRequestAccess() {
    const card = document.getElementById('sg-main-card');
    if (!card) return;

    card.querySelector('.sg-card-header .sg-card-title').textContent = 'Request Access';
    card.querySelector('.sg-card-header .sg-card-subtitle').textContent = 'Enter your details and we\'ll get back to you';

    card.querySelector('.sg-card-body').innerHTML = `
        <input type="hidden" name="csrfmiddlewaretoken" value="${csrf()}"/>
        <select class="sg-select" name="ticket_type" style="margin-bottom:4px">
            <option value="" disabled selected>Choose category</option>
            <option value="incident">Report an issue</option>
            <option value="request">Request access</option>
        </select>
        <textarea class="sg-textarea" name="description" placeholder="Describe your request…"></textarea>
        <div class="sg-field" id="field-email">
            <div class="sg-input-wrap">
                <span class="sg-input-icon">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="4" width="12" height="9" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M2 6l6 4 6-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                </span>
                <input class="sg-input" type="email" name="email" placeholder="Email"/>
            </div>
        </div>
        <span class="sg-error"   id="access-error"></span>
        <span class="sg-success" id="access-success"></span>
        <button type="button" class="sg-btn" onclick="submitAccessForm()">Send Request</button>
    `;

    card.querySelector('.sg-card-footer').innerHTML = `
        <a href="#login" onclick="goToLogin()" class="sg-link">← Back to login</a>
    `;
}

function goToLogin() {
    window.location.reload();
}

/* ─────────────────────────────────────────
   Password reset request
───────────────────────────────────────── */
function submitPassResetForm() {
    const body = document.querySelector('.sg-card-body');
    const fd = new FormData();
    fd.append('csrfmiddlewaretoken', csrf());
    fd.append('username', (body.querySelector('[name="username"]') || {}).value || '');
    fd.append('email', (body.querySelector('[name="email"]') || {}).value || '');

    fetch('/password_reset_request/', { method: 'POST', body: fd })
        .then(r => r.json())
        .then(data => {
            if (data.status === 200) {
                hideError('forgot-error');
                showError('forgot-success', data.message || 'Check your email for reset instructions.');
                document.getElementById('forgot-success').classList.add('visible');
                document.getElementById('forgot-success').style.display = 'block';
            } else {
                showError('forgot-error', data.error || 'Could not submit request.');
            }
        })
        .catch(() => showError('forgot-error', 'Server error. Please try again.'));
}

function submitAccessForm() {
    const body = document.querySelector('.sg-card-body');
    const fd = new FormData();
    fd.append('csrfmiddlewaretoken', csrf());
    fd.append('ticket_type', (body.querySelector('[name="ticket_type"]') || {}).value || '');
    fd.append('description', (body.querySelector('[name="description"]') || {}).value || '');
    fd.append('email', (body.querySelector('[name="email"]') || {}).value || '');

    fetch('/create_ticket/', { method: 'POST', body: fd })
        .then(r => r.json())
        .then(data => {
            const s = document.getElementById('access-success');
            if (s) { s.textContent = data.message || 'Request submitted!'; s.classList.add('visible'); }
        })
        .catch(() => showError('access-error', 'Could not submit. Please try again.'));
}

/* ─────────────────────────────────────────
   Logout
───────────────────────────────────────── */
function submitLogout() {
    const fd = new FormData();
    fd.append('csrfmiddlewaretoken', csrf());

    fetch('/xlogoutapi/', { method: 'POST', body: fd })
        .then(() => { window.location.href = '/auth'; })
        .catch(() => { window.location.href = '/auth'; });
}

/* ─────────────────────────────────────────
   Ticket form (logaticket page)
───────────────────────────────────────── */
function prepareTicketForm() {
    // Legacy call — ticket form now has its own submit handler in the template
}
