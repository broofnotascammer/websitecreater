require('dotenv').config();
const express = require('express');
const { Octokit } = require('@octokit/rest');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// Rate limiting (10 requests per minute)
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10
});

app.use(limiter);
app.use(cors({
  origin: 'https://your-website-builder-url.onrender.com' // Your frontend URL
}));
app.use(express.json());

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

app.post('/publish', async (req, res) => {
  try {
    const { title, content } = req.body;
    
    // Validate input
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const filename = `${Date.now()}-${title.toLowerCase().replace(/\s+/g, '-')}.html`;
    const owner = process.env.GITHUB_OWNER || 'your-github-username';
    const repo = process.env.GITHUB_REPO || 'your-repo-name';
    const branch = process.env.GITHUB_BRANCH || 'main';
    
    const response = await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: `public/${filename}`,
      message: `Add ${title}`,
      content: Buffer.from(content).toString('base64'),
      branch
    });
    
    res.json({
      success: true,
      url: `https://${owner}.github.io/${repo}/${filename}`
    });
  } catch (error) {
    console.error('GitHub Error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
