// Represents a Tree in the game. Extends the base Entity class.
class Tree extends Entity {
    constructor(scene, x, y) {
        // Configuration object for the Entity constructor
        const config = {
            health: 10,
            unitType: 'tree',
            healthBarWidth: 40,
            healthBarColor: 0xffffff // White health bar for neutral objects
        };

        // Call the parent constructor (Entity)
        super(scene, x, y, 'tree_sheet', 0, config);

        // Make the tree interactive so it can be clicked
        this.setInteractive();
    }

    // Override the takeDamage method to add tree-specific logic
    takeDamage(amount, attacker) {
        // Call the parent takeDamage to handle health reduction and bar update
        super.takeDamage(amount, attacker);

        if (!this.active) return;

        // Update the tree's visual frame based on its remaining health
        if (this.health <= 3.3) {
            this.setFrame(2);
        } else if (this.health <= 6.6) {
            this.setFrame(1);
        } else {
            this.setFrame(0);
        }
    }
    
    // Override the die method for tree-specific death behavior
    die(attacker) {
        const workerSprite = attacker; // The attacker in this case is the worker
        if (!workerSprite) {
             console.warn("Tree died but attacker is unknown.");
             this.destroy();
             return;
        }

        const woodFromFelledTree = 10;
        if (workerSprite.getData('isPlayer')) {
            this.scene.wood += woodFromFelledTree;
            this.scene.woodText.setText('Wood: ' + this.scene.wood);
            this.scene.logDebug(`Tree felled! Gained ${woodFromFelledTree} wood. Total: ${this.scene.wood}`);
        } else {
            this.scene.aiWood += woodFromFelledTree;
            this.scene.aiWoodText.setText('AI Wood: ' + this.scene.aiWood);
            this.scene.logDebug(`AI felled tree. Gained ${woodFromFelledTree} wood. Total: ${this.scene.aiWood}`);
        }
        
        // Finalize the worker's state
        this.scene.stopCutting(workerSprite);
        workerSprite.state = 'chopping'; // Send worker back to find a new tree
        
        // Check if the game should end (BEFORE destroying the tree)
        this.scene.checkEndCondition();
        
        // Destroy the tree object and its health bar (LAST)
        this.destroy();
    }
}
