const mongoose = require('mongoose');
const Schema = mongoose.Schema;
let playerpoints = new Schema({
    pid: { type: String },
    seriesid : {type :String},
    gameid: {type:Number},
    matchtype: {type:String},
    totalpoints: {type:Number},
    matchId: {type:String},
    pid: {type:String},
    run:{type:Number},
    four:{type:Number},
    six:{type:Number},
    wicket:{type:Number},
    mdnover:{type:Number},
    catch:{type:Number},
    stumped:{type:Number},
    playername: {type:String},
    runout:{type:Number},
    fiftyBonus:{type:Number},
    hundredBonus:{type:Number},
    fourwhb:{type:Number},
    fivewhb:{type:Number},
    duck:{type:Number},
    playeingPoints:{type:Number},
    srone:{type:Number},
    srtwo:{type:Number},
    srthree:{type:Number},
    erone:{type:Number},
    ertwo:{type:Number},
    erthree:{type:Number},
    erfour:{type:Number},
    erfive:{type:Number},
    ersix:{type:Number},
    selectedplayer:{type:Number},
    totalplayer:{type:Number},
    selectplyrper:{type:Number},
    team1 : {type :String},
    team2 : {type :String},
    
}, {
        versionKey: false
    });
module.exports = mongoose.model('playerpoints', playerpoints);