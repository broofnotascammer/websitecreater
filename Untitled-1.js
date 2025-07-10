// server.js
require('dotenv').config(); // Load environment variables from .env file at the very top
const express = require('express');
const { Octokit } = require('@octokit/rest'); // GitHub API client library
const path = require('path'); // Node.js built-in module for path manipulation
const app = express(); // Initialize Express application
const port = process.env.PORT || 3000; // Port to run the server on, defaults to 3000

// --- Middleware ---
// Enables Express to parse JSON formatted request bodies (e.g., from frontend fetch() calls)
app.use(express.json());

// Serves static files (your HTML, CSS, JS frontend files) from the 'public' directory.
// When a browser requests, e.g., /builder.html, it serves public/builder.html.
app.use(express.static(path.join(__dirname, 'public')));

// --- GitHub Configuration ---
// Retrieve sensitive credentials from environment variables.
// NEVER hardcode these directly in your code.
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER;   // Your GitHub username (e.g., 'your-username')
const GITHUB_REPO = process.env.GITHUB_REPO;     // The name of the repository where files will be saved (e.g., 'my-generated-sites')

// Basic validation to ensure environment variables are set
if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
    console.error('ERROR: Missing GitHub configuration.');
    console.error('Please ensure GITHUB_TOKEN, GITHUB_OWNER, and GITHUB_REPO are set in your .env file.');
    console.error('Exiting...');
    process.exit(1); // Exit the process if critical variables are missing
}

// Initialize Octokit client with your GitHub Personal Access Token for authentication
const octokit = new Octokit({
    auth: GITHUB_TOKEN,
});

// --- API Endpoint: Create/Update GitHub File ---
// This endpoint handles POST requests from the frontend to publish a site.
app.post('/api/create-github-file', async (req, res) => {
    // Destructure data sent from the frontend
    const { fileName, htmlContent, cssContent, jsContent, commitMessage } = req.body;

    // Basic input validation
    if (!fileName || !htmlContent || !commitMessage) {
        return res.status(400).json({ message: 'Missing required fields: fileName, htmlContent, or commitMessage.' });
    }

    // Construct the complete HTML file content, embedding CSS and JS directly for simplicity.
    // In a more complex setup, you might create separate .css and .js files.
    let fullFileContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${fileName.replace(/\.html$/i, '') || "My Generated Page"}</title>
    ${cssContent ? `<style>\n${cssContent}\n</style>` : ''}
</head>
<body>
    ${htmlContent}
    ${jsContent ? `<script>\n${jsContent}<\/script>` : ''}
</body>
</html>`;

    // Ensure the file name ends with .html and set the path in the repository
    const filePathInRepo = fileName.endsWith('.html') ? fileName : `${fileName}.html`;
    // GitHub API requires file content to be Base64 encoded
    const contentEncoded = Buffer.from(fullFileContent).toString('base64');

    try {
        let sha = null; // Will store the SHA of the file if it already exists

        // --- Check if file exists (for updating existing files) ---
        try {
            const { data: fileData } = await octokit.repos.getContent({
                owner: GITHUB_OWNER,
                repo: GITHUB_REPO,
                path: filePathInRepo,
            });
            sha = fileData.sha; // Get the SHA if the file is found
            console.log(`File ${filePathInRepo} exists. Attempting to update...`);
        } catch (error) {
            // If error.status is 404, it means the file was not found, which is expected for new files.
            // Other errors (e.g., network issues, invalid repo) should still be handled.
            if (error.status !== 404) {
                console.error('Error checking file existence on GitHub:', error.message);
                return res.status(500).json({ message: 'Error checking file existence on GitHub.', error: error.message });
            }
            console.log(`File ${filePathInRepo} does not exist. Creating new file...`);
        }

        // --- Prepare commit parameters ---
        const commitParams = {
            owner: GITHUB_OWNER,
            repo: GITHUB_REPO,
            path: filePathInRepo,
            message: commitMessage,
            content: contentEncoded,
            committer: { // Optional: Specify committer details for better commit history
                name: 'Your Website Builder Bot',
                email: 'builder@example.com', // Use a valid email address
            },
        };

        // If the file exists, include its SHA to update it rather than creating a new one
        if (sha) {
            commitParams.sha = sha;
        }

        // --- Call GitHub API to create or update the file ---
        const { data } = await octokit.repos.createOrUpdateFileContents(commitParams);

        // --- Construct GitHub Pages URL ---
        // This URL assumes GitHub Pages is enabled on the 'main' branch of your repository.
        // For project pages (common): `https://YOUR_GITHUB_USERNAME.github.io/YOUR_REPO_NAME/filePathInRepo`
        // For user/organization pages (e.g., username.github.io): `https://YOUR_GITHUB_USERNAME.github.io/filePathInRepo`
        // Adjust this URL if your GitHub Pages setup is different.
        const githubPagesUrl = `https://${GITHUB_OWNER}.github.io/${GITHUB_REPO}/${filePathInRepo}`;

        // Send a success response back to the frontend
        res.status(200).json({
            message: 'File successfully created/updated on GitHub!',
            commitSha: data.commit.sha, // SHA of the new commit
            githubFileUrl: githubPagesUrl // The live URL where the site can be viewed
        });

    } catch (error) {
        console.error('Error creating/updating file on GitHub:', error.message);
        // Log more details from GitHub API response if available
        if (error.response && error.response.data) {
            console.error('GitHub API Error Details:', error.response.data);
        }
        // Send an error response back to the frontend
        res.status(500).json({
            message: 'Failed to create/update file on GitHub.',
            error: error.message
        });
    }
});

// --- Start the Server ---
app.listen(port, () => {
    console.log(`Backend server listening at http://localhost:${port}`);
    console.log(`Open your browser to http://localhost:${port}/builder.html to start building.`);
});