const mongoose = require('mongoose');
const Schema = mongoose.Schema;
let matchscore = new Schema({
    matchid: { type: String },
    type : {type :String},
    "man-of-the-match": {type :Object},
    "toss_winner_team": {type :String},
    "winner_team": {type :String},
    "matchStarted":Boolean,
    //"team1name": {type :String},
    //"team1logo": {type :String},
    //"team2name": {type :String},
    //"team2logo": {type :String},
    details: {}
}, {
        versionKey: false
    });
module.exports = mongoose.model('matchscore', matchscore);
