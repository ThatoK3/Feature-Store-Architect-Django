/* logTicket.js — vanilla JS, no jQuery */
function prepareTicketForm() {
    const desc = document.getElementsByName('description')[0];
    if (desc) desc.value = 'Name: \nContact Number: \nQuery information: \n';

    const form = document.getElementById('create-ticket-form');
    if (!form) return;

    form.addEventListener('submit', function(e) {
        e.preventDefault();
        const fd = new FormData(this);

        fetch('/create_ticket/', {
            method: 'POST',
            body: fd,
            headers: { 'X-CSRFToken': (document.querySelector('[name=csrfmiddlewaretoken]') || {}).value || '' }
        })
        .then(r => r.json())
        .then(data => {
            const gotoLink = document.querySelector('.sg-link') 
                ? document.querySelector('.sg-link').outerHTML : '';
            
            const success = document.getElementById('ticket-success');
            const body    = document.querySelector('.sg-card-body');
            if (success) {
                success.textContent = `Query logged! Reference: ${data.reference}. We'll get back to you shortly.`;
                success.classList.add('visible');
                this.reset();
            } else if (body) {
                body.innerHTML = `
                    <div style="text-align:center;padding:16px 0;display:flex;flex-direction:column;gap:12px;align-items:center">
                        <div style="font-size:32px">✅</div>
                        <div style="font-size:15px;font-weight:700;color:var(--feast-green)">Query Logged Successfully!</div>
                        <div style="font-size:13px;color:var(--text-secondary)">Reference: <strong>${data.reference}</strong></div>
                        <div style="font-size:12px;color:var(--text-muted)">We will get back to you as soon as possible.</div>
                        ${gotoLink}
                    </div>`;
            }
        })
        .catch(err => {
            const el = document.getElementById('ticket-error');
            if (el) { el.textContent = 'Could not submit. Please try again.'; el.classList.add('visible'); }
            console.error('Ticket error:', err);
        });
    });
}
