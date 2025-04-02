const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Serve static files from the current directory
app.use(express.static(__dirname));

// API endpoint to handle email subscriptions
app.post('/api/subscribe', (req, res) => {
    const email = req.body.email;
    
    // Validate email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.json({ success: false, message: 'Invalid email address' });
    }
    
    // Path to the JSON file
    const dataFile = path.join(__dirname, 'subscribers.json');
    
    try {
        // Read existing subscribers or create empty array
        let subscribers = [];
        if (fs.existsSync(dataFile)) {
            const data = fs.readFileSync(dataFile, 'utf8');
            subscribers = JSON.parse(data);
        }
        
        // Check if email already exists
        if (subscribers.some(sub => sub.email === email)) {
            return res.json({ success: false, message: 'You\'re already on our list!' });
        }
        
        // Add new subscriber
        subscribers.push({
            email: email,
            date: new Date().toISOString()
        });
        
        // Write back to file
        fs.writeFileSync(dataFile, JSON.stringify(subscribers, null, 2));
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error saving subscriber:', error);
        res.json({ success: false, message: 'Server error. Please try again.' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Open your browser and navigate to http://localhost:${PORT} to view your website`);
});