// Objeto con la data del juego -y del VUE-
var gameData = {
	show: [false, false, false, false, false, false, false, false, false],
	subtitle: 'THIS IS A SUBTITLE',
	player_name: "",
	volume: 50,
	difficulty: "Medium",
	difficulties: ["Easy", "Medium", "Hard"],
	actual_game: {
		id: 0,
		index: 0,
    	username: "",
		date: new Date(),
		saved_date: new Date(),
		difficulty: "",
		score: 0,
		length: 0,
		data: ""
  	},
	saved_games: [],
	max_score: 0,
	scores: []
};

// Enum para manejar las pantallas
const screens = {
	MAIN_MENU: 0,
	PLAYER: 1,
	GAME: 2,
	SAVE_STATES: 3,
	OPTIONS: 4,
	EXIT: 5,
	THANKS: 6,
	GAME_OVER: 7,
	LEADERBOARD: 8
};
Object.freeze(screens);

// Cambiar de pantalla
var change_screen = function(screen) {
	this.show.forEach(function(value, index, array) {
		Vue.set(array, index, index === screen);
	})
	update_subtitle.apply(this, [screen]);
};

// Actualizar subtitulo en pantalla
var update_subtitle = function(screen) {
	switch (screen) {
		case screens.MAIN_MENU:
    		this.subtitle = "Main Menu";
    		break;
		case screens.PLAYER:
    		this.subtitle = "Enter your name";
    		break;
    	case screens.GAME:
      		this.subtitle = "Playing the game";
      		break;
    	case screens.SAVE_STATES:
      		this.subtitle = "Save States";
      		break;
    	case screens.OPTIONS:
      		this.subtitle = "Options";
      		break;
    	case screens.EXIT:
      		this.subtitle = "Are you sure?";
      		break;
		case screens.THANKS:
			this.subtitle = "";
			break;
		case screens.GAME_OVER:
			this.subtitle = "Game Over";
			break;
		case screens.LEADERBOARD:
			this.subtitle = "Leaderboard";
			gameData.scores.sort(function(a, b){
				return b.score - a.score;
			});
			break;
  	}
};

// Crear un archivo de partida e iniciar juego
var create_game = function() {
  	if (this.player_name === null) {
	    alert("You must enter a name");
	    return;
	  }
	  
	let id = (this.saved_games.length > 0) ? this.saved_games[this.saved_games.length - 1].id : 0;

	this.actual_game = {
		id: id + 1,
		index: this.saved_games.length,
    	username: this.player_name,
    	date: new Date(),
    	saved_date: new Date(),
		difficulty: this.difficulty,
		score: 0,
		length: 0,
		data: ""
	};
	  
	this.change_screen(screens.GAME);
	actualScene.scene.restart();
};

// Guardar Partida
// var save_game = function() {
// 	this.actual_game.date = new Date();
// };

// Borrar seleccionados
var delete_selection = function() {
	for (var i = this.saved_games.length - 1; i >= 0; i--){
		if (this.$refs.saved_components[i].selected){
			gameData.saved_games.splice(i, 1);
		}
	}
};

// Cargar Datos
var load_data = function() {
	let scoresData = localStorage.getItem("scores");
	if (scoresData) {
		gameData.scores = JSON.parse(scoresData);
		gameData.scores.sort(function(a, b){
			return b.score - a.score;
		});
		gameData.max_score = gameData.scores[0].score;
	}

	let saved_games = localStorage.getItem("games");
	if (saved_games) {
		gameData.saved_games = JSON.parse(saved_games);
	}
}

// Guardar Datos
var save_scores = function() {
	localStorage.setItem("scores", JSON.stringify(gameData.scores));
}

// Guardar Partida Actual
var save_game_data = function() {
	if (!pause){
		let d = new Date();
		gameData.actual_game.length += d.getTime() - gameData.actual_game.date.getTime();
	}
	gameData.actual_game.data = save_game();
	gameData.actual_game.saved_date = new Date();
	gameData.saved_games[gameData.actual_game.index] = gameData.actual_game;
	localStorage.setItem("games", JSON.stringify(gameData.saved_games));
}

// Cargar Partida Actual
var load_game_data = function(index) {
	if (isNaN(index)){
		index = gameData.actual_game.index
	}

	let saved = gameData.saved_games[index];
	gameData.actual_game = saved;
	gameData.actual_game.date = new Date();

	load_game(gameData.actual_game.data);
}

// Leaderboard Component
Vue.component('score-stats', {
	props: ['score', 'index'],
	template:	'<div>'+
					'<span class="label">{{ index + 1 }}.</span> <span class="text">{{ score.user }}: {{ score.score }}</span>'+
				'</div>'
});

// Partida Actual Component
Vue.component('game-stats', {
	data: function() {
		// Calcular tiempo
		let splice_index = 17;
		if (gameData.actual_game.length > 60000)
			splice_index = 14;
		else if (gameData.actual_game.length > 3600000)
			splice_index = 11;
		let len = new Date(gameData.actual_game.length).toISOString().slice(splice_index, -1);
		
		// Verificar si es un high score
		let hs = gameData.actual_game.score > gameData.max_score;
		if (hs)
			gameData.max_score = gameData.actual_game.score;

		return {
			length_string: len,
			high_score: hs
		}
	},
	props: ['game'],
	template:	'<div>'+
					'<div class="title" v-if="this.high_score">'+
						'NEW HIGHSCORE'+
					'</div>'+
					'<span class="label">Score:</span> <span class="text">{{ game.score }}</span><br>'+
					'<span class="label">Game Length:</span> <span class="text">{{ this.length_string }}</span>'+
				'</div>'
});

// Partidas Component
Vue.component('save-state', {
	data: function() {
		return {
			selected: false,
			show: false,
			confirm: false,
			title: "Game " + this.save.id,
			btn_1: "Del",
			btn_2: "+"
		}
	},
	props: [ 'save', 'index' ],
	template:	'<div>'+
					'<input type="checkbox" v-model="selected"> '+
					'<button class="button-red-auto" v-on:click="on_btn_1">{{ btn_1 }}</button> '+
					'<button class="button-auto" v-on:click="on_btn_2">{{ btn_2 }}</button> '+
					'<span class="label"> {{ title }} </span>'+
					'<button class="button" v-on:click="play">Play</button>'+
					'<ul v-show="show" class="inside-panel">'+
						'<li><span class="label">Name:</span> <span class="text">{{ save.username }}</span></li>'+
						'<li><span class="label">Difficulty:</span> <span class="text">{{ save.difficulty }}</span></li>'+
						'<li><span class="label">Date:</span> <span class="text">{{ save.saved_date.toLocaleString() }}</span></li>'+
						'<li><span class="label">Score:</span> <span class="text">{{ save.score }}</span></li>'+
					'</ul>'+
				'</div>',
	methods: {
		on_btn_1: function() {
			if (!this.confirm) {
				this.show = false;
				this.confirm = true;
				this.btn_1 = "Yes";
				this.btn_2 = "No";
				this.title = "Are you sure?";
			} else {
				gameData.saved_games.splice(this.index, 1);
			}
		},
		on_btn_2: function() {
			if (!this.confirm) {
				this.btn_2 = (this.show) ? "+" : "-";
				this.show = !this.show;
			} else {
				this.confirm = false;
				this.title = "Game " + this.save.id;
				this.btn_1 = "Del";
				this.btn_2 = "+";
			}
		},
		play: function() {
			app.change_screen(screens.GAME);
			load_game_data(this.save.index);
		}
	}
});

// VUE central
var app = new Vue({
	el: '#Game',
  	data: gameData,
  	methods: {
	    change_screen: change_screen,
	    create_game: create_game,
		delete_selection: delete_selection,
		pause_game: toggle_pause,
		save_game: save_game_data,
		load_game: load_game_data
  	}
});

app.change_screen(screens.MAIN_MENU);
this.load_data();