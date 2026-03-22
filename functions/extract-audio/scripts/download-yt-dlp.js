#!/usr/bin/env node
/**
 * Downloads the appropriate yt-dlp binary based on the platform
 * This runs during Appwrite build to ensure the right binary is available
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const BIN_DIR = path.join(__dirname, '..', 'bin');
const GITHUB_API_URL = 'https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest';

function getPlatformBinary() {
    const platform = process.platform;
    if (platform === 'win32') {
        return { filename: 'yt-dlp.exe', executable: false };
    } else if (platform === 'linux') {
        return { filename: 'yt-dlp', executable: true };
    } else if (platform === 'darwin') {
        return { filename: 'yt-dlp_macos', executable: true };
    }
    throw new Error(`Unsupported platform: ${platform}`);
}

function downloadFile(url, filepath) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        const file = fs.createWriteStream(filepath);

        const request = protocol.get(url, {
            headers: { 'user-agent': 'naat-collection-deploy' }
        }, (response) => {
            if (response.statusCode === 302 || response.statusCode === 301) {
                // Follow redirects
                downloadFile(response.headers.location, filepath).then(resolve).catch(reject);
                return;
            }
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download: ${response.statusCode}`));
                return;
            }
            response.pipe(file);
        });

        file.on('finish', () => {
            file.close();
            resolve(filepath);
        });

        file.on('error', (err) => {
            fs.unlink(filepath, () => { });
            reject(err);
        });

        request.on('error', (err) => {
            fs.unlink(filepath, () => { });
            reject(err);
        });
    });
}

async function getLatestRelease() {
    return new Promise((resolve, reject) => {
        https.get(GITHUB_API_URL, {
            headers: { 'user-agent': 'naat-collection-deploy' }
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve(json);
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

async function main() {
    try {
        // Ensure bin directory exists
        if (!fs.existsSync(BIN_DIR)) {
            fs.mkdirSync(BIN_DIR, { recursive: true });
        }

        const { filename, executable } = getPlatformBinary();
        const binPath = path.join(BIN_DIR, filename);

        // Skip if already exists
        if (fs.existsSync(binPath)) {
            console.log(`✓ Binary already exists: ${filename}`);
            if (executable && process.platform !== 'win32') {
                fs.chmodSync(binPath, 0o755);
            }
            return;
        }

        console.log(`Downloading yt-dlp for ${process.platform}...`);

        const release = await getLatestRelease();
        const asset = release.assets.find(a => a.name === filename);

        if (!asset) {
            throw new Error(`No binary found for: ${filename}`);
        }

        console.log(`Downloading from: ${asset.browser_download_url}`);
        await downloadFile(asset.browser_download_url, binPath);

        // Make executable on Unix-like systems
        if (executable && process.platform !== 'win32') {
            fs.chmodSync(binPath, 0o755);
        }

        console.log(`✓ Downloaded: ${filename}`);
    } catch (error) {
        console.error('Error downloading yt-dlp:', error.message);
        process.exit(1);
    }
}

main();
