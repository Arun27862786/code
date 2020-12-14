const mongoose = require('mongoose');
const Schema = mongoose.Schema;
let seriesscore = new Schema({
    pid: { type: String },
    seriesid : {type :String},
    matchid: {type:String},
    mongosavestatus : {type :Number},
    filesavestatus : {type :Number},
    domesticstatus: {type :Number},
    pointstatus: {type :Number},
    pointteamstatus: {type :Number},
}, {
        versionKey: false
    });
module.exports = mongoose.model('seriesscore', seriesscore);