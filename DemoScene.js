/**
 * Represents the main scene for the RTS demo.
 * Handles game logic, asset loading, and rendering.
 */
class DemoScene extends Phaser.Scene {
  constructor() {
    super({ key: 'DemoScene' });
    // Game state variables
    this.wood = 0;
    this.aiWood = 0;
    this.worker = null; // Player's Worker object
    this.aiWorker = null; // AI's Worker object
    this.house = null; 
    this.aiHouse = null;
    this.trees = null;
    this.playerBarrack = null;
    this.playerBarrackBuilding = false;
    this.aiBarrack = null;
    this.aiBarrackBuilding = false;
    this.playerSpearmen = [];
    this.aiSpearmen = [];
    this.woodText = null;
    this.aiWoodText = null;
    this.debugText = null;
    this.workerWalkSound = null;
    this.chopSound = null;
    this.spearmanAttackSound = null;
    this.unitDieSound = null;
    this.buildingFallSound = null;
    this.gameStarted = false;
    this.gameOver = false;
    this.selectedWorker = null;
    this.selectedSpearman = null;
    this.objectClickedRecently = false;
    this.debugHistory = [];
    this.maxDebugHistory = 10;
    this.playerFogGrid = null;
    this.aiFogGrid = null;
    this.gridWidth = 0;
    this.gridHeight = 0;
    this.fogRects = null;
  }

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
  }

  create() {
    const gameWidth = this.sys.game.config.width;
    const gameHeight = this.sys.game.config.height;
    this.cameras.main.setBackgroundColor('#228B22');

    this.wood = 0; this.aiWood = 0;
    this.woodText = this.add.text(10, 10, 'Wood: 0', { font: '16px Arial', fill: '#ffffff' }).setDepth(1000);
    this.aiWoodText = this.add.text(gameWidth - 10, 10, 'AI Wood: 0', { font: '16px Arial', fill: '#ffffff' }).setOrigin(1, 0).setDepth(1000);
    this.debugText = this.add.text(10, 40, 'Debug Output:', { font: '14px Arial', fill: '#ffffff', wordWrap: { width: 200 }, lineSpacing: 4 }).setDepth(1000).setVisible(false);
    this.logDebug("Click overlay to start.");

    this.gridWidth = Math.ceil(gameWidth / FOG_CELL_SIZE);
    this.gridHeight = Math.ceil(gameHeight / FOG_CELL_SIZE);
    this.playerFogGrid = []; this.aiFogGrid = []; this.fogRects = [];
    for (let y = 0; y < this.gridHeight; y++) {
        this.playerFogGrid[y] = []; this.aiFogGrid[y] = []; this.fogRects[y] = [];
        for (let x = 0; x < this.gridWidth; x++) {
            this.playerFogGrid[y][x] = false; this.aiFogGrid[y][x] = false;
            const fogRect = this.add.rectangle(x * FOG_CELL_SIZE, y * FOG_CELL_SIZE, FOG_CELL_SIZE, FOG_CELL_SIZE, FOG_COLOR, FOG_ALPHA).setOrigin(0, 0).setDepth(5000);
            this.fogRects[y][x] = fogRect;
        }
    }
    
    this.house = new TownCenter(this, 100, gameHeight - 100, true);
    this.updateVisibilityAround(this.house);

    this.aiHouse = new TownCenter(this, gameWidth - 100, gameHeight - 100, false);
    this.updateVisibilityAround(this.aiHouse);

    this.worker = new Worker(this, 150, gameHeight - 150, true);
    this.worker.setInteractive();
    this.updateVisibilityAround(this.worker);

    this.aiWorker = new Worker(this, gameWidth - 150, gameHeight - 150, false);
    this.aiWorker.setInteractive();
    this.updateVisibilityAround(this.aiWorker);

    this.workerWalkSound = this.sound.add('worker_walk');
    this.chopSound = this.sound.add('chop_sound');
    this.spearmanAttackSound = this.sound.add('spearman_attack_sound');
    this.unitDieSound = this.sound.add('unit_die_sound');
    this.buildingFallSound = this.sound.add('building_fall_sound');

    this.anims.create({ key: 'worker_walk', frames: this.anims.generateFrameNumbers('worker_sheet', { start: 0, end: 1 }), frameRate: 8, repeat: -1 });
    this.anims.create({ key: 'worker_chop', frames: this.anims.generateFrameNumbers('worker_chop_sheet', { start: 0, end: 1 }), frameRate: 4, repeat: -1 });
    this.anims.create({ key: 'spearman_walk', frames: this.anims.generateFrameNumbers('spearman_walk_sheet', { start: 0, end: 1 }), frameRate: 6, repeat: -1 });
    this.anims.create({ key: 'spearman_attack', frames: this.anims.generateFrameNumbers('spearman_attack_sheet', { start: 0, end: 1 }), frameRate: 4, repeat: -1 });

    this.trees = this.add.group();
    for (let i = 0; i < 20; i++) {
        let x, y;
        do {
            x = Phaser.Math.Between(50, gameWidth - 50); y = Phaser.Math.Between(50, gameHeight - 100);
        } while (Phaser.Math.Distance.Between(x, y, this.house.x, this.house.y) < 150 || Phaser.Math.Distance.Between(x, y, this.aiHouse.x, this.aiHouse.y) < 150);
        this.trees.add(new Tree(this, x, y)); 
    }

      this.input.on('gameobjectdown', this.handleObjectClick, this);
      this.input.on('pointerdown', this.handleBackgroundClick, this);
      this.input.keyboard.on('keydown-D', this.toggleDebugDisplay, this);
      this.input.keyboard.on('keydown-S', (event) => { if (event.shiftKey) { this.changeTimeScale(0.5); } else { this.changeTimeScale(2); } });
      const overlay = document.getElementById('start-overlay');
      if (overlay) {
          overlay.addEventListener('pointerdown', () => { if (!this.gameStarted && !this.gameOver) { overlay.style.display = 'none'; if (this.sound.context.state === 'suspended') { this.sound.context.resume().then(() => this.startGameLogic()); } else { this.startGameLogic(); } } }, { once: true });
      } else { this.startGameLogic(); }
  }

  update(time, delta) {
      if (!this.gameStarted || this.gameOver) return;

      const allEntities = [ this.worker, this.aiWorker, this.house, this.aiHouse, this.playerBarrack, this.aiBarrack, ...this.playerSpearmen, ...this.aiSpearmen, ...this.trees.getChildren() ];
      allEntities.forEach(entity => { if (entity && entity.active) { this.updateVisibilityAround(entity); } });

      if (this.worker && this.worker.active) this.worker.update();
      if (this.aiWorker && this.aiWorker.active) this.aiWorker.update();
      if (this.playerBarrack && this.playerBarrack.active) this.playerBarrack.update();
      if (this.aiBarrack && this.aiBarrack.active) this.aiBarrack.update();
      
      this.playerSpearmen.forEach(s => { if (s.active) this.handleSpearmanState(s); });

      this.playerSpearmen = this.playerSpearmen.filter(s => s.active);
      this.aiSpearmen = this.aiSpearmen.filter(s => s.active);

      const depthSortedSprites = allEntities.filter(e => e && e.active);
      depthSortedSprites.sort((a, b) => a.y - b.y);
      depthSortedSprites.forEach((sprite, index) => {
          if (sprite.active) {
              sprite.setDepth(index);
              if (!(sprite instanceof Entity) && sprite.healthBarBg) { 
                  this.updateHealthBar(sprite); 
              }
              if (sprite.goalText && sprite.getData('unitType') === 'spearman' && sprite.goalText.active) {
                  const yOffset = (sprite.healthBarBg ? sprite.healthBarBg.y - HEALTH_BAR_HEIGHT : sprite.y - sprite.displayHeight) - 10;
                  sprite.goalText.setPosition(sprite.x, yOffset);
              }
          }
      });
  }

    // --- Worker Logic Helper Methods ---
    // These functions are now part of the scene and called by Worker instances.
    damageTree(workerSprite) {
        if (!this.gameStarted || this.gameOver || !workerSprite.isCutting || !workerSprite.cuttingTarget?.active) {
            this.stopCutting(workerSprite);
            return;
        }
        workerSprite.cuttingTarget.takeDamage(1, workerSprite);
    }

    stopCutting(workerSprite) {
        if (!workerSprite) return;
        const wasCutting = workerSprite.isCutting;
        if (workerSprite.cuttingTimer) workerSprite.cuttingTimer.remove();
        workerSprite.isCutting = false;
        workerSprite.cuttingTarget = null;
        if (wasCutting) {
            const otherWorker = (workerSprite === this.worker) ? this.aiWorker : this.worker;
            if (this.chopSound?.isPlaying && (!otherWorker?.active || !(otherWorker.isCutting || otherWorker.isBuilding))) {
                this.chopSound.stop();
            }
            workerSprite.setTexture('worker_sheet').anims.stop().setFrame(0).setFlipX(false);
        }
    }

    findClosestTree(workerSprite) {
        let closestVisibleTree = null;
        let minDistance = Infinity;
        this.trees.getChildren().forEach(tree => {
            if (!tree.active) return;
            const { gridX, gridY } = this.worldToGrid(tree.x, tree.y);
            if (!this.isCellRevealed(gridX, gridY, workerSprite.isPlayer)) return;
            const otherWorker = workerSprite.isPlayer ? this.aiWorker : this.worker;
            if (otherWorker?.active && (otherWorker.target === tree || otherWorker.cuttingTarget === tree)) return;
            const distance = Phaser.Math.Distance.Between(workerSprite.x, workerSprite.y, tree.x, tree.y);
            if (distance < minDistance) {
                minDistance = distance;
                closestVisibleTree = tree;
            }
        });
        return closestVisibleTree;
    }

    sendWorkerToTree(workerSprite, tree) {
        if (!tree.active || !workerSprite.active) return;
        workerSprite.stopAllActions();
        workerSprite.target = tree;
        const offset = 30;
        const targetX = workerSprite.x <= tree.x ? tree.x - offset : tree.x + offset;
        workerSprite.moveTo(targetX, tree.y, 'moving_to_chop', 'chopping_init');
    }

    startBuildingBarrack(workerSprite, side = 'player') {
        const isPlayer = side === 'player';
        const woodCount = isPlayer ? this.wood : this.aiWood;
        const existingBarrack = isPlayer ? this.playerBarrack : this.aiBarrack;
        const isBuildingThisBarrack = isPlayer ? this.playerBarrackBuilding : this.aiBarrackBuilding;
        const house = isPlayer ? this.house : this.aiHouse;
        
        // BUG FIX: Added a null check for 'house' before trying to access its 'active' property.
        if (!workerSprite.active || !house || !house.active || (existingBarrack && existingBarrack.active) || isBuildingThisBarrack || woodCount < BARRACK_WOOD_COST) return;
        
        this.logDebug(`Starting ${side} barrack construction.`);
        if (isPlayer) { this.playerBarrackBuilding = true; this.wood -= BARRACK_WOOD_COST; this.woodText.setText('Wood: ' + this.wood); }
        else { this.aiBarrackBuilding = true; this.aiWood -= BARRACK_WOOD_COST; this.aiWoodText.setText('AI Wood: ' + this.aiWood); }
        workerSprite.stopAllActions();
        const buildX = isPlayer ? house.x + 80 : house.x - 80;
        const newBarrack = new Barrack(this, buildX, house.y, isPlayer, true);
        if (isPlayer) { this.playerBarrack = newBarrack; } else { this.aiBarrack = newBarrack; }
        this.updateVisibilityAround(newBarrack);
        workerSprite.target = newBarrack;
        const offset = 40;
        const targetXBuild = workerSprite.x <= buildX ? buildX - offset : buildX + offset;
        workerSprite.moveTo(targetXBuild, house.y, 'moving_to_build', 'building_init'); 
    }
    
    startChoppingAction(workerSprite) {
        if (!workerSprite.target?.active) {
            workerSprite.state = 'idle';
            return;
        }
        workerSprite.state = 'chopping';
        workerSprite.isCutting = true;
        workerSprite.cuttingTarget = workerSprite.target;
        workerSprite.setFlipX(workerSprite.x > workerSprite.cuttingTarget.x);
        workerSprite.setTexture('worker_chop_sheet').play('worker_chop');
        if (this.chopSound && !this.chopSound.isPlaying) this.chopSound.play({ loop: true });
        workerSprite.cuttingTimer = this.time.addEvent({ delay: 1000, callback: () => this.damageTree(workerSprite), callbackScope: this, loop: true });
    }
    
    startBuildingAction(workerSprite) {
        if (!workerSprite.target?.active) {
            workerSprite.state = 'idle';
            return;
        }
        workerSprite.state = 'building';
        workerSprite.isBuilding = true;
        workerSprite.buildingTarget = workerSprite.target;
        workerSprite.setFlipX(workerSprite.x > workerSprite.buildingTarget.x);
        workerSprite.setTexture('worker_chop_sheet').play('worker_chop');
        if (this.chopSound && !this.chopSound.isPlaying) this.chopSound.play({ loop: true });
        workerSprite.buildingTimer = this.time.addEvent({ delay: 1000, callback: () => this.buildStructure(workerSprite), callbackScope: this, loop: true });
    }

    buildStructure(workerSprite) {
        if (this.gameOver || !workerSprite.active || !workerSprite.isBuilding || !workerSprite.buildingTarget.active) {
            this.stopBuilding(workerSprite);
            return;
        }
        const building = workerSprite.buildingTarget;
        building.health += 1;
        building.updateHealthBar();
        building.setAlpha(0.5 + 0.5 * (building.health / building.maxHealth));
        if (building.health >= building.maxHealth) {
            building.completeConstruction();
            this.stopBuilding(workerSprite);
            workerSprite.state = 'idle';
        }
    }

    stopBuilding(workerSprite) {
        if (!workerSprite || !workerSprite.isBuilding) return;
        const wasBuilding = workerSprite.isBuilding;
        if (workerSprite.buildingTimer) workerSprite.buildingTimer.remove();
        workerSprite.isBuilding = false;
        workerSprite.buildingTarget = null;
        if (wasBuilding) {
            const otherWorker = (workerSprite === this.worker) ? this.aiWorker : this.worker;
            if (this.chopSound?.isPlaying && (!otherWorker?.active || !(otherWorker.isCutting || otherWorker.isBuilding))) {
                this.chopSound.stop();
            }
            workerSprite.setTexture('worker_sheet').anims.stop().setFrame(0).setFlipX(false);
        }
    }
}
