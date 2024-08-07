const express = require('express');
const path = require('path');
const app = express();

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Route for the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html')); // Correct path
});

// Route for the About page
app.get('/smartstop', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'smartstop.html'));
});

// Route for the Contact page
app.get('/rays', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'rays.html'));
});

// Set the port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
