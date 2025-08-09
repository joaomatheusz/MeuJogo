// --- ELEMENTOS DO JOGO ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('scoreEl');
const modalEl = document.getElementById('modalEl');
const bigScoreEl = document.getElementById('bigScoreEl');
const startGameBtn = document.getElementById('startGameBtn');
const powerUpStatusEl = document.getElementById('powerUpStatus');
const uiContainer = document.getElementById('uiContainer');
const highScoreEl = document.getElementById('highScoreEl');

const somDeTiro = new Audio('laser.wav');

// --- MENU DE PAUSE ---
const pauseMenuEl = document.createElement('div');
pauseMenuEl.id = 'pauseMenu';
pauseMenuEl.style.display = 'none';
pauseMenuEl.innerHTML = `<div class="modal-content"><h1>Jogo Pausado</h1><button id="resumeGameBtn">Continuar</button></div>`;
document.body.appendChild(pauseMenuEl);
const resumeGameBtn = document.getElementById('resumeGameBtn');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const mouse = { x: canvas.width / 2, y: canvas.height / 2 };

// --- CLASSES DO JOGO ---

class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 15;
        this.color = 'hsl(204, 86%, 53%)';
        this.angle = 0;
        this.velocity = { x: 0, y: 0 };
        this.acceleration = 0.2;
        this.maxSpeed = 5;
        this.friction = 0.97;
        this.powerUp = null;
        this.shieldActive = false;
        this.shieldDuration = 5000;
        this.shieldTimer = null;
        this.comboCounter = 0;
        this.lastKillTime = 0;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.beginPath();
        ctx.moveTo(0, -this.radius);
        ctx.lineTo(-this.radius * 0.8, this.radius * 0.8);
        ctx.lineTo(this.radius * 0.8, this.radius * 0.8);
        ctx.closePath();
        ctx.strokeStyle = this.color;
        ctx.stroke();
        ctx.restore();

        if (this.shieldActive) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 5, 0, Math.PI * 2, false);
            ctx.strokeStyle = 'rgba(52, 152, 219, 0.8)';
            ctx.lineWidth = 3;
            ctx.stroke();
        }
    }

    update() {
        this.angle = Math.atan2(mouse.y - this.y, mouse.x - this.x);
        if (keys.w.pressed) this.velocity.y -= this.acceleration;
        if (keys.s.pressed) this.velocity.y += this.acceleration;
        if (keys.a.pressed) this.velocity.x -= this.acceleration;
        if (keys.d.pressed) this.velocity.x += this.acceleration;

        const speed = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
        if (speed > this.maxSpeed) {
            this.velocity.x = (this.velocity.x / speed) * this.maxSpeed;
            this.velocity.y = (this.velocity.y / speed) * this.maxSpeed;
        }

        this.velocity.x *= this.friction;
        this.velocity.y *= this.friction;
        
        const modificarVelocidade = efeitosPerigo(this);

        this.x += this.velocity.x * modificarVelocidade;
        this.y += this.velocity.y * modificarVelocidade;

        this.clampToScreen();
        this.draw();
    }

    clampToScreen() {
        if (this.x - this.radius < 0) this.x = this.radius;
        if (this.x + this.radius > canvas.width) this.x = canvas.width - this.radius;
        if (this.y - this.radius < 0) this.y = this.radius;
        if (this.y + this.radius > canvas.height) this.y = canvas.height - this.radius;
    }

    activateShield() {
        this.shieldActive = true;
        powerUpStatusEl.textContent = 'Escudo Ativo!';
        powerUpStatusEl.style.display = 'block';
        clearTimeout(this.shieldTimer);
        this.shieldTimer = setTimeout(() => {
            this.shieldActive = false;
            powerUpStatusEl.style.display = 'none';
        }, this.shieldDuration);
    }

    resetCombo() {
        this.comboCounter = 0;
        document.getElementById('comboStatus').style.display = 'none';
    }
}

class Projectile {
    constructor(x, y, radius, color, velocity) { 
        this.x = x; this.y = y; this.radius = radius; 
        this.color = color; this.velocity = velocity; 
    }
    draw() { 
        ctx.beginPath(); 
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false); 
        ctx.fillStyle = this.color; ctx.fill(); 
    }
    update() { 
        this.draw(); 
        
        const modificarVelocidade = efeitosPerigo(this);

        this.x += this.velocity.x * modificarVelocidade; 
        this.y += this.velocity.y * modificarVelocidade;
    }
}

class Enemy {
    constructor(x, y, radius, color, velocity, health = 1) { 
        this.x = x; this.y = y; this.radius = radius; 
        this.color = color; this.velocity = velocity;
        this.health = health;
        this.maxHealth = health;
    }
    draw() { 
        ctx.beginPath(); 
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false); 
        ctx.fillStyle = this.color; 
        ctx.fill(); 
    }
    update() { 
        this.draw(); 
        
        const modificarVelocidade = efeitosPerigo(this);

        this.x += this.velocity.x * modificarVelocidade; 
        this.y += this.velocity.y * modificarVelocidade;
    }
}

class DividingEnemy extends Enemy {
    constructor(x, y, radius, color, velocity) {
        super(x, y, radius, color, velocity, 2);
        this.color = '#e74c3c';
    }
    draw() {
        ctx.beginPath();
        ctx.moveTo(this.x, this.y - this.radius);
        ctx.lineTo(this.x + this.radius, this.y + this.radius);
        ctx.lineTo(this.x - this.radius, this.y + this.radius);
        ctx.closePath();
        ctx.fillStyle = this.color;
        ctx.fill();
    }
    divide() {
        if (this.radius > 10) {
            for (let i = 0; i < 2; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 2;
                const newVelocity = { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed };
                enemies.push(new Enemy(this.x, this.y, this.radius / 2, 'hsl(204, 86%, 53%)', newVelocity));
            }
        }
    }
}

class KamikazeEnemy extends Enemy {
    constructor(x, y, radius, velocity) {
        super(x, y, radius, '#9b59b6', velocity, 1);
        // Aumenta a velocidade para o ataque kamikaze
        const speed = 4;
        const angle = Math.atan2(player.y - this.y, player.x - this.x);
        this.velocity = { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed };
    }
    draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y - this.radius);
        ctx.lineTo(this.x + this.radius, this.y);
        ctx.lineTo(this.x, this.y + this.radius);
        ctx.lineTo(this.x - this.radius, this.y);
        ctx.closePath();
        ctx.fill();
    }
}

class MineLayerEnemy extends Enemy {
    constructor(x, y, radius, velocity) {
        super(x, y, radius, '#f1c40f', velocity, 3);
        this.mineCooldown = 150;
    }
    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);
    }
    update() {
        super.update();
        this.mineCooldown--;
        if (this.mineCooldown <= 0 && !isPaused) {
            mines.push(new Mine(this.x, this.y));
            this.mineCooldown = 150;
        }
    }
}

class Mine {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 7;
        this.color = '#e67e22';
        this.triggerRadius = 50;
        this.fuse = 60; // Tempo para a mina armar
        this.isArmed = false;
        this.lifeTime = 600;
        this.isTriggered = false;
        this.explosionFuse = 90;    
    }
    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.isArmed ? this.color : 'gray';
        ctx.fill();
        if (this.isArmed && !this.isTriggered) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.triggerRadius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(230, 126, 34, 0.3)';
            ctx.stroke();
        }
    }
    update() {
        if (!this.isArmed) {
            this.fuse--;
            if (this.fuse <= 0) this.isArmed = true;
        }
        if (this.isTriggered){
            this.explosionFuse--;
        }

        this.lifeTime--;
        this.draw();
    }
    explode() {
        for (let i = 0; i < 20; i++) {
            particles.push(new Particle(this.x, this.y, Math.random() * 3, this.color, {
                x: (Math.random() - 0.5) * 8,
                y: (Math.random() - 0.5) * 8
            }));
        }
    }
}

class HealerEnemy extends Enemy {
    constructor(x, y, radius, velocity) {
        super(x, y, radius, '#2ecc71', velocity, 4);
        this.healCooldown = 200;
        this.healRadius = 100;
    }
    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);
        ctx.fillStyle = 'white';
        ctx.font = `${this.radius}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('+', this.x, this.y);
    }
    update() {
        super.update();
        this.healCooldown--;
        if (this.healCooldown <= 0 && !isPaused) {
            this.heal();
            this.healCooldown = 200;
        }
    }
    heal() {
        // Efeito visual do pulso de cura
        particles.push(new HealingPulse(this.x, this.y, this.healRadius, this.color));
        enemies.forEach(enemy => {
            if (enemy !== this && Math.hypot(this.x - enemy.x, this.y - enemy.y) < this.healRadius) {
                enemy.health = Math.min(enemy.maxHealth, enemy.health + 1);
            }
        });
    }
}

class Mothership extends Enemy {
    constructor(x, y) {
        super(x, y, 80, '#34495e', { x: 0, y: 1 }, 100);
        this.attackPattern = 'spawning';
        this.patternCooldown = 200; // Tempo em cada padrão
        this.shotAngle = 0;
    }

    draw() {
        // Corpo principal
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.ellipse(this.x, this.y, this.radius, this.radius * 0.8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Barra de vida
        const healthBarWidth = 200;
        const healthBarHeight = 15;
        ctx.fillStyle = 'red';
        ctx.fillRect(this.x - healthBarWidth / 2, this.y - this.radius - 30, healthBarWidth, healthBarHeight);
        ctx.fillStyle = 'green';
        ctx.fillRect(this.x - healthBarWidth / 2, this.y - this.radius - 30, healthBarWidth * (this.health / this.maxHealth), healthBarHeight);
    }

    update() {
        super.update();

        this.patternCooldown--;
        if (this.patternCooldown <= 0) {
            const patterns = ['spiral', 'summon', 'charge'];
            this.attackPattern = patterns[Math.floor(Math.random() * patterns.length)];
            this.patternCooldown = Math.random() * 200 + 300; // Duração do próximo padrão
            
            if (this.attackPattern === 'charge') {
                const angle = Math.atan2(player.y - this.y, player.x - this.x);
                this.velocity = { x: Math.cos(angle) * 4, y: Math.sin(angle) * 4 };
                this.patternCooldown = 120; // Carga dura menos
            } else {
                 this.velocity = { x: 0, y: 0.5 };
            }
        }
        
        // Mantém o chefe na parte superior da tela
        if (this.y > canvas.height / 4) {
            this.velocity.y = 0;
        }

        // Executa o ataque
        if (!isPaused) {
            switch (this.attackPattern) {
                case 'spiral':
                    const speed = 4;
                    enemyProjectiles.push(new EnemyProjectile(this.x, this.y, {
                        x: Math.cos(this.shotAngle) * speed,
                        y: Math.sin(this.shotAngle) * speed
                    }));
                    this.shotAngle += 0.2;
                    break;
                case 'summon':
                    if (this.patternCooldown % 60 === 0) { // Invoca a cada segundo
                        enemies.push(new KamikazeEnemy(this.x, this.y, 10, {}));
                    }
                    break;
            }
        }
    }
}

// --- CLASSES DE CENÁRIO E EFEITOS ---

class PowerUp {
    constructor(x, y, velocity, type) { 
        this.x = x; this.y = y; this.velocity = velocity;
        this.radius = 8;
        this.type = type;
        this.color = this.getColor();
    }
    getColor() {
        switch(this.type) {
            case 'TripleShot': return '#2ecc71';
            case 'Shield': return '#3498db';
            case 'Freeze': return '#3498db';
            default: return 'white';
        }
    }
    getIcon() {
        switch(this.type) {
            case 'TripleShot': return '3X';
            case 'Shield': return 'S';
            case 'Freeze': return 'F';
            default: return '';
        }
    }
    draw() { 
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.font = '10px Arial';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.getIcon(), this.x, this.y); 
    }
    update() { 
        this.draw();
        this.x += this.velocity.x;
        this.y += this.velocity.y;
    }
}

const friction = 0.99;
class Particle {
    constructor(x, y, radius, color, velocity) { 
        this.x = x; this.y = y; this.radius = radius; this.color = color; 
        this.velocity = velocity; this.alpha = 1; 
    }
    draw() { 
        ctx.save(); 
        ctx.globalAlpha = this.alpha; 
        ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false); 
        ctx.fillStyle = this.color; ctx.fill(); ctx.restore(); 
    }
    update() { 
        this.draw(); 
        this.velocity.x *= friction; 
        this.velocity.y *= friction; 
        this.x += this.velocity.x; 
        this.y += this.velocity.y; 
        this.alpha -= 0.01; 
    }
}

class HealingPulse extends Particle {
    constructor(x, y, radius, color) {
        super(x, y, 5, color, { x: 0, y: 0 });
        this.maxRadius = radius;
    }
    draw() {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
    }
    update() {
        this.draw();
        this.radius += 2;
        this.alpha -= 0.02;
    }
}

class EnemyProjectile {
    constructor(x, y, velocity) { 
        this.x = x; 
        this.y = y; 
        this.radius = 4; 
        this.color = '#e74c3c'; 
        this.velocity = velocity;
    }
    draw() { 
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false); 
        ctx.fillStyle = this.color; 
        ctx.fill(); 
    }
    update() { 
        this.draw(); 
        this.x += this.velocity.x; 
        this.y += this.velocity.y; 
    }
}

class ShootingEnemy extends Enemy {
    constructor(x, y, velocity) { 
        super(x, y, 12, '#e74c3c', velocity, 1);
        this.shootCooldown = Math.random() * 100 + 50; 
    }
    draw() { 
        ctx.fillStyle = this.color; 
        ctx.fillRect(this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2); 
    }
    shoot() { 
        const angle = Math.atan2(player.y - this.y, player.x - this.x); 
        const speed = 4; 
        enemyProjectiles.push(new EnemyProjectile(this.x, this.y, { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed })); 
    }
    update() { 
        super.update(); 
        this.shootCooldown--; 
        if (this.shootCooldown <= 0 && !isPaused) { 
            this.shoot(); 
            this.shootCooldown = 120; 
        } 
    }
}

class Asteroid {
    constructor(x, y, radius, velocity) {
        this.x = x; this.y = y; this.velocity = velocity; this.radius = radius;
        this.color = '#7f8c8d'; this.shapePoints = [];
        const numVertices = Math.floor(Math.random() * 5 + 10);
        for (let i = 0; i < numVertices; i++) {
            const angle = (i / numVertices) * Math.PI * 2;
            const randomRadius = this.radius * (Math.random() * 0.4 + 0.8);
            this.shapePoints.push({ x: Math.cos(angle) * randomRadius, y: Math.sin(angle) * randomRadius });
        }
    }
    draw() {
        ctx.beginPath();
        ctx.moveTo(this.x + this.shapePoints[0].x, this.y + this.shapePoints[0].y);
        for (let i = 1; i < this.shapePoints.length; i++) {
            ctx.lineTo(this.x + this.shapePoints[i].x, this.y + this.shapePoints[i].y);
        }
        ctx.closePath(); ctx.strokeStyle = this.color; ctx.lineWidth = 2; ctx.stroke();
    }
    update() { this.draw(); this.x += this.velocity.x; this.y += this.velocity.y; }
}

class Nebula {
    constructor(x, y, radius) {
        this.x = x; this.y = y; this.radius = radius;
        this.color = 'rgba(155, 89, 182, 0.2)';
    }
    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
    }
    update() { this.draw(); }
}

class BlackHole {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.radius = 15; // Raio da destruição
        this.gravityRadius = 150; // Raio da atração
        this.color = 'black';
    }
    draw() {
        // Efeito de lente gravitacional (distorção)
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.gravityRadius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(100, 100, 255, 0.3)';
        ctx.stroke();
        // Núcleo
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
    }
    update() { this.draw(); }
    
    applyGravity(entity) {
        const dist = Math.hypot(this.x - entity.x, this.y - entity.y);
        if (dist < this.gravityRadius) {
            const angle = Math.atan2(this.y - entity.y, this.x - entity.x);
            const force = 1 - (dist / this.gravityRadius); // Força aumenta com a proximidade
            entity.velocity.x += Math.cos(angle) * force * 0.3;
            entity.velocity.y += Math.sin(angle) * force * 0.3;
        }
    }
}


// --- VARIÁVEIS GLOBAIS ---
let player, projectiles, enemies, particles, asteroids, powerUps, enemyProjectiles, mines, hazards;
let score, animationId, highScore;
let difficultyLevel, enemySpawnRate, asteroidSpawnRate, hazardSpawnRate;
let spawnEnemiesIntervalId, spawnAsteroidsIntervalId, powerUpSpawnIntervalId, hazardSpawnIntervalId;
let isPaused = false;
let boss = null;
let bossActive = false;
let bossDefeated = false;

const keys = { 
    w: { pressed: false }, a: { pressed: false }, 
    s: { pressed: false }, d: { pressed: false },
};

const comboStatusEl = document.createElement('p');
comboStatusEl.id = 'comboStatus';
comboStatusEl.style.position = 'absolute';
comboStatusEl.style.top = '80px';
comboStatusEl.style.left = '20px';
comboStatusEl.style.fontSize = '1.2em';
comboStatusEl.style.color = '#f39c12';
comboStatusEl.style.display = 'none';
uiContainer.appendChild(comboStatusEl);

function efeitosPerigo(entity){
    let modificarVelocidade = 1;

    hazards.forEach(hazard => {
        if (hazard instanceof Nebula && Math.hypot(entity.x - hazard.x, entity.y - hazard.y) < hazard.radius){
            modificarVelocidade = 0.5
        }
    })

    return modificarVelocidade;
}

function init() {
    player = new Player(canvas.width / 2, canvas.height / 2);
    projectiles = []; enemies = []; particles = []; asteroids = []; 
    powerUps = []; enemyProjectiles = []; mines = []; hazards = [];
    score = 0; 
    scoreEl.textContent = score; 
    bigScoreEl.textContent = score;
    difficultyLevel = 1;
    enemySpawnRate = 1800;
    asteroidSpawnRate = 5000;
    hazardSpawnRate = 12000;
    isPaused = false;
    boss = null;
    bossActive = false;
    bossDefeated = false;
    player.comboCounter = 0;
    player.lastKillTime = 0;
    highScore = localStorage.getItem('spaceBattleHighScore') || 0;
    highScoreEl.textContent = `Recorde: ${highScore}`;
}

function spawnObjects() {
    clearInterval(spawnEnemiesIntervalId); 
    clearInterval(spawnAsteroidsIntervalId);
    clearInterval(powerUpSpawnIntervalId);
    clearInterval(hazardSpawnIntervalId);

    function spawnEnemy() {
        if (isPaused || bossActive) return;
        const radius = Math.random() * (30 - 8) + 8; let x, y;
        if (Math.random() < 0.5) { x = Math.random() < 0.5 ? 0 - radius : canvas.width + radius; 
            y = Math.random() * canvas.height; } else { x = Math.random() * canvas.width; 
            y = Math.random() < 0.5 ? 0 - radius : canvas.height + radius; 
        }
        const angle = Math.atan2(player.y - y, player.x - x); 
        const velocity = { x: Math.cos(angle), y: Math.sin(angle) };
        
        const enemyType = Math.random();
        if (enemyType < 0.1) {
            enemies.push(new HealerEnemy(x, y, 15, velocity));
        } else if (enemyType < 0.2) {
            enemies.push(new MineLayerEnemy(x, y, 15, velocity));
        } else if (enemyType < 0.35) {
            enemies.push(new KamikazeEnemy(x, y, 10, velocity));
        } else if (enemyType < 0.5) {
            enemies.push(new DividingEnemy(x, y, 15, 'red', velocity));
        } else if (enemyType < 0.7) {
            enemies.push(new ShootingEnemy(x, y, velocity));
        } else {
            enemies.push(new Enemy(x, y, radius, `hsl(${Math.random() * 360}, 50%, 50%)`, velocity));
        }
    }
    spawnEnemiesIntervalId = setInterval(spawnEnemy, enemySpawnRate);

    spawnAsteroidsIntervalId = setInterval(() => {
        if (isPaused || bossActive) return;
        const radius = Math.random() * (50 - 20) + 20; 
        let x, y;
        if (Math.random() < 0.5) { 
            x = Math.random() < 0.5 ? 0 - radius : canvas.width + radius; 
            y = Math.random() * canvas.height; } else { x = Math.random() * canvas.width; y = Math.random() < 0.5 ? 0 - radius : canvas.height + radius; 
            }
        const angle = Math.atan2(player.y - y, player.x - x);
        const velocity = { x: Math.cos(angle) * 0.8, y: Math.sin(angle) * 0.8 };
        asteroids.push(new Asteroid(x, y, radius, velocity));
    }, asteroidSpawnRate);

    powerUpSpawnIntervalId = setInterval(() => {
        if (isPaused || bossActive) return;
        if (Math.random() > 0.5) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const velocity = { x: (Math.random() - 0.5), y: (Math.random() - 0.5) };
            const powerUpTypes = ['TripleShot', 'Shield', 'Freeze'];
            const randomType = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
            powerUps.push(new PowerUp(x, y, velocity, randomType));
        }
    }, 15000);
    
    hazardSpawnIntervalId = setInterval(() => {
        if (isPaused || bossActive) return;
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        if (Math.random() < 0.4) {
            hazards.push(new BlackHole(x, y));
        } else {
            hazards.push(new Nebula(x, y, Math.random() * 100 + 80));
        }
        // Remove perigos antigos
        if (hazards.length > 5) {
            hazards.shift();
        }
    }, hazardSpawnRate);
}

function updateDifficulty() {
    difficultyLevel++;
    enemySpawnRate = Math.max(250, 1800 - difficultyLevel * 150);
    asteroidSpawnRate = Math.max(2000, 5000 - difficultyLevel * 200);
    hazardSpawnRate = Math.max(5000, 12000 - difficultyLevel * 500);
    spawnObjects();
}

function togglePause() {
    isPaused = !isPaused;
    if (isPaused) {
        cancelAnimationFrame(animationId);
        pauseMenuEl.style.display = 'flex';
    } else {
        animationId = requestAnimationFrame(animate);
        pauseMenuEl.style.display = 'none';
    }
}

function triggerBossFight() {
    if (bossActive) return;
    bossActive = true;
    // Limpa inimigos normais para a luta do chefe
    enemies = [];
    asteroids = [];
    boss = new Mothership(canvas.width / 2, -100);
    enemies.push(boss); // Adiciona o chefe à lista de inimigos para tratamento de colisões
}

function animate() {
    if (isPaused) return;

    animationId = requestAnimationFrame(animate);
    ctx.fillStyle = 'rgba(0, 0, 10, 0.2)'; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if (score >= 5000 && !bossActive && !boss && !bossDefeated) {
        triggerBossFight();
    }
    
    if (score > difficultyLevel * 1000 && !bossActive) { 
        updateDifficulty(); 
    }
    
    hazards.forEach(hazard => {
        hazard.update();
        if (hazard instanceof BlackHole) {
            [player, ...enemies, ...projectiles, ...particles].forEach(entity => {
                hazard.applyGravity(entity);
                if(Math.hypot(hazard.x - entity.x, hazard.y - entity.y) < hazard.radius) {
                    // Lógica para remover a entidade
                    if (entity instanceof Player && !entity.shieldActive) endGame();
                    // Implementar remoção de outras entidades
                }
            });
        }
    });

    player.update();
    
    particles.forEach((p, i) => { 
        if (p.alpha <= 0 || p.radius <= 0) particles.splice(i, 1); 
        else p.update(); 
    });
    
    projectiles.forEach((p, i) => { 
        if (p.x < 0 || p.x > canvas.width || p.y < 0 || p.y > canvas.height) projectiles.splice(i, 1); 
        else p.update(); 
    });
    
    enemyProjectiles.forEach((ep, i) => { 
        ep.update(); 
        if (Math.hypot(player.x - ep.x, player.y - ep.y) - player.radius - ep.radius < 1) { 
            if (!player.shieldActive) { endGame(); }
            enemyProjectiles.splice(i, 1);
        }
    });

    for (let i = mines.length - 1; i >= 0; i--) {
        const mine = mines[i];
        if (!mine) continue;

        mine.update();

        if (mine.isTriggered && mine.explosionFuse <= 0) {
            mine.explode();

            const distanciaExplosao = Math.hypot(player.x - mine.x, player.y - mine.y);

            if (distanciaExplosao < mine.triggerRadius && !player.shieldActive) {
                endGame();
            }

            mines.splice(i, 1);
            continue;
        }
        if (mine.lifeTime <= 0) {
            mines.splice(i, 1);
            continue;
        }

        const distanciaJogador = Math.hypot(player.x - mine.x, player.y - mine.y);
        if (mine.isArmed && !mine.isTriggered && distanciaJogador < mine.triggerRadius){
            mine.isTriggered = true;
        }
    }
    
    powerUps.forEach((p, i) => { 
        p.update(); 
        if (Math.hypot(player.x - p.x, player.y - p.y) - player.radius - p.radius < 1) { 
            activatePowerUp(p.type);
            powerUps.splice(i, 1); 
        } 
    });

    // Na função animate(), SUBSTITUA os dois loops de inimigos por ESTE:

for (let enemyIndex = enemies.length - 1; enemyIndex >= 0; enemyIndex--) {
    const enemy = enemies[enemyIndex];

    // 1. Otimização para remover inimigos fora da tela (Culling)
    if (
        !(enemy instanceof Mothership) &&
        (enemy.x + enemy.radius < 0 ||
         enemy.x - enemy.radius > canvas.width ||
         enemy.y + enemy.radius < 0 ||
         enemy.y - enemy.radius > canvas.height)
    ) {
        enemies.splice(enemyIndex, 1);
        continue; // Pula para o próximo inimigo
    }

    enemy.update();

    // 2. Lógica de colisão com o jogador
    if (Math.hypot(player.x - enemy.x, player.y - enemy.y) - player.radius - enemy.radius < 1) {
        if (!player.shieldActive) {
            endGame();
        } else {
            enemies.splice(enemyIndex, 1);
            continue; // Inimigo destruído pelo escudo, pula para o próximo
        }
    }

    // 3. Lógica de colisão com projéteis do jogador
    projectiles.forEach((proj, projIndex) => {
        // Checa se o projétil ainda existe antes de testar a colisão
        if (!enemies[enemyIndex]) return;

        const dist = Math.hypot(proj.x - enemy.x, proj.y - enemy.y);
        if (dist - enemy.radius - proj.radius < 1) {
            
            // Cria as partículas da explosão
            for (let i = 0; i < enemy.radius * 2; i++) {
                particles.push(new Particle(proj.x, proj.y, Math.random() * 2, enemy.color, {
                    x: (Math.random() - 0.5) * (Math.random() * 6),
                    y: (Math.random() - 0.5) * (Math.random() * 6)
                }));
            }
            
            // Reduz a vida do inimigo
            enemy.health--;
            
            // Remove o projétil que colidiu
            projectiles.splice(projIndex, 1);

            // Se a vida do inimigo chegou a zero
            if (enemy.health <= 0) {
                if (enemy instanceof Mothership) {
                    score += 5000;
                    bossActive = false;
                    boss = null;
                    bossDefeated = true;
                    spawnObjects();
                } else {
                    // Lógica de pontuação e combo
                    const currentTime = Date.now();
                    if (currentTime - player.lastKillTime < 1000) {
                        player.comboCounter++;
                    } else {
                        player.resetCombo();
                    }
                    player.lastKillTime = currentTime;
                    if (player.comboCounter > 1) {
                        comboStatusEl.style.display = 'block';
                        comboStatusEl.textContent = `Combo x${player.comboCounter}!`;
                        score += 50 * player.comboCounter;
                    }

                    let points = 100;
                    if (enemy instanceof ShootingEnemy) points = 150;
                    if (enemy instanceof DividingEnemy) points = 200;
                    if (enemy instanceof MineLayerEnemy) points = 120;
                    if (enemy instanceof KamikazeEnemy) points = 75;
                    if (enemy instanceof HealerEnemy) points = 250;
                    score += points;
                    
                    if (enemy instanceof DividingEnemy) enemy.divide();
                }
                
                scoreEl.textContent = score;
                enemies.splice(enemyIndex, 1); // Remove o inimigo morto
            }
        }
    });
}

    asteroids.forEach((asteroid, astIndex) => {
        asteroid.update();
        if (Math.hypot(player.x - asteroid.x, player.y - asteroid.y) - player.radius - asteroid.radius < 1) { 
            if (!player.shieldActive) { endGame(); }
            else { asteroids.splice(astIndex, 1); }
        }
        projectiles.forEach((proj, projIndex) => {
            if (Math.hypot(proj.x - asteroid.x, proj.y - asteroid.y) - asteroid.radius - proj.radius < 1) {
                for (let i = 0; i < asteroid.radius; i++) { 
                    particles.push(new Particle(proj.x, proj.y, Math.random() * 2, asteroid.color, { x: (Math.random() - 0.5) * 4, y: (Math.random() - 0.5) * 4 })); 
                }
                projectiles.splice(projIndex, 1);
                asteroids.splice(astIndex, 1);
                score += 25;
                scoreEl.textContent = score;
            }
        });
    });
}

function endGame() {
    cancelAnimationFrame(animationId);
    clearInterval(spawnEnemiesIntervalId);
    clearInterval(spawnAsteroidsIntervalId);
    clearInterval(powerUpSpawnIntervalId);
    clearInterval(hazardSpawnIntervalId);

    if (score > highScore) {
        highScore = score;
        localStorage.setItem('spaceBattleHighScore', highScore);
        highScoreEl.textContent = `Novo Recorde: ${highScore}`;
    }

    modalEl.style.display = 'flex';
    bigScoreEl.textContent = score;
}

function activatePowerUp(type) {
    powerUpStatusEl.style.display = 'block';
    let duration = 7000;
    switch(type) {
        case 'TripleShot':
            player.powerUp = 'TripleShot';
            powerUpStatusEl.textContent = 'Tiro Triplo Ativo!';
            setTimeout(() => { player.powerUp = null; powerUpStatusEl.style.display = 'none'; }, duration);
            break;
        case 'Shield':
            player.activateShield();
            break;
        case 'Freeze':
            powerUpStatusEl.textContent = 'Inimigos Congelados!';
            const originalVelocities = enemies.map(e => ({ ...e.velocity }));
            enemies.forEach(e => { e.velocity = { x: 0, y: 0 }; });
            setTimeout(() => {
                enemies.forEach((e, i) => {
                    if (originalVelocities[i]) { e.velocity = originalVelocities[i]; }
                });
                powerUpStatusEl.style.display = 'none';
            }, 3000); // Freeze dura menos tempo
            break;
    }
}

// --- EVENT LISTENERS ---

window.addEventListener('mousemove', (event) => { mouse.x = event.clientX; mouse.y = event.clientY; });

window.addEventListener('click', () => {
    if (isPaused) return;

    somDeTiro.currentTime = 0;
    somDeTiro.play();

    const speed = 7;
    const velocity = { x: Math.cos(player.angle) * speed, y: Math.sin(player.angle) * speed };

    if (player.powerUp === 'TripleShot') {
        for (let i = -1; i <= 1; i++) {
            const offsetAngle = 0.2 * i;
            projectiles.push(new Projectile(player.x, player.y, 5, '#f1c40f',
               { x: Math.cos(player.angle + offsetAngle) * speed, y: Math.sin(player.angle + offsetAngle) * speed }));
        }
    } else {
        projectiles.push(new Projectile(player.x, player.y, 5, 'white', velocity));
    }
});

window.addEventListener('keydown', (event) => { 
    const key = event.key.toLowerCase(); 
    if (key in keys) { keys[key].pressed = true; } 
    if (key === 'p' || event.key === 'Escape') {
        // Não pausa durante a luta com o chefe
        if (bossActive) return;
        togglePause();
    }
});

window.addEventListener('keyup', (event) => { const key = event.key.toLowerCase(); if (key in keys) { keys[key].pressed = false; } });

startGameBtn.addEventListener('click', () => { 
    init(); 
    animate(); 
    spawnObjects(); 
    modalEl.style.display = 'none'; 
});

resumeGameBtn.addEventListener('click', togglePause);

window.addEventListener('resize', () => { canvas.width = innerWidth; canvas.height = innerHeight; init(); });

// Inicia o jogo pela primeira vez
init();