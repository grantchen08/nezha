/**
 * Starts the main game logic after user interaction.
 */
function startGameLogic() {
    this.gameStarted = true; this.gameOver = false;
    if(this.worker) this.worker.state = 'idle'; if(this.aiWorker) this.aiWorker.state = 'idle';
    this.logDebug("Game started."); console.log("Game logic started.");
}


/**
 * Checks if the game should end based on wood counts or house destruction.
 */
function checkEndCondition() {
    if (this.gameOver) return;
    if (this.house && !this.house.active) { this.endGame("Computer Wins!", '#ff0000'); return; }
    if (this.aiHouse && !this.aiHouse.active) { this.endGame("You Win!", '#ffff00'); return; }
    const winAmount = 100;
    if (this.wood >= winAmount) { this.endGame("You Win!", '#ffff00'); return; }
    if (this.aiWood >= winAmount) { this.endGame("Computer Wins!", '#ff0000'); return; }
    const remainingTrees = this.trees.countActive(true);
    if (remainingTrees === 0) {
        const playerWorkerBusy = this.worker && this.worker.active && (this.worker.moving || this.worker.isCutting || this.worker.isBuilding);
        const aiWorkerBusy = this.aiWorker && this.aiWorker.active && (this.aiWorker.moving || this.aiWorker.isCutting || this.aiWorker.isBuilding);
        const playerSpearmanBusy = this.playerSpearmen.some(s => s.active && (s.moving || s.isAttacking));
        const aiSpearmanBusy = this.aiSpearmen.some(s => s.active && (s.moving || s.isAttacking));
        const playerBarrackBusy = this.playerBarrack && this.playerBarrack.active && (this.playerBarrack.isBuilding || this.playerBarrack.isTraining);
        const aiBarrackBusy = this.aiBarrack && this.aiBarrack.active && (this.aiBarrack.isBuilding || this.aiBarrack.isTraining);
        if (!playerWorkerBusy && !aiWorkerBusy && !playerSpearmanBusy && !aiSpearmanBusy && !playerBarrackBusy && !aiBarrackBusy) { this.endGame("Draw!", '#ffffff'); return; }
    }
}

/**
 * Ends the game, displaying a message and stopping activity.
 */
function endGame(message, color = '#ffffff') {
    if (this.gameOver) return; this.gameOver = true; this.gameStarted = false;
    this.logDebug(`Game Over: ${message}`);
    this.add.text(this.sys.game.config.width / 2, this.sys.game.config.height / 2, message, { font: '48px Arial', fill: color, align: 'center' }).setOrigin(0.5).setDepth(6000); // Increased depth
    this.input.enabled = false; this.tweens.killAll();
    if (this.workerWalkSound && this.workerWalkSound.isPlaying) this.workerWalkSound.stop();
    if (this.chopSound && this.chopSound.isPlaying) this.chopSound.stop();
    if (this.spearmanAttackSound && this.spearmanAttackSound.isPlaying) this.spearmanAttackSound.stop();
    [this.worker, this.aiWorker].forEach(w => { if (w && w.active) { if (w.isCutting) this.stopCutting(w); if (w.isBuilding) this.stopBuilding(w); w.state = 'idle'; w.moving = false; w.target = null; w.setTexture('worker_sheet'); w.anims.stop(); w.setFrame(0); w.setFlipX(false); } });
    [...this.playerSpearmen, ...this.aiSpearmen].forEach(spearman => { if (spearman && spearman.active) { if(spearman.isAttacking) this.stopAttacking(spearman); spearman.state = 'idle'; spearman.moving = false; spearman.attackTarget = null; spearman.setTexture('spearman_walk_sheet'); spearman.anims.stop(); spearman.setFrame(0); spearman.setFlipX(false); if (spearman.goalText && spearman.goalText.active) spearman.goalText.destroy(); } }); // Destroy goal text on game end
    [this.playerBarrack, this.aiBarrack].forEach(barrack => { if (barrack && barrack.active) { if (barrack.trainingTimer) barrack.trainingTimer.remove(); this.destroyTrainingText(barrack); barrack.isTraining = false; } });
    if (this.trees) { this.trees.getChildren().forEach(tree => this.destroyTreeHealthBar(tree)); }
    console.log("Game Over:", message);
}