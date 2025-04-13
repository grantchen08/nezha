# Nezha (哪吒) - RTS/Simulation Game [Early Development]

## Introduction

Welcome to the Nezha project! This is an early-stage Real-Time Strategy (RTS) / Simulation game inspired by the ancient Chinese legend of Nezha (哪吒), focusing on the conflict between humans and dragons at Chen Tang Pass (陈塘关).

This project is built using the [Phaser 3](https://phaser.io/) HTML5 game framework.

**Please Note:** This is currently a very basic tech demo showcasing core mechanics and is under active development.

## Play the Demo!

You can play the latest development build live here:

**[https://grantchen08.github.io/nezha/game.html](https://grantchen08.github.io/nezha/game.html)**

## Current Demo Features

The current `game.html` demo includes the following features:

* **Game Engine:** Phaser 3.
* **Basic RTS Loop:** Demonstrates resource gathering.
* **Units:**
    * Player Worker (Selectable & Commandable)
    * AI Worker (Basic automated gathering)
    * Player & AI Houses (Static structures)
* **Resources:** Trees (Choppable with health).
* **Gameplay Mechanics:**
    * **Worker Selection:** Click the player worker to select it (highlighted with a cyan tint). Click again or elsewhere to deselect.
    * **Movement Command:** Click the background while the worker is selected to issue a move command. A red marker briefly indicates the target location.
    * **Chopping Command:** Click an available tree while the worker is selected to command the worker to chop that specific tree.
    * **Automated Chopping:** If idle, workers will automatically find the nearest available tree and start chopping.
    * **Target Validation:** Clicking a tree already being chopped by another unit will flash the tree red, indicating an invalid command.
    * **Resource Collection:**
        * +10 Wood awarded when a tree is fully chopped down.
        * Partial wood awarded based on damage dealt if chopping is interrupted.
    * **AI Behavior:** Basic AI worker automatically gathers wood.
    * **Target Exclusivity:** Workers attempt to avoid targeting trees already being chopped or targeted by another worker.
* **UI & Effects:**
    * Wood count display for Player and AI.
    * Health bars for workers, houses, and trees being chopped.
    * Basic walk and chop animations.
    * Basic walk and chop sound effects.
    * Tint effect for selected worker.
    * Temporary marker for move commands.
    * Temporary flash for invalid tree target commands.
* **Win/Loss/Draw Conditions:**
    * First side to reach 100 wood wins.
    * Draw if all trees are depleted and no side has won.
* **Debugging:**
    * Press 'd' key to toggle the on-screen debug log.
    * Debug log shows the last 10 messages with timestamps.

## Gameplay Instructions (Current Demo)

1.  Go to the live demo link: [https://grantchen08.github.io/nezha/game.html](https://grantchen08.github.io/nezha/game.html)
2.  Click the "Click or Tap to Start" overlay.
3.  The player worker (near the bottom-left house) and AI worker will automatically start seeking trees to chop.
4.  **Select your worker:** Click on the player worker sprite. It will be highlighted cyan.
5.  **Command Movement:** While the worker is selected, click on an empty point on the ground. A red marker will flash, and the worker will stop its current action and move there, becoming idle upon arrival.
6.  **Command Chopping:** While the worker is selected, click on a tree that isn't currently being chopped. The worker will stop its current action and move to chop that tree.
7.  **Deselect:** Click the selected worker again, or click on the background/another object (that isn't a valid command target) to deselect.
8.  **Toggle Debug:** Press the 'd' key to show/hide the debug message area in the top-left corner.
9.  The game ends when either side reaches 100 wood or all trees are gone.

## Development Status

This project is in the **very early stages of development**. The current demo focuses on establishing basic RTS mechanics like unit selection, movement, resource gathering, and simple AI within the Phaser 3 framework. Many features related to the Nezha theme (Dragons, specific characters, combat, story elements) are not yet implemented.

## Running Locally (for Development)

If you want to run the code locally for development:

1.  Clone the repository.
2.  Because Phaser games often involve loading local assets, you usually cannot run the `game.html` file directly from your filesystem in most modern browsers due to security restrictions (CORS). You need to serve the file using a simple local web server. Here are a few common ways:
    * **Using Python:**
        * Navigate to the project directory in your terminal.
        * If you have Python 3, run: `python -m http.server`
        * If you have Python 2, run: `python -m SimpleHTTPServer`
        * Open your web browser and go to `http://localhost:8000/game.html` (or the port indicated by the command).
    * **Using Node.js:**
        * Make sure you have Node.js installed.
        * Install a simple server package globally (if you haven't already): `npm install -g http-server`
        * Navigate to the project directory in your terminal.
        * Run: `http-server`
        * Open your web browser and go to `http://localhost:8080/game.html` (or the address indicated by the command).
    * **Using VS Code Live Server:**
        * If you use Visual Studio Code, you can install the "Live Server" extension.
        * Right-click the `game.html` file in the VS Code explorer and choose "Open with Live Server".

## Future Plans (High Level)

* Introduce Dragon units and AI.
* Implement basic combat mechanics.
* Develop specific characters (Nezha).
* Expand resource types and building options.
* Integrate elements from the Nezha storyline.
* Refine AI behavior.

## Contributing

Contributions are welcome! As the project is very young, the contribution process is informal for now. Please feel free to fork the repository, make changes, and submit pull requests. Opening issues to discuss potential features or bugs is also encouraged.

## License

Licensed under the **BSD 3-Clause License** - see the LICENSE file for details.
