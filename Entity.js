// A base class for any object in the game that has health and can be damaged.
class Entity extends Phaser.GameObjects.Sprite {
    constructor(scene, x, y, texture, frame, config) {
        super(scene, x, y, texture, frame);
        // Add the entity to the scene
        scene.add.existing(this);

        this.scene = scene; // Keep a reference to the scene
        this.health = config.health;
        this.maxHealth = config.health;
        this.isPlayer = config.isPlayer || false; // Default to not being a player unit
        this.unitType = config.unitType || 'entity';
        
        // **BUG FIX**: Set the 'isPlayer' data for the Fog of War system to use.
        this.setData('isPlayer', this.isPlayer);

        // --- Health Bar Management ---
        // The entity now creates and manages its own health bar.
        const barWidth = config.healthBarWidth || 40;
        const yOffset = -(this.displayHeight || this.height) - 5;
        this.healthBarBg = scene.add.rectangle(this.x, this.y + yOffset, barWidth, HEALTH_BAR_HEIGHT, 0x333333).setOrigin(0.5);
        this.healthBarFill = scene.add.rectangle(this.x - barWidth / 2, this.y + yOffset, barWidth, HEALTH_BAR_HEIGHT, config.healthBarColor || 0xffffff).setOrigin(0, 0.5);
        this.healthBarWidth = barWidth;
        this.updateHealthBar(); // Set initial state
    }

    // A centralized method for taking damage.
    takeDamage(amount, attacker) {
        if (!this.active || this.health <= 0) return;

        this.health -= amount;
        this.updateHealthBar();

        // Visual feedback for damage
        this.scene.tweens.add({
            targets: this,
            tint: DAMAGE_FLASH_TINT,
            duration: DAMAGE_FLASH_DURATION,
            yoyo: true,
            onComplete: () => {
                if (this.active) {
                    this.clearTint();
                }
            }
        });

        // Death check
        if (this.health <= 0) {
            this.die(attacker);
        }
    }
    
    // Abstract die method to be overridden by subclasses
    die(attacker) {
        // This is where generic death logic would go.
        // For now, we just destroy the object.
        this.destroy();
    }

    // Updates the health bar's position and fill amount.
    updateHealthBar() {
        if (!this.healthBarBg || !this.healthBarFill) return;
        const fillRatio = Math.max(0, this.health / this.maxHealth);
        this.healthBarFill.width = fillRatio * this.healthBarWidth;
    }

    // Phaser's preUpdate is called every frame, perfect for keeping things in sync.
    preUpdate(time, delta) {
        // Make sure to call the parent's preUpdate
        super.preUpdate(time, delta);
        
        // Keep health bar positioned correctly above the entity
        if (this.active && this.healthBarBg) {
             const yOffset = -(this.displayHeight || this.height) - 5;
             this.healthBarBg.setPosition(this.x, this.y + yOffset);
             this.healthBarFill.setPosition(this.x - this.healthBarWidth / 2, this.y + yOffset);
             this.healthBarBg.setDepth(this.depth + 1);
             this.healthBarFill.setDepth(this.depth + 2);
        }
    }

    // Override the destroy method to clean up the health bar.
    destroy(fromScene) {
        if (this.healthBarBg) this.healthBarBg.destroy();
        if (this.healthBarFill) this.healthBarFill.destroy();
        this.healthBarBg = null;
        this.healthBarFill = null;
        super.destroy(fromScene);
    }
}
