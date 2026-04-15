const { initializeApp } = require("firebase/app");
const { getDatabase, ref, get, update } = require("firebase/database");
const fs = require('fs');

// Read config from .env manually since this is a plain node script
const envContent = fs.readFileSync('c:/Users/user/Desktop/Workplace/SalesAnalyse/.env', 'utf8');
const config = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^VITE_FIREBASE_(\w+)=(.*)/);
    if (match) {
        const key = match[1].toLowerCase().replace(/_([a-z])/g, (g) => g[1].toUpperCase());
        config[key] = match[2].trim();
    }
});

// Map standard keys to Firebase config keys
const firebaseConfig = {
    apiKey: config.apiKey,
    authDomain: config.authDomain,
    databaseURL: config.databaseUrl,
    projectId: config.projectId,
    storageBucket: config.storageBucket,
    messagingSenderId: config.messagingSenderId,
    appId: config.appId
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const DB_PATH = 'all_products';
const jsonPath = 'c:/Users/user/Desktop/Workplace/SalesAnalyse/src/utils/initial_products.json';

async function migrate() {
    try {
        console.log("Reading JSON data...");
        const rawData = fs.readFileSync(jsonPath, 'utf8');
        const initialProducts = JSON.parse(rawData);

        console.log("Cleaning and deduplicating products...");
        const dataToSave = {};
        const map = new Map();

        initialProducts.forEach(r => {
            const rawName = r.product_name || '';
            const safeName = rawName.trim();
            const isMixInName = safeName.toLowerCase().includes('միքս');
            
            // Deduplicate by normalized name (lowercase, no dots)
            const normalized = safeName.toLowerCase().trim().replace(/\.$/, '');
            
            if (!isMixInName && !map.has(normalized)) {
                map.set(normalized, { id: r.product_id, name: safeName, isMix: false });
            }
        });

        const finalProds = Array.from(map.values());
        finalProds.forEach(p => {
            // Firebase keys cannot contain . # $ [ ] /
            const key = p.name.replace(/[.#$[\]/]/g, "_");
            dataToSave[key] = p;
        });

        console.log(`Uploading ${finalProds.length} products to Firebase...`);
        const dbRef = ref(db);
        await update(dbRef, { [DB_PATH]: dataToSave });
        
        console.log("Migration successful!");
        process.exit(0);
    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    }
}

migrate();
