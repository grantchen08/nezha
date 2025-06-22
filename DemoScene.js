/**
 * Represents the main scene for the RTS demo.
 * Handles game logic, asset loading, and rendering.
 * Core lifecycle methods. Helper methods are attached via prototype in main.js.
 */
class DemoScene extends Phaser.Scene {
  constructor() {
    super({ key: 'DemoScene' });
    // Game state variables
    this.wood = 0; // Player's wood count
    this.aiWood = 0; // AI's wood count
    this.worker = null; // The player-controlled worker sprite
    this.house = null; // The player house sprite
    this.aiHouse = null; // AI house sprite
    this.aiWorker = null; // AI worker sprite
    this.trees = null; // Group containing tree sprites
    this.playerBarrack = null; // Reference to the player's barrack building
    this.playerBarrackBuilding = false; // Flag: Is the player barrack currently under construction?
    this.aiBarrack = null; // Reference to the AI's barrack building
    this.aiBarrackBuilding = false; // Flag: Is the AI barrack currently under construction?
    this.playerSpearmen = []; // Array for player spearmen
    this.aiSpearmen = []; // Array for AI spearmen
    this.woodText = null; // Text object to display player wood count
    this.aiWoodText = null; // Text object to display AI wood count
    this.debugText = null; // Text object for displaying debug messages
    this.workerWalkSound = null; // Sound effect for worker walking
    this.chopSound = null; // Sound effect for chopping / building
    this.spearmanAttackSound = null; // Sound effect for spearman attacking
    this.unitDieSound = null; // Sound effect for unit death
    this.buildingFallSound = null; // Sound effect for building destruction
    this.gameStarted = false; // Flag to prevent logic running before start
    this.gameOver = false; // Flag to prevent multiple end game calls
    this.selectedWorker = null; // Keep track of the selected worker
    this.selectedSpearman = null; // Keep track of the selected spearman
    this.objectClickedRecently = false; // Flag to prevent immediate background click after object click
    this.debugHistory = []; // Array to store debug message history
    this.maxDebugHistory = 10; // Max number of debug messages to keep

    // Fog of War properties
    this.playerFogGrid = null; // Player's visibility data
    this.aiFogGrid = null;     // AI's visibility data
    this.gridWidth = 0;        // Number of cells horizontally
    this.gridHeight = 0;       // Number of cells vertically
    this.fogRects = null;      // 2D array storing references to the player's visual fog rectangles
  }

  /**
   * Preloads game assets (images, spritesheets, audio).
   */
  preload() {
    // Load assets
    this.load.spritesheet('worker_sheet', 'https://grantchen08.github.io/nezha/worker_walk.png', { frameWidth: 32, frameHeight: 64 });
    this.load.spritesheet('worker_chop_sheet', 'https://grantchen08.github.io/nezha/worker_chop.png', { frameWidth: 64, frameHeight: 64 });
    this.load.image('barrack', 'https://grantchen08.github.io/nezha/barrack.png');
    this.load.spritesheet('spearman_walk_sheet', 'https://grantchen08.github.io/nezha/spearman_walk.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('spearman_attack_sheet', 'https://grantchen08.github.io/nezha/spearman_attack.png', { frameWidth: 64, frameHeight: 64 });
    this.load.audio('worker_walk', 'https://grantchen08.github.io/nezha/worker_walk.mp3');
    this.load.spritesheet('tree_sheet', 'https://grantchen08.github.io/nezha/tree.png', { frameWidth: 64, frameHeight: 64 });
    this.load.image('house', 'https://grantchen08.github.io/nezha/house.png');
    this.load.audio('chop_sound', 'https://grantchen08.github.io/nezha/chop_tree.mp3');
    this.load.audio('spearman_attack_sound', 'https://grantchen08.github.io/nezha/attack.mp3');
    this.load.audio('unit_die_sound', 'https://grantchen08.github.io/nezha/hurt.mp3');
    this.load.audio('building_fall_sound', 'https://grantchen08.github.io/nezha/fall.mp3');

    this.load.on('loaderror', (file) => {
        const errorMsg = `Error loading ${file.key}`;
        console.error(`Error loading asset: ${file.key} from ${file.url}`);
        // Use logDebug if available, otherwise console
        if (typeof this.logDebug === 'function') {
            this.logDebug(errorMsg);
        } else {
            console.log("DEBUG (preload):", errorMsg);
        }
    });
  }

  /**
   * Creates game objects and initializes the scene.
   */
  create() {
    const gameWidth = this.sys.game.config.width;
    const gameHeight = this.sys.game.config.height;

    this.cameras.main.setBackgroundColor('#228B22'); // Forest green

    // UI Text (Wood, AI Wood, Debug)
    this.wood = 0; this.aiWood = 0;
    this.woodText = this.add.text(10, 10, 'Wood: 0', { font: '16px Arial', fill: '#ffffff' }).setDepth(1000);
    this.aiWoodText = this.add.text(gameWidth - 10, 10, 'AI Wood: 0', { font: '16px Arial', fill: '#ffffff' }).setOrigin(1, 0).setDepth(1000);
    this.debugText = this.add.text(10, 40, 'Debug Output:', { font: '14px Arial', fill: '#ffffff', wordWrap: { width: 200 }, lineSpacing: 4 }).setDepth(1000).setVisible(false);
    this.logDebug("Click overlay to start.");

    // --- Initialize Fog of War ---
    this.gridWidth = Math.ceil(gameWidth / FOG_CELL_SIZE);
    this.gridHeight = Math.ceil(gameHeight / FOG_CELL_SIZE);
    this.playerFogGrid = [];
    this.aiFogGrid = [];
    this.fogRects = []; // Store references ONLY for the player's visual fog

    for (let y = 0; y < this.gridHeight; y++) {
        this.playerFogGrid[y] = [];
        this.aiFogGrid[y] = [];
        this.fogRects[y] = [];
        for (let x = 0; x < this.gridWidth; x++) {
            this.playerFogGrid[y][x] = false; // Player initially hidden
            this.aiFogGrid[y][x] = false;     // AI initially hidden

            // Create visual rectangle ONLY for the player's view
            const fogRect = this.add.rectangle(
                x * FOG_CELL_SIZE,
                y * FOG_CELL_SIZE,
                FOG_CELL_SIZE,
                FOG_CELL_SIZE,
                FOG_COLOR,
                FOG_ALPHA
            ).setOrigin(0, 0).setDepth(5000); // High depth
            this.fogRects[y][x] = fogRect; // Store reference
        }
    }
    this.logDebug(`Fog grids initialized (${this.gridWidth}x${this.gridHeight})`);
    // --- End Fog of War Init ---

    // NOTE: takeDamage method is attached in main.js

    // --- Player & AI House Setup --- (Reveal FoW for respective sides)
    this.house = this.add.image(100, gameHeight - 100, 'house').setOrigin(0.5, 1);
    this.house.health = HOUSE_HEALTH; this.house.maxHealth = HOUSE_HEALTH;
    this.house.setData('unitType', 'house'); this.house.setData('isPlayer', true);
    this.createHealthBar(this.house, BUILDING_HEALTH_BAR_WIDTH, PLAYER_HEALTH_BAR_COLOR);
    this.updateVisibilityAround(this.house); // Reveal for player
    this.house.setInteractive(); // Make house clickable (e.g., to deselect units)

    this.aiHouse = this.add.image(gameWidth - 100, gameHeight - 100, 'house').setOrigin(0.5, 1);
    this.aiHouse.health = HOUSE_HEALTH; this.aiHouse.maxHealth = HOUSE_HEALTH;
    this.aiHouse.setData('unitType', 'house'); this.aiHouse.setData('isPlayer', false);
    this.createHealthBar(this.aiHouse, BUILDING_HEALTH_BAR_WIDTH, AI_HEALTH_BAR_COLOR);
    this.updateVisibilityAround(this.aiHouse); // Reveal for AI
    this.aiHouse.setInteractive(); // Make AI house clickable (as attack target)

    // --- Player & AI Worker Setup --- (Reveal FoW for respective sides)
    this.worker = this.add.sprite(150, gameHeight - 150, 'worker_sheet').setOrigin(0.5, 1);
    this.worker.setFrame(0); this.worker.state = 'idle'; this.worker.moving = false; this.worker.target = null;
    this.worker.isCutting = false; this.worker.cuttingTarget = null; this.worker.cuttingTimer = null;
    this.worker.isBuilding = false; this.worker.buildingTarget = null; this.worker.buildingTimer = null;
    this.worker.health = WORKER_HEALTH; this.worker.maxHealth = WORKER_HEALTH;
    this.worker.setData('unitType', 'worker'); this.worker.setData('isPlayer', true); this.worker.initialChopHealth = null;
    this.createHealthBar(this.worker, UNIT_HEALTH_BAR_WIDTH, PLAYER_HEALTH_BAR_COLOR);
    this.worker.setInteractive();
    this.updateVisibilityAround(this.worker); // Reveal for player

    this.aiWorker = this.add.sprite(gameWidth - 150, gameHeight - 150, 'worker_sheet').setOrigin(0.5, 1);
    this.aiWorker.setFrame(0); this.aiWorker.state = 'idle'; this.aiWorker.moving = false; this.aiWorker.target = null;
    this.aiWorker.isCutting = false; this.aiWorker.cuttingTarget = null; this.aiWorker.cuttingTimer = null;
    this.aiWorker.isBuilding = false; this.aiWorker.buildingTarget = null; this.aiWorker.buildingTimer = null;
    this.aiWorker.health = WORKER_HEALTH; this.aiWorker.maxHealth = WORKER_HEALTH;
    this.aiWorker.setData('unitType', 'worker'); this.aiWorker.setData('isPlayer', false); this.aiWorker.initialChopHealth = null;
    this.createHealthBar(this.aiWorker, UNIT_HEALTH_BAR_WIDTH, AI_HEALTH_BAR_COLOR);
    this.updateVisibilityAround(this.aiWorker); // Reveal for AI
    this.aiWorker.setInteractive(); // Make AI worker clickable (as attack target)


    // Load sounds
    this.workerWalkSound = this.sound.add('worker_walk');
    this.chopSound = this.sound.add('chop_sound');
    this.spearmanAttackSound = this.sound.add('spearman_attack_sound');
    this.unitDieSound = this.sound.add('unit_die_sound');
    this.buildingFallSound = this.sound.add('building_fall_sound');

    // Create animations
    this.anims.create({ key: 'worker_walk', frames: this.anims.generateFrameNumbers('worker_sheet', { start: 0, end: 1 }), frameRate: 8, repeat: -1 });
    this.anims.create({ key: 'worker_chop', frames: this.anims.generateFrameNumbers('worker_chop_sheet', { start: 0, end: 1 }), frameRate: 4, repeat: -1 });
    this.anims.create({ key: 'spearman_walk', frames: this.anims.generateFrameNumbers('spearman_walk_sheet', { start: 0, end: 1 }), frameRate: 6, repeat: -1 });
    this.anims.create({ key: 'spearman_attack', frames: this.anims.generateFrameNumbers('spearman_attack_sheet', { start: 0, end: 1 }), frameRate: 4, repeat: -1 });

    // --- Tree Setup (REFACTORED) ---
    // We still use a group for easy management, but now it's populated with our new Tree class instances.
    this.trees = this.add.group();
    const treeCount = 20;
    for (let i = 0; i < treeCount; i++) {
        let x, y; let tooClose;
        do {
            x = Phaser.Math.Between(50, gameWidth - 50); y = Phaser.Math.Between(50, gameHeight - 100);
            const playerHouseDist = Phaser.Math.Distance.Between(x, y, this.house.x, this.house.y - this.house.height / 2);
            const aiHouseDist = Phaser.Math.Distance.Between(x, y, this.aiHouse.x, this.aiHouse.y - this.aiHouse.height / 2);
            const houseRadius = Math.max(this.house.width, this.house.height) / 2 + 36;
            tooClose = (playerHouseDist < houseRadius * 1.5) || (aiHouseDist < houseRadius * 1.5);
        } while (tooClose);

        // Instantiate the new Tree class instead of a generic sprite
        const tree = new Tree(this, x, y);
        this.trees.add(tree); 
    }

      // --- Input Handling ---
      this.input.on('gameobjectdown', this.handleObjectClick, this);
      this.input.on('pointerdown', this.handleBackgroundClick, this);
      this.input.keyboard.on('keydown-D', this.toggleDebugDisplay, this);
      this.input.keyboard.on('keydown-S', (event) => {
          if (event.shiftKey) { this.changeTimeScale(0.5); } else { this.changeTimeScale(2); }
      });


      // --- Start Overlay Logic ---
      const overlay = document.getElementById('start-overlay');
      if (overlay) {
          overlay.addEventListener('pointerdown', () => {
              if (!this.gameStarted && !this.gameOver) {
                  overlay.style.display = 'none';
                  if (this.sound.context.state === 'suspended') {
                      this.sound.context.resume().then(() => { console.log('Audio Context resumed!'); this.startGameLogic(); }).catch(e => console.error('Error resuming audio context:', e));
                  } else { this.startGameLogic(); }
              }
          }, { once: true });
      } else {
          console.warn("Start overlay not found!"); this.startGameLogic(); // Fallback if overlay missing
      }
  }


  /**
   * Game loop update function. Runs continuously.
   */
  update(time, delta) {
      if (!this.gameStarted || this.gameOver) return;

      // --- Update Fog of War based on unit/building positions ---
      const allVisibleEntities = [
          this.worker, this.aiWorker,
          this.house, this.aiHouse,
          this.playerBarrack, this.aiBarrack, // Include barracks
          ...this.playerSpearmen, ...this.aiSpearmen,
          ...this.trees.getChildren() // Also check trees for FoW updates
      ];
      allVisibleEntities.forEach(entity => {
          if (entity && entity.active) {
              // For now, assume all trees are neutral and can reveal FoW for both
              // In a real scenario, you might want only player units to reveal FoW.
              this.updateVisibilityAround(entity);
          }
      });

      // --- Handle States ---
      if (this.worker && this.worker.active) this.handleWorkerState(this.worker);
      if (this.aiWorker && this.aiWorker.active) this.handleWorkerState(this.aiWorker);
      this.handleBarrackTraining(this.playerBarrack, true);
      this.handleBarrackTraining(this.aiBarrack, false);
      this.playerSpearmen.forEach(s => { if (s.active) this.handleSpearmanState(s); });
      this.aiSpearmen.forEach(s => { if (s.active) this.handleSpearmanState(s); });

      // --- Unit Cleanup ---
      this.playerSpearmen = this.playerSpearmen.filter(s => s.active);
      this.aiSpearmen = this.aiSpearmen.filter(s => s.active);

      // --- Depth Sorting & Visual Updates ---
      const depthSortedSprites = [];
      if (this.worker && this.worker.active) depthSortedSprites.push(this.worker);
      if (this.aiWorker && this.aiWorker.active) depthSortedSprites.push(this.aiWorker);
      if (this.house && this.house.active) depthSortedSprites.push(this.house);
      if (this.aiHouse && this.aiHouse.active) depthSortedSprites.push(this.aiHouse);
      if (this.playerBarrack && this.playerBarrack.active) depthSortedSprites.push(this.playerBarrack);
      if (this.aiBarrack && this.aiBarrack.active) depthSortedSprites.push(this.aiBarrack);
      this.playerSpearmen.forEach(s => { if (s.active) depthSortedSprites.push(s); });
      this.aiSpearmen.forEach(s => { if (s.active) depthSortedSprites.push(s); });
      // The Tree objects (and their health bars) are now updated automatically by Phaser's `preUpdate`
      if (this.trees) { this.trees.getChildren().forEach(tree => { if (tree.active) { depthSortedSprites.push(tree); } }); }
      
      depthSortedSprites.sort((a, b) => { const yA = a.y; const yB = b.y; if (yA < yB) return -1; if (yA > yB) return 1; return 0; });
      depthSortedSprites.forEach((sprite, index) => {
          if (sprite.active) {
              sprite.setDepth(index);
              // Health bars for non-Entity objects still need manual updates
              if (sprite.getData('unitType') !== 'tree' && sprite.healthBarBg) { 
                  this.updateHealthBar(sprite); 
                  sprite.healthBarBg.setDepth(index + 1); 
                  sprite.healthBarFill.setDepth(index + 2); 
              }
              if (sprite.trainingText) { this.updateTrainingText(sprite); sprite.trainingText.setDepth(index + 10); }
              // Update goal text position and depth
              if (sprite.goalText && sprite.getData('unitType') === 'spearman' && sprite.goalText.active) {
                  const yOffset = (sprite.healthBarBg ? sprite.healthBarBg.y - HEALTH_BAR_HEIGHT : sprite.y - sprite.displayHeight) - 10; // Position above health bar or unit
                  sprite.goalText.setPosition(sprite.x, yOffset);
                  sprite.goalText.setDepth(index + 11); // Ensure it's above health bar
              }
          }
      });

       // Worker target invalidation (still needed for trees/buildings)
       [this.worker, this.aiWorker].forEach( w => {
          if (!w || !w.active) return;
          if (w.moving && w.target && w.state === 'moving_to_chop' && !w.target.active) { const workerType = w.getData('isPlayer') ? "Player" : "AI"; this.logDebug(`${workerType} target tree disappeared during move.`); this.tweens.killTweensOf(w); }
          if (w.moving && w.target && w.state === 'moving_to_build' && !w.target.active) { const workerType = w.getData('isPlayer') ? "Player" : "AI"; this.logDebug(`${workerType} build target disappeared during move.`); this.tweens.killTweensOf(w); }
      });

  } // End update()
} // End DemoScene Class
