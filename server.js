const express = require('express');
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');
const app = express();
const PORT = process.env.PORT || 3000;

// Add Excel.js for Excel file generation
const ExcelJS = require('exceljs');

// MongoDB Atlas connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://mohammedzaid83505:Zaid017@hatchup.0zoofyy.mongodb.net/?retryWrites=true&w=majority&appName=HatchUp';
let db;

// Connect to MongoDB
async function connectToMongoDB() {
    try {
        const client = new MongoClient(MONGODB_URI);
        await client.connect();
        console.log('Connected to MongoDB Atlas');
        db = client.db('hatchup');
        
        // Migrate existing data if needed
        await migrateExistingData();
        
        return true;
    } catch (error) {
        console.error('Failed to connect to MongoDB:', error);
        return false;
    }
}

// Migrate data from local JSON file to MongoDB if needed
async function migrateExistingData() {
    const oldFile = path.join(__dirname, 'subscribers.json');
    if (fs.existsSync(oldFile)) {
        try {
            const data = fs.readFileSync(oldFile, 'utf8');
            const subscribers = JSON.parse(data);
            
            if (subscribers.length > 0) {
                // Check if we already have data in MongoDB
                const count = await db.collection('subscribers').countDocuments();
                if (count === 0) {
                    // Only migrate if MongoDB collection is empty
                    console.log(`Migrating ${subscribers.length} subscribers to MongoDB...`);
                    await db.collection('subscribers').insertMany(subscribers);
                    console.log('Migration complete');
                }
            }
        } catch (error) {
            console.error('Error migrating data:', error);
        }
    }
}

// Middleware to parse JSON bodies
app.use(express.json());

// Serve static files from the current directory
app.use(express.static(__dirname));

// API endpoint to handle email subscriptions
app.post('/api/subscribe', async (req, res) => {
    const email = req.body.email;
    
    // Validate email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.json({ success: false, message: 'Invalid email address' });
    }
    
    try {
        if (db) {
            // Check if email already exists
            const existingSubscriber = await db.collection('subscribers').findOne({ email });
            if (existingSubscriber) {
                return res.json({ success: false, message: 'You\'re already on our list!' });
            }
            
            // Add new subscriber to MongoDB
            await db.collection('subscribers').insertOne({
                email: email,
                date: new Date().toISOString()
            });
            
            return res.json({ success: true });
        } else {
            // Fallback to local file if MongoDB is not available
            // Read existing subscribers
            let subscribers = [];
            const subscribersFile = path.join(__dirname, 'subscribers.json');
            if (fs.existsSync(subscribersFile)) {
                const data = fs.readFileSync(subscribersFile, 'utf8');
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
            fs.writeFileSync(subscribersFile, JSON.stringify(subscribers, null, 2));
            
            return res.json({ success: true });
        }
    } catch (error) {
        console.error('Error saving subscriber:', error);
        return res.json({ success: false, message: 'Server error. Please try again.' });
    }
});

// New endpoint to download subscribers as Excel file
app.get('/api/export-excel', async (req, res) => {
    const apiKey = req.query.key;
    
    // Simple API key protection - you should set this as an environment variable
    const validApiKey = process.env.API_KEY || 'hatchup-secret-key';
    
    if (apiKey !== validApiKey) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    try {
        let subscribers = [];
        
        if (db) {
            // Get subscribers from MongoDB
            subscribers = await db.collection('subscribers').find().toArray();
        } else {
            // Fallback to local file
            const subscribersFile = path.join(__dirname, 'subscribers.json');
            const data = fs.readFileSync(subscribersFile, 'utf8');
            subscribers = JSON.parse(data);
        }
        
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

// Start the server after connecting to MongoDB
connectToMongoDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}`);
        console.log(`Open your browser and navigate to http://localhost:${PORT} to view your website`);
        if (db) {
            console.log('Using MongoDB Atlas for data storage');
        } else {
            console.log('Using local file storage (fallback mode)');
        }
    });
});