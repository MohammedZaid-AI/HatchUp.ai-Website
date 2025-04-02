document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('email-form');
    const emailInput = document.getElementById('email');
    const messageDiv = document.getElementById('message');
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const email = emailInput.value.trim();
        
        if (!isValidEmail(email)) {
            showMessage('Please enter a valid email address.', 'error');
            return;
        }
        
        // Send email to server
        saveEmail(email);
        
        // Clear input
        emailInput.value = '';
    });
    
    function isValidEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    }
    
    function showMessage(text, type) {
        messageDiv.textContent = text;
        messageDiv.className = 'message ' + type;
        
        // Clear message after 5 seconds
        setTimeout(() => {
            messageDiv.textContent = '';
            messageDiv.className = 'message';
        }, 5000);
    }
    
    function saveEmail(email) {
        // Send to Node.js server
        fetch('/api/subscribe', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email: email })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showMessage('Thank you! You\'ll be notified when we launch.', 'success');
            } else {
                showMessage(data.message || 'An error occurred. Please try again.', 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showMessage('An error occurred. Please try again.', 'error');
        });
    }
});