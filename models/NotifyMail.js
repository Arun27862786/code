const mongoose = require('mongoose');
const Schema = mongoose.Schema;
let NotifyMail = new Schema({
    //_id: { type: Object },
    email : {type :String},
    userid: {type:String},
    phone: {type:String},
    type: {type:String},
    devicetype: {type:String},
    notify:{type:Object},
    maildata:{type:Object},
    created:{type:Number}
}, {
        versionKey: false
    });
module.exports = mongoose.model('notifyandmails', NotifyMail);