const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname)); // Servir les fichiers statiques depuis la racine
app.use(express.urlencoded({ extended: true }));

// Stockage des données en mémoire
let positions = [];
let avis = [
    {
        id: 1,
        name: "Mohamed T.",
        email: "mohamed@example.com",
        rating: 5,
        message: "Excellent système de suivi ! En tant que conducteur de bus, cela m'aide énormément à optimiser mes trajets et à fournir un meilleur service aux passagers.",
        public: true,
        createdAt: "2024-03-15T10:30:00Z"
    },
    {
        id: 2,
        name: "Sarah K.",
        email: "sarah@example.com",
        rating: 4,
        message: "En tant que passagère quotidienne, cette application a transformé mon expérience de transport. Je peux maintenant planifier mes déplacements avec précision.",
        public: true,
        createdAt: "2024-03-10T14:20:00Z"
    },
    {
        id: 3,
        name: "Ali M.",
        email: "ali@example.com",
        rating: 4.5,
        message: "Système très fiable et précis. La mise à jour en temps réel est impressionnante. Je recommande vivement à toutes les compagnies de transport.",
        public: true,
        createdAt: "2024-03-05T09:15:00Z"
    }
];

let users = [
    { 
        id: 1, 
        email: "admin@winouuuu.com", 
        password: "admin123", 
        name: "Administrateur",
        role: "admin"
    }
];

// ==================== ROUTES PRINCIPALES ====================

// Route pour la page d'accueil
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// Route pour la page GPS
app.get("/gps-tracker", (req, res) => {
    res.sendFile(path.join(__dirname, "gps-tracker.html"));
});

// Route pour la page de test simple
app.get("/simple-gps", (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>GPS Simple - Winouuuu Ikar</title>
            <style>
                body { font-family: Arial; padding: 20px; background: #f5f9ff; }
                .bus { background: white; padding: 15px; margin: 10px; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
                .header { background: #1a6fb4; color: white; padding: 20px; border-radius: 10px; margin-bottom: 20px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>🚌 Test GPS Simplifié</h1>
                <p>Version simple sans carte - Pour tests de connexion</p>
            </div>
            <div id="buses"></div>
            <script>
                async function loadBuses() {
                    try {
                        const res = await fetch('/api/positions');
                        const data = await res.json();
                        if(data.success) {
                            document.getElementById('buses').innerHTML = 
                                data.data.map(bus => \`
                                    <div class="bus">
                                        <strong>🚌 \${bus.device_id}</strong>
                                        \${bus.simulated ? '<span style="color: orange;">[SIMULÉ]</span>' : ''}<br>
                                        📍 Position: \${bus.latitude.toFixed(4)}, \${bus.longitude.toFixed(4)}<br>
                                        ⏱️ Mis à jour: \${new Date(bus.timestamp).toLocaleTimeString()}
                                    </div>
                                \`).join('') || '<p>Aucun bus suivi</p>';
                        }
                    } catch(e) {
                        document.getElementById('buses').innerHTML = '<p style="color: red;">Erreur de connexion au serveur</p>';
                    }
                }
                setInterval(loadBuses, 3000);
                loadBuses();
            </script>
        </body>
        </html>
    `);
});

// ==================== API AVIS ====================

// Récupérer tous les avis publics
app.get("/api/avis", (req, res) => {
    const publicAvis = avis.filter(a => a.public);
    
    res.json({
        success: true,
        count: publicAvis.length,
        data: publicAvis.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    });
});

// Ajouter un nouvel avis
app.post("/api/avis", (req, res) => {
    try {
        const { name, email, rating, message, public } = req.body;
        
        // Validation
        if (!name || !email || !rating || !message) {
            return res.status(400).json({
                success: false,
                error: "Tous les champs sont requis"
            });
        }

        const newAvis = {
            id: avis.length + 1,
            name,
            email,
            rating: parseFloat(rating),
            message,
            public: public !== false,
            createdAt: new Date().toISOString()
        };

        avis.push(newAvis);
        
        console.log(`📝 Nouvel avis ajouté par ${name} (${rating} étoiles)`);
        
        res.json({
            success: true,
            message: "Merci pour votre avis !",
            data: newAvis
        });
    } catch (error) {
        console.error("Erreur API Avis:", error);
        res.status(500).json({
            success: false,
            error: "Erreur interne du serveur"
        });
    }
});

// ==================== API GPS ====================

// Envoyer une position GPS (pour Arduino)
app.post("/api/gps", (req, res) => {
    try {
        const { device_id, latitude, longitude, speed, direction } = req.body;
        
        // Validation des données
        if (!device_id || !latitude || !longitude) {
            return res.status(400).json({
                success: false,
                error: "Données manquantes. Requis: device_id, latitude, longitude"
            });
        }

        const lat = parseFloat(latitude);
        const lon = parseFloat(longitude);
        
        if (isNaN(lat) || isNaN(lon)) {
            return res.status(400).json({
                success: false,
                error: "Latitude et longitude doivent être des nombres valides"
            });
        }

        // Créer l'objet position
        const newPosition = {
            device_id: device_id.toString(),
            latitude: lat,
            longitude: lon,
            timestamp: new Date().toISOString(),
            speed: speed || Math.random() * 80 + 20,
            direction: direction || Math.random() * 360,
            simulated: false
        };

        // Mettre à jour ou ajouter la position
        const existingIndex = positions.findIndex(p => p.device_id === device_id);
        if (existingIndex !== -1) {
            positions[existingIndex] = newPosition;
        } else {
            positions.push(newPosition);
        }

        console.log(`📍 GPS Position reçue: ${device_id} à (${lat}, ${lon})`);
        
        res.json({
            success: true,
            message: "Position GPS enregistrée avec succès",
            data: newPosition
        });
    } catch (error) {
        console.error("Erreur API GPS:", error);
        res.status(500).json({
            success: false,
            error: "Erreur interne du serveur"
        });
    }
});

// Récupérer toutes les positions
app.get("/api/positions", (req, res) => {
    // Filtrer les positions trop anciennes (plus de 2 heures)
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    positions = positions.filter(p => new Date(p.timestamp) > twoHoursAgo);
    
    res.json({
        success: true,
        count: positions.length,
        timestamp: new Date().toISOString(),
        data: positions
    });
});

// Récupérer une position spécifique
app.get("/api/positions/:device_id", (req, res) => {
    const device_id = req.params.device_id;
    const position = positions.find(p => p.device_id === device_id);
    
    if (!position) {
        return res.status(404).json({
            success: false,
            error: `Appareil ${device_id} non trouvé`
        });
    }
    
    res.json({
        success: true,
        data: position
    });
});

// ==================== API UTILISATEURS ====================

// Connexion utilisateur
app.post("/api/login", (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({
            success: false,
            error: "Email et mot de passe requis"
        });
    }

    const user = users.find(u => u.email === email && u.password === password);
    
    if (!user) {
        return res.status(401).json({
            success: false,
            error: "Email ou mot de passe incorrect"
        });
    }

    // Retourner les infos utilisateur (sans le mot de passe)
    const { password: _, ...userWithoutPassword } = user;
    
    res.json({
        success: true,
        message: "Connexion réussie",
        user: userWithoutPassword,
        token: "jwt-token-" + Date.now()
    });
});

// Inscription utilisateur
app.post("/api/register", (req, res) => {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
        return res.status(400).json({
            success: false,
            error: "Nom, email et mot de passe requis"
        });
    }

    if (users.find(u => u.email === email)) {
        return res.status(400).json({
            success: false,
            error: "Cet email est déjà utilisé"
        });
    }

    const newUser = {
        id: users.length + 1,
        name,
        email,
        password,
        role: "user",
        createdAt: new Date().toISOString()
    };

    users.push(newUser);
    
    const { password: _, ...userWithoutPassword } = newUser;
    
    res.json({
        success: true,
        message: "Inscription réussie",
        user: userWithoutPassword
    });
});

// ==================== API SIMULATION ====================

// Simuler des bus pour les tests
app.post("/api/simulate", (req, res) => {
    const { count = 5 } = req.body;
    
    // Supprimer les anciennes simulations
    positions = positions.filter(p => !p.simulated);
    
    // Coordonnées de base (Gabès, Tunisie)
    const baseLat = 33.88;
    const baseLon = 10.1;
    
    const simulatedBuses = [];
    
    for (let i = 1; i <= count; i++) {
        // Générer des positions aléatoires autour de Gabès
        const lat = baseLat + (Math.random() * 0.1 - 0.05);
        const lon = baseLon + (Math.random() * 0.1 - 0.05);
        
        const busData = {
            device_id: `bus_${i.toString().padStart(3, '0')}`,
            latitude: lat,
            longitude: lon,
            timestamp: new Date().toISOString(),
            speed: Math.random() * 60 + 20,
            direction: Math.random() * 360,
            simulated: true,
            route: `Ligne ${i % 3 + 1}`,
            passengers: Math.floor(Math.random() * 50)
        };
        
        positions.push(busData);
        simulatedBuses.push(busData);
    }
    
    console.log(`🚌 ${count} bus simulés créés`);
    
    res.json({
        success: true,
        message: `${count} bus simulés créés avec succès`,
        data: simulatedBuses
    });
});

// ==================== API STATISTIQUES ====================

// Obtenir les statistiques
app.get("/api/stats", (req, res) => {
    const now = new Date();
    const fiveMinutesAgo = new Date(now - 5 * 60 * 1000);
    const oneHourAgo = new Date(now - 60 * 60 * 1000);
    
    const activeBuses = positions.filter(p => new Date(p.timestamp) > fiveMinutesAgo);
    const recentBuses = positions.filter(p => new Date(p.timestamp) > oneHourAgo);
    
    res.json({
        success: true,
        data: {
            totalBuses: positions.length,
            activeBuses: activeBuses.length,
            recentBuses: recentBuses.length,
            simulatedBuses: positions.filter(p => p.simulated).length,
            realBuses: positions.filter(p => !p.simulated).length,
            avisCount: avis.filter(a => a.public).length,
            avisAverage: avis.filter(a => a.public).reduce((acc, curr) => acc + curr.rating, 0) / avis.filter(a => a.public).length || 0,
            lastUpdate: positions.length > 0 
                ? new Date(Math.max(...positions.map(p => new Date(p.timestamp))))
                : null,
            serverTime: now.toISOString()
        }
    });
});

// Nettoyer les anciennes positions
app.delete("/api/cleanup", (req, res) => {
    const initialCount = positions.length;
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    positions = positions.filter(p => new Date(p.timestamp) > oneHourAgo);
    
    res.json({
        success: true,
        message: `Nettoyage effectué: ${initialCount - positions.length} positions supprimées`,
        remaining: positions.length,
        deleted: initialCount - positions.length
    });
});

// ==================== API DE SANTÉ ====================

// Vérifier l'état du serveur
app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "🚀 Serveur Winouuuu Ikar en ligne",
        timestamp: new Date().toISOString(),
        version: "1.0.0",
        uptime: process.uptime(),
        endpoints: [
            "GET    /                   - Page d'accueil",
            "GET    /gps-tracker        - Page GPS temps réel",
            "GET    /simple-gps         - Page GPS simplifiée",
            "POST   /api/gps            - Envoyer position GPS",
            "GET    /api/positions      - Liste des positions",
            "GET    /api/avis           - Liste des avis",
            "POST   /api/avis           - Ajouter un avis",
            "POST   /api/simulate       - Simuler des bus",
            "POST   /api/login          - Connexion utilisateur",
            "POST   /api/register       - Inscription utilisateur",
            "GET    /api/stats          - Statistiques",
            "GET    /api/health         - État du serveur"
        ],
        stats: {
            positions: positions.length,
            avis: avis.filter(a => a.public).length,
            users: users.length
        }
    });
});

// ==================== GESTION DES ERREURS ====================

// Route 404
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: "Route non trouvée",
        path: req.path,
        method: req.method,
        available: [
            "/",
            "/gps-tracker", 
            "/simple-gps",
            "/api/positions",
            "/api/avis",
            "/api/gps",
            "/api/simulate",
            "/api/login",
            "/api/stats",
            "/api/health"
        ]
    });
});

// Gestion des erreurs globales
app.use((err, req, res, next) => {
    console.error("💥 Erreur serveur:", err);
    res.status(500).json({
        success: false,
        error: "Erreur interne du serveur",
        message: err.message,
        timestamp: new Date().toISOString()
    });
});

// ==================== DÉMARRAGE DU SERVEUR ====================

app.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔═══════════════════════════════════════════════════╗
║        🚌 WINOUUUU IKAR GPS SERVER v1.0          ║
╠═══════════════════════════════════════════════════╣
║ 🌐 URL: http://localhost:${PORT}                      ║
║ 📍 Port: ${PORT}                                      ║
║ 🚀 Mode: ${process.env.NODE_ENV || 'development'}            ║
║ 🕐 Démarrage: ${new Date().toLocaleTimeString('fr-FR')}         ║
╚═══════════════════════════════════════════════════╝

📡 ENDPOINTS DISPONIBLES:
├── 🌍 PAGES WEB
│   ├── GET  /              → Page d'accueil
│   ├── GET  /gps-tracker   → Suivi GPS temps réel
│   └── GET  /simple-gps    → Version simplifiée
│
├── 📍 API GPS
│   ├── POST /api/gps       → Envoyer position
│   ├── GET  /api/positions → Toutes positions
│   └── GET  /api/positions/:id → Position spécifique
│
├── ⭐ API AVIS
│   ├── GET  /api/avis      → Tous les avis
│   └── POST /api/avis      → Ajouter un avis
│
├── 👤 UTILISATEURS
│   ├── POST /api/login     → Connexion
│   └── POST /api/register  → Inscription
│
├── 🛠️  OUTILS
│   ├── POST /api/simulate  → Simuler bus
│   ├── GET  /api/stats     → Statistiques
│   ├── GET  /api/health    → État serveur
│   └── DELETE /api/cleanup → Nettoyage
│
└── ⚙️  ADMIN
    └── (Fonctions admin à venir)

💡 POUR COMMENCER:
1. Ouvrez http://localhost:${PORT} dans votre navigateur
2. Consultez les avis des utilisateurs
3. Cliquez sur "Accéder à la position des bus"
4. Sur la page GPS, cliquez sur "Simuler des bus"

🔧 COMMANDES DE TEST:
curl -X GET http://localhost:${PORT}/api/health
curl -X GET http://localhost:${PORT}/api/avis
curl -X POST http://localhost:${PORT}/api/simulate -H "Content-Type: application/json" -d '{"count":3}'

✅ SERVEUR PRÊT À RECEVOIR DES DONNÉES GPS ET DES AVIS
  `);
});