const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Add Excel.js for Excel file generation
const ExcelJS = require('exceljs');

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

// New endpoint to download subscribers as Excel file
app.get('/api/export-excel', (req, res) => {
    const apiKey = req.query.key;
    
    // Simple API key protection - you should set this as an environment variable
    const validApiKey = process.env.API_KEY || 'hatchup-secret-key';
    
    if (apiKey !== validApiKey) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    try {
        // Read subscribers from JSON file
        const subscribersFile = path.join(__dirname, 'subscribers.json');
        const data = fs.readFileSync(subscribersFile, 'utf8');
        const subscribers = JSON.parse(data);
        
        // Create a new Excel workbook
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Subscribers');
        
        // Add headers
        worksheet.columns = [
            { header: 'Email', key: 'email', width: 30 },
            { header: 'Date Subscribed', key: 'date', width: 25 }
        ];
        
        // Add rows
        subscribers.forEach(subscriber => {
            worksheet.addRow({
                email: subscriber.email,
                date: new Date(subscriber.date).toLocaleString()
            });
        });
        
        // Style the header row
        worksheet.getRow(1).font = { bold: true };
        
        // Set response headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=hatchup_subscribers.xlsx');
        
        // Write to response
        workbook.xlsx.write(res)
            .then(() => {
                console.log('Excel file generated and sent');
            })
            .catch(error => {
                console.error('Error generating Excel file:', error);
                res.status(500).send('Error generating Excel file');
            });
    } catch (error) {
        console.error('Error exporting subscribers:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Open your browser and navigate to http://localhost:${PORT} to view your website`);
});