const mongoose = require('mongoose');
const Schema = mongoose.Schema;
let processmatches = new Schema({
    matchid: { type: String },
    team1: { type: String },
    team2: { type: String },
    mstatus : {type :String},
    mdate: {type:Date},
    mongosavestatus : {type :Number},
    filesavestatus : {type :Number},
    domesticstatus: {type :Number},
    pointstatus: {type :Number},
    pointteamstatus: {type :Number},
    ppointstatus: {type :Number},
    seriesid: {type :String},
    gameid: {type :Number},
    plyrfntyptstatus:{type :Number},
    // completedate:{type:Date},
    // completestatus:{type :Number},
    // reviewdate:{type:Date}
}, {
        versionKey: false
    });
module.exports = mongoose.model('processmatches', processmatches);