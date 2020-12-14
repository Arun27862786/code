"use strict";
require('dotenv').config()
const axios = require("axios");
const ApibaseUrl = require('./db');
const fs = require("fs");
const cron = require('node-cron');
const mysql_pool = require('./db');
const MatchProcess = require('./models/processmatches');
const CompleteMatch = require('./completematch.js');

/*let getMatchPlayers = (matchid, connection) => {
    return new Promise(function (resolve, reject) {
        let sql = "SELECT pid,playertype FROM matchmeta where matchid='" + matchid + "'";
        connection.query(sql, function (error, results, fields) {
            if (error) {
                console.log("connection down at", error);
            } else if (results) {
                resolve(results);
            }
        });
    })
} */

var saveNewmatches = async (req, res) => {
    (mysql_pool.mysql_pool).getConnection(async function (err, connection) {
        try {
            if (err) {
                console.log(' Error getting mysql_pool connection: ' + err);
            } else {
                MatchProcess.find({ "plyrfntyptstatus": 0,"gameid":3}, async function (errormatchidarr, resultMP, fieldsmatchidarr) {
                    if (resultMP.length > 0) {

                        resultMP.forEach((itemMP,indexMP) => {
                            let matchid = itemMP.matchid;
                            //console.log("itemMP==============--->>",itemMP)
                            if(itemMP.mongosavestatus===1)
                            {
                                MatchProcess.updateOne({"matchid":matchid},{"$set":{"plyrfntyptstatus":1}},function(eeee,rrr){
                                });
                            }

                            CompleteMatch.findOne({ "matchid": matchid }, async function (errormatchidarr, resultMP, fieldsmatchidarr) {
                                if (resultMP) {
                                    let itemCompMatch = resultMP;

                                    let matchid = itemCompMatch.matchid;
                                    //let matchPlayers = await getMatchPlayers(matchid, connection);
                                    //console.log("matchid ===>", matchid);
                                    try {
                                        //console.log("itemCompMatch.type------->>>",itemCompMatch.type);
                                        
                                        let arrayAllTeamIds = itemCompMatch.match.players; //Contents.playerscore;
                                        let arrayplaying11a = itemCompMatch.match.teams.a.match.starters;
                                        let arrayplaying11b = itemCompMatch.match.teams.b.match.starters;
                                       

                                      
                                        
                                        let arrayplaying11all=arrayplaying11a.concat(arrayplaying11b);
                                        

                                        let smatchType =ApibaseUrl.matchType[itemCompMatch.type]; //Contents.type;

                                        
                                        //console.log(ApibaseUrl.ApibaseUrl.baseUrl, ", matchType  === >", smatchType);

                                        //return;
                                        
                                        let api_url = (ApibaseUrl.ApibaseUrl.baseUrl) + "/getglobalpoints";
                                        //console.log("api_url------------------>>>",api_url);
                                        //return;
                                        
                                        var response = await axios.post(api_url, {
                                            gametype: 'kabaddi'
                                        });
                                        if (response) {
                                            //console.log("response----->>>>>>>",response.data.data);

                                            // let fantasypoints = response.data.data.cricket[matchType];
                                            let fantasypoints = response.data.data.kabaddi[smatchType];
                                            //console.log(smatchType,"=response.data.data.kabaddi[matchType] ===>", JSON.stringify(response.data.data.kabaddi[smatchType]));
                                            let fPoint = await calculatePointEarn(arrayplaying11all,arrayAllTeamIds, fantasypoints, connection, matchid, smatchType);
                                            //////////////Condition Required//// plyrfntyptstatus=1/////////////////////

                                            if (fPoint) {
                                                //console.log("points update successfully");
                                            }
                                        }

                                    } catch (e) {
                                        console.log("error -----", e);
                                    }

                                   

                                } else {
                                    console.log("not any active match id="+matchid);

                                }
                            })

                           
                        })

                    }
                })
            }
            connection.release();
            console.log("connection relese successfully");
        } catch (e) {
            console.log("error ==>>>>>>", e);

        }
    })
}



let calculatePointEarn = (arrayplaying11all,arrayAllTeamIds, fantasypoints, connection, matchid, matchType) => {
    return new Promise(function (resolve, reject) {
//console.log("0000000000000------>>>",arrayplaying11all,arrayAllTeamIds, fantasypoints, connection, matchid, matchType, matchPlayers);

        let pointList = {};
        //Object.values(arrayAllTeamIds).map(async function (itemPerPlayer, indexResult) {
            arrayplaying11all.map(async function (itemPlayerID, indexResult) {

            try {

                let itemPerPlayer=arrayAllTeamIds[itemPlayerID];
                let totalpoints = parseFloat(fantasypoints.playing);
                let playerid=itemPlayerID;//Object.keys(arrayAllTeamIds)[indexResult];
                console.log("playerid---------------->>",playerid);
                let touch = 0;
                let raidbonus = 0;
                let successtackle = 0;
                let unsuccessraid = 0;
                let supertackle = 0;
                let pushallout = 0;
                let getallout = 0;
                
                let name = '';
                let greencard = 0;
                let yellowcard = 0;
                let redcard = 0;
                let makesubstitute = 0;
                
                let totalrun = 0;
                let MYobj = {};

                //console.log('itemPerPlayer',itemPerPlayer); 
                
                //////////////////////
                let itemMatchData = (itemPerPlayer.match) ? itemPerPlayer.match : {};
                                
                name = itemPerPlayer["name"];
                
                greencard = greencard + parseFloat((itemMatchData.green_card) ? parseFloat(fantasypoints.greencard) : 0);
                yellowcard = yellowcard + parseFloat((itemMatchData.yellow_card) ? parseFloat(fantasypoints.yellowcard) : 0);
                redcard = redcard + parseFloat((itemMatchData.red_card) ? parseFloat(fantasypoints.redcard) : 0);            
                touch = touch + parseFloat((itemMatchData.points.raid_points.touch) ? (parseFloat(itemMatchData.points.raid_points.touch) * parseFloat(fantasypoints.touch)) : 0);
                raidbonus = raidbonus + parseFloat((itemMatchData.points.raid_points.bonus) ? (parseFloat(itemMatchData.points.raid_points.bonus) * parseFloat(fantasypoints.raidbonus)) : 0);
                unsuccessraid = unsuccessraid + parseFloat((itemMatchData.raids.unsuccess) ? (parseFloat(itemMatchData.raids.unsuccess) * parseFloat(fantasypoints.unsuccessraid)) : 0);
                successtackle = successtackle + parseFloat((itemMatchData.tackles.success) ? (parseFloat(itemMatchData.tackles.success) * parseFloat(fantasypoints.successtackle)) : 0);
                supertackle = supertackle + parseFloat((itemMatchData.tackles.super_tackles) ? (parseFloat(itemMatchData.tackles.super_tackles) * parseFloat(fantasypoints.supertackle)) : 0);
                
                totalpoints = totalpoints + parseFloat(greencard+yellowcard+redcard+touch+raidbonus+unsuccessraid+successtackle+supertackle);
                
                pointList[playerid] = totalpoints;

                let updatedata = await pointsRecord(totalpoints, playerid, matchid, connection)
                if (updatedata) {
                    //console.log("there are the total point ", updatedata)
                }
            } catch (e) {
                console.log("there are the error", e)
            }

        })

        resolve(pointList);
    })
}

var pointsRecord = (totalPoints, playerId, matchId, connection) => {
    return new Promise(function (resolve, reject) {
        let query1 = 'select * from matchplrptstotal where matchid = "' + matchId + '" and pid  = "' + playerId + '"';

        connection.query(query1, function (error, results, fields) {
            if (error) {
                //console.log(new Date())
                console.log("connection down at", error);
            } else if (results.length > 0) {

                let updatequery = 'update matchplrptstotal  SET  total = "' + totalPoints + '" where pid = "' + playerId + '" AND matchid = "' + matchId + '"';
                //console.log("threre are the update query", updatequery);

                connection.query(updatequery, function (error, results, fields) {
                    if (error) {
                        console.log(new Date())
                        console.log("connection down at", error);
                    } else {
                        console.log("data update successfully -----");
                    }
                })
            } else {
                let insertquery = 'insert into matchplrptstotal(matchid,pid,total)values("' + matchId + '","' + playerId + '","' + totalPoints + '")';
                console.log("insertquery");
                connection.query(insertquery, function (error, results, fields) {
                    if (error) {
                        console.log(new Date())
                        console.log("connection down at", error);
                    } else {
                        console.log("data insert sucessfully");
                    }
                })
            }
        })
    })
}


// cron.schedule('*/1 * * * *', () => {
//   saveNewmatches();
// });

