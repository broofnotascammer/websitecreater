const express = require('express');
const path = require('path');
const app = express();

// Serve static files from the frontend repo
const frontendPath = process.env.FRONTEND_PATH || 
                    path.join(__dirname, '../frontend-repo/public');

app.use(express.static(frontendPath));

// Handle all routes
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Serving files from: ${frontendPath}`);
});
