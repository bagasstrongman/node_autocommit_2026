require("dotenv").config(); // Untuk membaca variabel lingkungan dari .env
const axios = require('axios');
const schedule = require('node-schedule');

// Konfigurasi GitHub
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OWNER = process.env.OWNER;
const REPO = process.env.REPO;
const BRANCH = process.env.BRANCH;

// Header untuk autentikasi
const headers = {
    Authorization: `token ${GITHUB_TOKEN}`,
    Accept: "application/vnd.github.v3+json",
};

// Jadwal kontribusi (Fly Morph Pattern)
const contributionDates = [
    // Tanggal-tanggal untuk pola kontribusi
    ['2025-01-01', '2025-01-02', '2025-01-03', '2025-01-04', '2025-01-05', '2025-01-06', '2025-01-07', '2025-01-08', '2025-01-09', '2025-01-10'],
    // Tambahkan pola lainnya...
];

// Fungsi untuk memperbarui README.md
async function appendDateToReadme(commitMessage, commitDate) {
    try {
        const filePath = "README.md"; // File yang akan diperbarui
        const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${filePath}`;

        let sha = null;
        let currentContent = "";

        // Cek apakah README.md sudah ada
        try {
            const response = await axios.get(url, { headers });
            sha = response.data.sha;
            currentContent = Buffer.from(response.data.content, "base64").toString("utf-8");
        } catch (error) {
            if (error.response && error.response.status === 404) {
                console.log(`File ${filePath} tidak ditemukan. Membuat file baru...`);
            } else {
                throw error;
            }
        }

        // Tambahkan tanggal baru
        const today = new Date(commitDate);
        const formattedDate = today.toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
        });
        const newContent = `${currentContent}\n- ${formattedDate}`;
        const base64Content = Buffer.from(newContent).toString("base64");

        // Request untuk memperbarui file
        const data = {
            message: commitMessage,
            content: base64Content,
            branch: BRANCH,
            ...(sha && { sha }),
        };

        const response = await axios.put(url, data, { headers });
        console.log(`README.md berhasil diperbarui: ${formattedDate}`);
        return response.data;
    } catch (error) {
        console.error("Error memperbarui README.md:", error.message);
        throw error;
    }
}

// Fungsi untuk menjalankan commit
async function appendCommitSession(commitCount, date, session) {
    for (let i = 0; i < commitCount; i++) {
        const commitMessage = `Auto-update README.md on ${date} (${session} commit #${i + 1})`;
        await appendDateToReadme(commitMessage, date);
    }
}

// Scheduler untuk commit otomatis
async function scheduleCommits() {
    schedule.scheduleJob("0 8 * * *", async () => {
        const today = new Date().toISOString().split("T")[0];
        const isFlyMorphDay = contributionDates.some(dates => dates.includes(today));
        const commitCount = isFlyMorphDay ? 4 : 3;

        console.log("Menjalankan commit pagi...");
        await appendCommitSession(commitCount, today, "pagi");
    });

    schedule.scheduleJob("0 20 * * *", async () => {
        const today = new Date().toISOString().split("T")[0];
        const isFlyMorphDay = contributionDates.some(dates => dates.includes(today));
        const commitCount = isFlyMorphDay ? 4 : 3;

        console.log("Menjalankan commit malam...");
        await appendCommitSession(commitCount, today, "malam");
    });
}

// Ekspor fungsi utama untuk Lambda
module.exports = async (req, res) => {
    try {
        const today = new Date().toISOString().split("T")[0];
        await appendCommitSession(3, today, "manual");
        res.status(200).send("Manual commit berhasil dijalankan!");
    } catch (error) {
        console.error("Error:", error.message);
        res.status(500).send(`Error: ${error.message}`);
    }
};

// Aktifkan scheduler
scheduleCommits();


