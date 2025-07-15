require('dotenv').config();
const express = require('express');
const { Octokit } = require('@octokit/rest');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// GitHub client
const octokit = new Octokit({ 
  auth: process.env.GITHUB_TOKEN,
  userAgent: 'Website Builder v1.0'
});

// Publish endpoint
app.post('/publish', async (req, res) => {
  try {
    const { title, content } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({ error: 'Missing title or content' });
    }

    const filename = `site-${Date.now()}.html`;
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;
    
    const { data } = await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: filename,
      message: `Published ${title}`,
      content: Buffer.from(content).toString('base64'),
      branch: 'main'
    });

    res.json({
      success: true,
      url: `https://${owner}.github.io/${repo}/${filename}`
    });
  } catch (error) {
    console.error('Publish failed:', error);
    res.status(500).json({ 
      success: false,
      message: error.response?.data?.message || error.message
    });
  }
});

// Handle all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
