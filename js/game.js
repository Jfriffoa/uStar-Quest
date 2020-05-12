var config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-area',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 300 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

var game = new Phaser.Game(config);

const playerStates = {
    NORMAL: 0,
    DEATH: 1,
    INVULNERABLE: 2,
    STOP_TIME: 3
}
Object.freeze(playerStates);

const powerupType = {
    STOP_TIME: 0,
    DESTROY_BOMBS: 1,
    INVULNERABLE: 2
}

let player;
let cursors;
let stars;
let halfStars;
let bombs;
let powerups;

let score = 0;
let scoreText;
var pause = false;

var actualScene;

function preload() {
    // Load all the assets
    this.load.image('sky', 'assets/sky.png');
    this.load.image('ground', 'assets/platform.png');
    this.load.image('star', 'assets/star.png');
    this.load.image('bomb', 'assets/bomb.png');
    this.load.image('powerup', 'assets/powerup.png');
    this.load.spritesheet('dude',
        'assets/dude.png',
        { frameWidth: 32, frameHeight: 48 }
    );
}

function create() {
    // Add background
    this.add.image(400, 300, 'sky');
    
    // Add static platforms
    let platforms = this.physics.add.staticGroup();
    platforms.create(400, 568, 'ground').setScale(2).refreshBody();
    platforms.create(600, 400, 'ground');
    platforms.create(50, 250, 'ground');
    platforms.create(750, 220, 'ground');

    // Add the player
    player = this.physics.add.sprite(100, 450, 'dude');
    player.setBounce(0.2);
    player.setCollideWorldBounds(true);
    
    // Animate it
    this.anims.create({
        key: 'left',
        frames: this.anims.generateFrameNumbers('dude', { start: 0, end: 3 }),
        frameRate: 10,
        repeat: -1
    });

    this.anims.create({
        key: 'turn',
        frames: [{ key: 'dude', frame: 4 }],
        frameRate: 20
    });

    this.anims.create({
        key: 'right',
        frames: this.anims.generateFrameNumbers('dude', { start: 5, end: 8 }),
        frameRate: 10,
        repeat: -1
    });

    // Add stars
    stars = this.physics.add.group({
        key: 'star',
        repeat: 11,
        setXY: { x: 12, y: 0, stepX: 70 }
    });
    halfStars = Math.round(stars.getLength() / 2.0);

    // Prepare bombs
    bombs = this.physics.add.group();

    // Prepare powerups
    powerups = this.physics.add.group();

    // Collisions
    this.physics.add.collider(player, platforms);
    this.physics.add.collider(stars, platforms);
    this.physics.add.overlap(player, stars, collectStar, null, this);
    this.physics.add.collider(bombs, platforms);
    this.physics.add.collider(player, bombs, hitBomb, null, this);
    this.physics.add.collider(powerups, platforms, diePowerup, null, this);
    this.physics.add.overlap(player, powerups, hitPowerup, null, this);

    // Prepare Inputs
    cursors = this.input.keyboard.createCursorKeys();

    // UI
    scoreText = this.add.text(16, 16, 'score: 0', { fontSize: '32px', fill: '#000' });

    actualScene = this;

    // Load Game
    load_game(levelDefault());
}

function update() {
    if (pause)
        return;

    // Movement
    if (cursors.left.isDown){
        player.setVelocityX(-160);
        player.anims.play('left', true);
    } else if (cursors.right.isDown){
        player.setVelocityX(160);
        player.anims.play('right', true);
    } else {
        player.setVelocityX(0);
        player.anims.play('turn');
    }

    // Jump
    if (cursors.up.isDown && player.body.touching.down){
        player.setVelocityY(-330);
    }
}

function collectStar(player, star) {
    star.disableBody(true, true);
    score += 10;
    scoreText.setText('Score: ' + score);
    
    // Spawn Power-Up
    if (stars.countActive(true) == halfStars){
        var state = Phaser.Math.Between(0, 2);
        var x = (player.x > 400) ? Phaser.Math.Between(400, 800) : Phaser.Math.Between(0, 400);
        var power = powerups.create(x, 16, 'powerup');
        power.setBounce(.1);
        power.setState(state);

        switch (state){
            case powerupType.DESTROY_BOMBS:
                power.setTint(0xffffff);
                break;
            case powerupType.INVULNERABLE:
                power.setTint(0x002366);
                break;
            case powerupType.STOP_TIME:
                power.setTint(0x228c22);
                break;
        }
    }

    // Spawn bomb && Reactive Stars
    if (stars.countActive(true) == 0){
        stars.children.iterate(function(child) {
            child.enableBody(true, child.x, 0, true, true);
        });

        var x = (player.x < 400) ? Phaser.Math.Between(400, 800) : Phaser.Math.Between(0, 400);
        var bomb = bombs.create(x, 16, 'bomb');
        bomb.setBounce(1);
        bomb.setCollideWorldBounds(true);
        bomb.setVelocity(Phaser.Math.Between(-200, 200), 20);
    }
}

// Game Over
function hitBomb(player, bomb) {
    this.physics.pause();
    player.setState(playerStates.DEATH);
    player.setTint(0xff0000);
    player.anims.play('turn');
    gameOver = true;
    
    let d = new Date();
    gameData.actual_game.length += d.getTime() - gameData.actual_game.date.getTime();
    gameData.actual_game.score = score;
    gameData.actual_game.id += 1000; //Make the component update
    gameData.scores.push({
        'user': gameData.actual_game.username,
        'score': score
    });
    app.change_screen(screens.GAME_OVER);
    save_scores();
}

// Dissapear after 2 sec
function diePowerup(powerup, platform){
    this.time.addEvent({
        delay: 2000,
        callback: () => {
            powerup.disableBody(true, true);
        }
    });
}

// Powerup Resolver
function hitPowerup(player, powerup){
    powerup.disableBody(true, true);
    switch(powerup.state){
        case powerupType.STOP_TIME:
            player.setState(playerStates.STOP_TIME);
            player.setTint(0x228c22);

            let d = new Date();
            gameData.actual_game.length += d.getTime() - gameData.actual_game.date.getTime();

            d.setSeconds(d.getSeconds + 5);
            gameData.actual_game.date = d;

            this.time.addEvent({
                delay: 5000,
                callback: () => {
                    player.setState(playerStates.NORMAL);
                    player.setTint(0xffffff);
                }
            });
            break;
        case powerupType.DESTROY_BOMBS:
            let i = 0;
            bombs.children.iterate(function (child){
                i++;
                if (i > bombs.getLength() / 2){
                    child.disableBody(true, true);
                }
            });
            break;
        case powerupType.INVULNERABLE:
            player.setState(playerStates.INVULNERABLE);
            player.setTint(0x002366);
            this.time.addEvent({
                delay: 10000,
                callback: () => {
                    player.setState(playerStates.NORMAL);
                    player.setTint(0xffffff);
                }
            });
            break;
    }
}

// Toggle Pause
var toggle_pause = function(){
    pause_game(!pause);
}

// Pause
function pause_game(newPause){
    if (newPause) {
        actualScene.physics.pause();
        actualScene.anims.pauseAll();
        actualScene.time.timeScale = 0;

        let d = new Date();
        gameData.actual_game.length += d.getTime() - gameData.actual_game.date.getTime();
    } else {
        actualScene.physics.resume();
        actualScene.anims.resumeAll();
        actualScene.time.timeScale = 1;

        gameData.actual_game.date = new Date();
    }

    this.pause = newPause;
}

// Save Enviroment Data
// Player - Stars - Bomb
function save_game() {
    // Save stars status
    let stars_state = [];
    stars.children.entries.forEach(function(value, index, arr) {
        let star_state = {};
        star_state['x'] = value.x;
        star_state['y'] = value.y;
        star_state['active'] = value.active;
        star_state['bounce'] = value.body.bounce.y;
        
        stars_state[index] = star_state;
    });

    // Save Bomb status
    let bombs_state = [];
    bombs.children.entries.forEach(function(value, index, arr) {
        let bomb_state = {};
        bomb_state['x'] = value.x;
        bomb_state['y'] = value.y;
        bomb_state['velocity'] = value.body.velocity;
        
        bombs_state[index] = bomb_state;
    });

    // Save Powerups
    let powerups_state = [];
    powerups.children.entries.forEach(function(value, index, arr){
        let powerup_state = {};
        powerup_state['x'] = value.x;
        powerup_state['y'] = value.y;
        powerup_state['state'] = value.state;
        
        powerups_state[index] = powerup_state;
    });

    // Save Player
    let player_state = {
        'x': player.x,
        'y': player.y,
        'velocity': player.body.velocity,
        'state': player.state
    };

    // Save everything in a obj
    let obj = {
        'player': player_state,
        'stars': stars_state,
        'bombs': bombs_state,
        'powerups': powerups_state
    };

    gameData.actual_game.score = score;
    return JSON.stringify(obj);
}

// Load Data
var load_game = function(state){
    let status = JSON.parse(state);

    // Load Stars
    stars.children.entries.forEach(function(value, index, arr) {
        let data = status.stars[index];
        value.x = data.x;
        value.y = data.y;
        value.active = data.active;
        value.setBounceY(data.bounce);

        if (data.active)
            value.enableBody(true, data.x, data.y, true, true);
        else
            value.disableBody(true, true);
    });

    // Load Bombs
    bombs.clear(true, true);
    status.bombs.forEach(function(value, index, arr){
        var bomb = bombs.create(value.x, value.y, 'bomb');
        bomb.setBounce(1);
        bomb.setCollideWorldBounds(true);
        bomb.setVelocity(value.velocity.x, value.velocity.y);
    });

    //Load Powerups
    powerups.clear(true, true);
    status.powerups.forEach(function(value, index, arr){
        var powerup = powerups.create(value.x, value.y, 'powerup');
        power.setBounce(.1);
        power.setState(value.state);

        switch (value.state){
            case powerupType.DESTROY_BOMBS:
                power.setTint(0xffffff);
                break;
            case powerupType.INVULNERABLE:
                power.setTint(0x002366);
                break;
            case powerupType.STOP_TIME:
                power.setTint(0x228c22);
                break;
        }
    });

    // Load Player   
    player.setX(status.player.x);
    player.setY(status.player.y);
    player.setVelocity(status.player.velocity.x, status.player.velocity.y);
    player.setState(status.player.state);

    switch(status.player.state){
        case playerStates.STOP_TIME:
            player.setTint(0x228c22);

            let d = new Date();
            gameData.actual_game.length += d.getTime() - gameData.actual_game.date.getTime();

            d.setSeconds(d.getSeconds + 5);
            gameData.actual_game.date = d;

            this.time.addEvent({
                delay: 5000,
                callback: () => {
                    player.setState(playerStates.NORMAL);
                    player.setTint(0xffffff);
                }
            });
            break;
        case playerStates.INVULNERABLE:
            player.setState(playerStates.INVULNERABLE);
            player.setTint(0x002366);
            this.time.addEvent({
                delay: 10000,
                callback: () => {
                    player.setState(playerStates.NORMAL);
                    player.setTint(0xffffff);
                }
            });
            break;
    }

    score = gameData.actual_game.score;
    scoreText.setText('Score: ' + score);
}

function levelDefault(){
    // Default stars status
    let stars_state = [];
    stars.children.entries.forEach(function(value, index, arr) {
        let star_state = {};
        star_state['x'] = value.x;
        star_state['y'] = 0;
        star_state['active'] = true;
        star_state['bounce'] = Phaser.Math.FloatBetween(0.4, 0.8);
        
        stars_state[index] = star_state;
    });

    // Default bombs && powerups
    let bombs_state = [];
    let powerups_state = [];

    // Default Player
    let player_state = {
        'x': 100,
        'y': 450,
        'velocity': Phaser.Math.Vector2.ZERO,
        'state': playerStates.NORMAL
    };

    let obj = {
        'player': player_state,
        'stars': stars_state,
        'bombs': bombs_state,
        'powerups': powerups_state
    };

    return JSON.stringify(obj);
}