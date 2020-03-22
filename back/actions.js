const rs = require('randomstring')

const Loki = require('lokijs')
const db = new Loki()

const games = db.addCollection('games', { unique: 'id' })

const Game = require('./game')

let connections = []

let find_position_connections = function (ws, game_id) {
    return connections[game_id].findIndex(el => el === ws)
}

let get_game_from_data = function (data) {
    if (data === undefined || data.game_id === undefined) {
        throw 'missing_game_id'
    }
    let res = games.findOne({ id: data.game_id })
    if (res === null) {
        throw 'wrong_game_id'
    }
    return new Game(res)
}

let broadcast = function (game_id, text) {
    connections[game_id].forEach(element => {
        element.send(text)
    });
}

let broadcast_game = function (game) {
    let to_send = { type: "game", game: game.cleaned }
    broadcast(game.id, JSON.stringify(to_send))
}

exports.create = function (current_ws, data) {

    if (data === undefined || data.name === undefined || data.name === '') {
        throw 'missing_name'
    }

    // let id = rs.generate(7)
    let id = "test"

    let doc = new Game()
    doc.add_name(data.name)
    doc.id = id

    games.insert(doc)
    connections[id] = [current_ws]
    broadcast_game(doc)

}

exports.connect = function (current_ws, data) {

    if (data === undefined || data.name === undefined || data.name === '') {
        throw 'missing_name'
    }

    let game = get_game_from_data(data)

    if (game.game_phase !== 0) {
        throw 'game_started'
    }

    if (find_position_connections(current_ws, game.id) !== -1) {
        throw 'already_connected'
    }

    if (game.add_name(data.name) === undefined) {
        throw 'name_taken'
    }
    connections[game.id].push(current_ws)

    games.update(game)
    broadcast_game(game)

}

exports.register_cat = function (current_ws, data) {

    if (data === undefined || data.cat === undefined || data.cat === '') {
        throw 'missing_cat'
    }

    let game = get_game_from_data(data)

    if (game.game_phase !== 0) {
        throw 'game_started'
    }

    let connection_pos = find_position_connections(current_ws, game.id)
    if (connection_pos !== 0) {
        throw 'not_game_master'
    }

    if (game.add_cat(data.cat) === undefined) {
        throw 'cat_taken'
    }

    games.update(game)
    broadcast_game(game)

}

exports.start_game = function (current_ws, data) {
    let game = get_game_from_data(data)

    if (game.game_phase !== 0) {
        throw 'game_started'
    }

    let connection_pos = find_position_connections(current_ws, game.id)
    if (connection_pos !== 0) {
        throw 'not_game_master'
    }

    if (game.names.length === 0 || game.cats.length === 0) {
        throw 'empty_game'
    }

    module.exports.new_round(current_ws, data)

}

exports.new_round = function (current_ws, data) {
    let game = get_game_from_data(data)

    if (game.game_phase !== 0 && game.game_phase !== 3) {
        throw 'cant_start_new_round'
    }

    let connection_pos = find_position_connections(current_ws, game.id)
    if (connection_pos !== 0) {
        throw 'not_game_master'
    }

    let letter = rs.generate({ length: 1, charset: 'alphabetic', capitalization: 'uppercase' })

    game.game_phase = 1;
    game.current_letter = letter
    games.update(game)
    broadcast_game(game)

}

exports.first = function (current_ws, data) {

    let game = get_game_from_data(data)

    if (game.game_phase !== 1) {
        throw 'wrong_game_phase'
    }

    game.game_phase = 2
    game.current_round = []
    for (let i = 0; i < game.names.length; ++i) {
        game.current_round.push(undefined)
    }
    games.update(game)

    broadcast_game(game)
}

exports.gather = function (current_ws, data) {
    let game = get_game_from_data(data)

    if (game.game_phase !== 2) {
        throw 'wrong_game_phase'
    }

    let connection_pos = find_position_connections(current_ws, game.id)
    if (game.current_round[connection_pos] !== undefined) {
        throw 'user_current_round_already_saved'
    }

    if (!data || !data.answers || !Array.isArray(data.answers) || data.answers.length !== game.cats.length) {
        throw 'invalid_answers'
    }

    game.current_round[connection_pos] = []
    data.answers.forEach(element => {
        game.current_round[connection_pos].push({ valid: false, value: element })
    })

    let gather_over = true

    for (let i = 0; i < game.names.length; ++i) {
        if (game.current_round[i] === undefined) {
            gather_over = false
        }
    }

    if (gather_over) {
        game.game_phase = 3
    }

    games.update(game)

    if (gather_over) {
        broadcast_game(game)
    }

}
